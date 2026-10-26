// SAPL (Interlegis): a mesma API aberta em Assembleias e câmaras (sapl.<cidade>.<uf>.leg.br/api/).
// Cuidado: os votos do SAPL trazem `ip` e `user` de quem lançou. Nunca guardar esses campos.
import { normalizar, slug, statusMedido } from '../../shared/logica'
import { SemOrcamento, agendar, agendarJa, agora, buscar, daqui, https, lote } from '../util'
import { naUf, type Contexto } from './contexto'

interface Pagina<T = any> { pagination: { total_entries: number; next_page: number | null }; results: T[] }
interface CasaLinha { id: string; tipo: string; nome: string; uf: string | null; ibge: string | null; sapl: string | null; origem: string; saude: string | null; procurada_em: string | null }

const pagina = (ctx: Contexto, base: string, caminho: string, extra = '') =>
  buscar(ctx.orc, `${base}/api/${caminho}${caminho.includes('?') ? '&' : '?'}page_size=100${extra}`) as Promise<Pagina>
async function todas(ctx: Contexto, base: string, caminho: string, max: number) {
  const itens: any[] = []
  let total = 0
  for (let p = 1; p <= max; p++) {
    const j = await pagina(ctx, base, caminho, `&page=${p}`)
    itens.push(...j.results)
    total = j.pagination.total_entries
    if (!j.pagination.next_page) return { itens, total, completo: true }
  }
  return { itens, total, completo: false }
}
const total = async (ctx: Contexto, base: string, caminho: string) =>
  (await buscar(ctx.orc, `${base}/api/${caminho}${caminho.includes('?') ? '&' : '?'}page_size=1`) as Pagina).pagination.total_entries

async function legislaturaAtual(ctx: Contexto, base: string) {
  const { itens } = await todas(ctx, base, 'parlamentares/legislatura/', 2)
  const h = new Date().toISOString().slice(0, 10)
  const l = itens.find((x) => x.data_inicio <= h && (!x.data_fim || x.data_fim >= h)) ?? itens.sort((a, b) => (a.data_inicio < b.data_inicio ? 1 : -1))[0]
  if (!l) throw new Error('o SAPL não tem legislatura cadastrada')
  return { id: l.id as number, numero: l.numero as number, inicio: l.data_inicio as string, fim: l.data_fim as string | null }
}

/** Data do último voto lançado (o último registro, pela ordem de id). */
async function ultimoVoto(ctx: Contexto, base: string, n: number): Promise<string | null> {
  if (!n) return null
  const j = await buscar(ctx.orc, `${base}/api/sessao/votoparlamentar/?page_size=1&page=${n}`) as Pagina
  return (j.results[0]?.data_hora || '').slice(0, 10) || null
}

const casaDe = (ctx: Contexto, id: string) => ctx.db.prepare('SELECT * FROM casas WHERE id = ?').bind(id).first<CasaLinha>()

/** Todo dia: agenda as casas com SAPL do levantamento e as do interior que alguém abriu no último mês. */
export async function casas(ctx: Contexto): Promise<number> {
  const r = await ctx.db.prepare(`SELECT id, uf FROM casas WHERE sapl IS NOT NULL AND (origem = 'levantamento' OR procurada_em >= ?)`).bind(daqui(-30)).all<{ id: string; uf: string }>()
  await agendar(ctx.db, r.results.filter((c) => naUf(ctx, c.uf)).map((c) => `sapl:casa:${c.id}`), 4)
  return 1
}

/** Uma casa: legislatura, sessões ordinárias, quem tem mandato, partidos e a saúde dos dados. */
export async function casa(ctx: Contexto, id: string): Promise<number> {
  const c = await casaDe(ctx, id)
  if (!c?.sapl) return 0
  const base = c.sapl
  const leg = await legislaturaAtual(ctx, base)
  const tipos = (await todas(ctx, base, 'sessao/tiposessaoplenaria/', 1)).itens
  const ordinaria = tipos.find((t) => /(^|\s)ordin/i.test(t.nome)) // não confundir com "Extraordinária"
  const sessoes = await todas(ctx, base, `sessao/sessaoplenaria/?legislatura=${leg.id}${ordinaria ? `&tipo=${ordinaria.id}` : ''}`, 8)
  const mandatos = await todas(ctx, base, `parlamentares/mandato/?legislatura=${leg.id}`, 4)
  const parls = await todas(ctx, base, 'parlamentares/parlamentar/', 12)
  const partidos = Object.fromEntries((await todas(ctx, base, 'parlamentares/partido/', 3)).itens.map((p) => [p.id, p.sigla]))
  const tiposMateria = Object.fromEntries((await todas(ctx, base, 'materia/tipomaterialegislativa/', 2)).itens.map((t) => [t.id, t.descricao || t.sigla]))
  const [votos, presencas, materias] = await Promise.all([
    total(ctx, base, 'sessao/votoparlamentar/'), total(ctx, base, 'sessao/sessaoplenariapresenca/'), total(ctx, base, 'materia/materialegislativa/'),
  ])
  const ultimo = await ultimoVoto(ctx, base, votos)

  const t = agora()
  const db = ctx.db
  const cargo = c.tipo === 'assembleia' ? 'depest' : 'vereador'
  const porId = new Map(parls.itens.map((p) => [p.id, p]))
  const escolhidos = new Map<number, { p: any; m: any }>()
  for (const m of mandatos.itens) {
    const p = porId.get(m.parlamentar)
    if (!p) continue
    const antes = escolhidos.get(p.id)
    if (!antes || (m.titular && !antes.m.titular)) escolhidos.set(p.id, { p, m })
  }
  const cmd: D1PreparedStatement[] = sessoes.itens.map((s) =>
    db.prepare('INSERT OR REPLACE INTO sessoes (id, casa_id, data, tipo) VALUES (?, ?, ?, ?)').bind(`${id}:s:${s.id}`, id, s.data_inicio, 'ordinaria'))
  for (const { p, m } of escolhidos.values()) {
    const nome = p.nome_parlamentar || p.nome_completo
    cmd.push(db.prepare(`INSERT INTO politicos (id, casa_id, cargo, nome, busca, uf, foto, pagina, situacao, desde, ativo, atualizado_em)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        ON CONFLICT(id) DO UPDATE SET nome = excluded.nome, busca = excluded.busca, foto = excluded.foto, pagina = excluded.pagina,
          situacao = excluded.situacao, desde = excluded.desde, ativo = 1, atualizado_em = excluded.atualizado_em`)
      .bind(`${id}:${p.id}`, id, cargo, nome, normalizar(nome), c.uf, https(p.fotografia) || null, `${base}/parlamentar/${p.id}`,
        m.titular ? 'titular' : 'suplente', m.data_inicio_mandato || leg.inicio, t))
  }
  cmd.push(db.prepare('UPDATE politicos SET ativo = 0 WHERE casa_id = ? AND atualizado_em < ?').bind(id, t))
  const ultimaSessao = sessoes.itens.map((s) => s.data_inicio).sort().pop() ?? null
  const saude = { legislatura: leg, sessoes: sessoes.total, ultimaSessao, totais: { votos, presencas, materias }, ultimoVoto: ultimo, partidos, tiposMateria, medido_em: t }
  const st = statusMedido({ votos, presencas, materias, sessoesLeg: sessoes.total, ultimoVoto: ultimo, inicioLeg: leg.inicio })
  // No levantamento manual, o status fica o do levantamento; a API mede pelos parlamentares.
  cmd.push(c.origem === 'levantamento'
    ? db.prepare("UPDATE casas SET saude = json_patch(coalesce(saude, '{}'), ?), coletada_em = ? WHERE id = ?").bind(JSON.stringify(saude), t, id)
    : db.prepare(`UPDATE casas SET saude = json_patch(coalesce(saude, '{}'), ?), coletada_em = ?, votos = ?, presenca = ?, projetos = ?, origem = 'medido', verificado_em = ? WHERE id = ?`)
      .bind(JSON.stringify(saude), t, st.votos, st.presenca, st.projetos, t.slice(0, 10), id))
  await lote(db, cmd)
  const prioridade = c.procurada_em && c.procurada_em >= daqui(-1) ? 2 : 5
  await agendar(db, [...escolhidos.keys()].map((pid) => `sapl:parl:${id}:${pid}`), prioridade)
  return 3
}

/** Um parlamentar: partido, presença nas sessões ordinárias, votos e matérias desta legislatura. */
export async function parlamentar(ctx: Contexto, politicoId: string): Promise<number> {
  const i = politicoId.lastIndexOf(':')
  const casaId = politicoId.slice(0, i), sid = politicoId.slice(i + 1)
  const c = await casaDe(ctx, casaId)
  const pol = await ctx.db.prepare('SELECT nome, desde FROM politicos WHERE id = ?').bind(politicoId).first<{ nome: string; desde: string | null }>()
  if (!c?.sapl || !c.saude || !pol) return 0
  const base = c.sapl
  const saude = JSON.parse(c.saude)
  const leg = saude.legislatura as { inicio: string }
  const desde = pol.desde && pol.desde > leg.inicio ? pol.desde : leg.inicio

  const filiacoes = (await todas(ctx, base, `parlamentares/filiacao/?parlamentar=${sid}`, 1)).itens
  const atual = filiacoes.filter((f) => !f.data_desfiliacao).sort((a, b) => (a.data < b.data ? 1 : -1))[0]
  const partido = atual ? saude.partidos?.[atual.partido] ?? null : null

  const sessoes = await ctx.db.prepare('SELECT id FROM sessoes WHERE casa_id = ? AND data >= ?').bind(casaId, desde).all<{ id: string }>()
  const daLeg = new Set(sessoes.results.map((s) => s.id))
  const pres = await todas(ctx, base, `sessao/sessaoplenariapresenca/?parlamentar=${sid}`, 15)
  const esteve = [...new Set(pres.itens.map((x) => `${casaId}:s:${x.sessao_plenaria}`).filter((s) => daLeg.has(s)))]
  const presenca = { presente: esteve.length, total: daLeg.size, desde, completo: pres.completo }
  // Guarda presença por sessão: a API só conta as sessões em que a casa registrou alguma lista.
  await lote(ctx.db, esteve.map((s) => ctx.db.prepare('INSERT OR IGNORE INTO presencas (sessao_id, politico_id) VALUES (?, ?)').bind(s, politicoId)))

  const vs = await todas(ctx, base, `sessao/votoparlamentar/?parlamentar=${sid}`, 10)
  const porVoto = new Map<string, number>()
  let ultimo = ''
  for (const v of vs.itens) { // só voto e data: ip e user ficam de fora
    const d = (v.data_hora || '').slice(0, 10)
    if (d && d < leg.inicio) continue
    porVoto.set(v.voto, (porVoto.get(v.voto) || 0) + 1)
    if (d > ultimo) ultimo = d
  }
  const votos = { total: [...porVoto.values()].reduce((s, n) => s + n, 0), porVoto: [...porVoto.entries()].sort((a, b) => b[1] - a[1]), ultimo: ultimo || null, historico: vs.total, completo: vs.completo }

  let projetos: object | null = null
  const autores = (await pagina(ctx, base, `base/autor/?object_id=${sid}`)).results
    .filter((a) => a.object_id === Number(sid) && (a.autor_related?.value === Number(sid) || normalizar(a.nome || '') === normalizar(pol.nome)))
  if (autores.length) {
    const autor = autores[0].id
    const anoIni = Number(desde.slice(0, 4)), anoAtual = new Date().getUTCFullYear()
    const anos = Array.from({ length: anoAtual - anoIni + 1 }, (_, k) => anoIni + k)
    const porAno = await Promise.all(anos.map((a) => pagina(ctx, base, `materia/materialegislativa/?autores=${autor}&ano=${a}`)))
    const porTipo = new Map<string, number>()
    for (const m of porAno.flatMap((j) => j.results)) { const t = saude.tiposMateria?.[m.tipo] ?? 'Outras'; porTipo.set(t, (porTipo.get(t) || 0) + 1) }
    const qtd = porAno.reduce((s, j) => s + j.pagination.total_entries, 0)
    const amostra = porAno.reduce((s, j) => s + j.results.length, 0)
    projetos = { total: qtd, porTipo: [...porTipo.entries()].sort((a, b) => b[1] - a[1]), desde: `${anoIni}-01-01`,
      nota: amostra < qtd ? `Os tipos foram contados nas ${amostra} primeiras matérias de cada ano.` : 'Matérias em que aparece como autor.' }
  }
  await ctx.db.prepare(`UPDATE politicos SET partido = coalesce(?, partido),
      resumo = json_set(coalesce(resumo, '{}'), '$.presenca', json(?), '$.votos', json(?), '$.projetos', json(?)), resumo_em = ? WHERE id = ?`)
    .bind(partido, JSON.stringify(presenca), JSON.stringify(votos), JSON.stringify(projetos), agora(), politicoId).run()
  return 7
}

/** Mede uma câmara achada no diretório do Interlegis: está no ar? tem votos, presença, matérias? */
export async function medir(ctx: Contexto, id: string): Promise<number> {
  const c = await casaDe(ctx, id)
  if (!c?.sapl) return 0
  const base = c.sapl
  const t = agora()
  try {
    const leg = await legislaturaAtual(ctx, base)
    const [votos, presencas, materias, sessoesLeg] = await Promise.all([
      total(ctx, base, 'sessao/votoparlamentar/'), total(ctx, base, 'sessao/sessaoplenariapresenca/'),
      total(ctx, base, 'materia/materialegislativa/'), total(ctx, base, `sessao/sessaoplenaria/?legislatura=${leg.id}`),
    ])
    const ultimo = await ultimoVoto(ctx, base, votos)
    const st = statusMedido({ votos, presencas, materias, sessoesLeg, ultimoVoto: ultimo, inicioLeg: leg.inicio })
    await ctx.db.prepare(`UPDATE casas SET votos = ?, presenca = ?, projetos = ?, acesso = 'SAPL (API aberta)', origem = 'medido', verificado_em = ?,
        saude = json_set(coalesce(saude, '{}'), '$.medicao', json(?)) WHERE id = ? AND origem != 'levantamento'`)
      .bind(st.votos, st.presenca, st.projetos, t.slice(0, 10), JSON.stringify({ ok: true, votos, presencas, materias, sessoesLeg, ultimoVoto: ultimo, em: t }), id).run()
  } catch (e) {
    if (e instanceof SemOrcamento) throw e
    await ctx.db.prepare(`UPDATE casas SET votos = 'naosei', presenca = 'naosei', projetos = 'naosei', acesso = 'SAPL fora do ar', verificado_em = ?,
        saude = json_set(coalesce(saude, '{}'), '$.medicao', json(?)) WHERE id = ? AND origem != 'levantamento'`)
      .bind(t.slice(0, 10), JSON.stringify({ ok: false, erro: e instanceof Error ? e.message : String(e), em: t }), id).run()
  }
  return 30
}

/** Câmara que não está no diretório: tenta o endereço de costume, sapl.<cidade>.<uf>.leg.br. */
export async function adivinhar(ctx: Contexto, ibge: string): Promise<number> {
  const m = await ctx.db.prepare('SELECT nome, uf FROM municipios WHERE ibge = ?').bind(ibge).first<{ nome: string; uf: string }>()
  if (!m) return 0
  const base = `https://sapl.${slug(m.nome)}.${m.uf.toLowerCase()}.leg.br`
  const t = agora()
  let achou = false
  try { await legislaturaAtual(ctx, base); achou = true } catch (e) { if (e instanceof SemOrcamento) throw e }
  await ctx.db.prepare(`INSERT INTO casas (id, tipo, nome, uf, ibge, acesso, sapl, url, votos, presenca, projetos, origem, verificado_em, procurada_em)
      VALUES (?, 'camara', ?, ?, ?, ?, ?, ?, 'naosei', 'naosei', 'naosei', 'medido', ?, ?)
      ON CONFLICT(id) DO UPDATE SET sapl = excluded.sapl, acesso = excluded.acesso, url = excluded.url, verificado_em = excluded.verificado_em
      WHERE casas.origem != 'levantamento'`)
    .bind(`cm:${ibge}`, `Câmara Municipal de ${m.nome}`, m.uf, ibge, achou ? 'SAPL (API aberta)' : 'nenhum SAPL encontrado',
      achou ? base : null, achou ? `${base}/` : null, t.slice(0, 10), t).run()
  if (achou) { await agendarJa(ctx.db, `sapl:medir:cm:${ibge}`, 1); await agendarJa(ctx.db, `sapl:casa:cm:${ibge}`, 1) }
  return 0
}
