// Câmara dos Deputados (dadosabertos.camara.leg.br/api/v2): deputados, projetos, cota,
// votações nominais do Plenário e presença nas sessões deliberativas.
import { TIPOS_CAMARA, janelas, normalizar, somarGastos, maisRecente } from '../../shared/logica'
import { SemOrcamento, agendar, agora, buscar, existentes, hoje, lote } from '../util'
import { naUf, type Contexto } from './contexto'

const API = 'https://dadosabertos.camara.leg.br/api/v2'
const PLENARIO = 180

/** Lista dos deputados em exercício + a legislatura atual. Agenda a ficha de cada um. */
export async function deputados(ctx: Contexto): Promise<number> {
  const leg = (await buscar(ctx.orc, `${API}/legislaturas?data=${hoje()}`)).dados?.[0]
  const todos: any[] = []
  for (let pg = 1; pg <= 10; pg++) {
    const j = await buscar(ctx.orc, `${API}/deputados?itens=100&pagina=${pg}&ordem=ASC&ordenarPor=nome`)
    todos.push(...j.dados)
    if (j.dados.length < 100) break
  }
  // Lista pela metade (API instável) não pode desativar ninguém.
  if (todos.length < 400) throw new Error(`a Câmara devolveu só ${todos.length} deputados`)
  const t = agora()
  const db = ctx.db
  const cmd = todos.map((d) => db.prepare(`INSERT INTO politicos (id, casa_id, cargo, nome, busca, partido, uf, foto, pagina, ativo, atualizado_em)
      VALUES (?, 'camara', 'depfed', ?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(id) DO UPDATE SET nome = excluded.nome, busca = excluded.busca, partido = excluded.partido, uf = excluded.uf,
        foto = excluded.foto, pagina = excluded.pagina, ativo = 1, atualizado_em = excluded.atualizado_em`)
    .bind(`camara:${d.id}`, d.nome, normalizar(d.nome), d.siglaPartido, d.siglaUf, d.urlFoto, `https://www.camara.leg.br/deputados/${d.id}`, t))
  cmd.push(db.prepare(`UPDATE politicos SET ativo = 0 WHERE casa_id = 'camara' AND atualizado_em < ?`).bind(t))
  if (leg) cmd.push(db.prepare(`UPDATE casas SET saude = json_set(coalesce(saude, '{}'), '$.legislatura', json(?)), coletada_em = ? WHERE id = 'camara'`)
    .bind(JSON.stringify({ id: leg.id, inicio: leg.dataInicio, fim: leg.dataFim }), t))
  await lote(db, cmd)
  await agendar(db, todos.filter((d) => naUf(ctx, d.siglaUf)).map((d) => `camara:dep:${d.id}`), 5)
  return 1
}

async function legislatura(ctx: Contexto): Promise<{ id: number; inicio: string }> {
  const s = await ctx.db.prepare(`SELECT json_extract(saude, '$.legislatura') AS l FROM casas WHERE id = 'camara'`).first<{ l: string | null }>()
  const l = s?.l ? JSON.parse(s.l) : null
  return l ? { id: l.id, inicio: l.inicio } : { id: 57, inicio: '2023-02-01' }
}

/** Ficha de um deputado: início do mandato, projetos por tipo e a cota do ano. */
export async function deputado(ctx: Contexto, id: string): Promise<number> {
  const leg = await legislatura(ctx)
  const d = (await buscar(ctx.orc, `${API}/deputados/${id}`)).dados
  const st = d.ultimoStatus ?? {}
  const desde = maisRecente(leg.inicio, (st.data || '').slice(0, 10))
  const contas = await Promise.all(TIPOS_CAMARA.map(([sigla]) =>
    buscar(ctx.orc, `${API}/proposicoes?idDeputadoAutor=${id}&siglaTipo=${sigla}&dataApresentacaoInicio=${desde}&itens=1`, { comTotal: true })
      .then((r: { json: any; total: number }) => (Number.isFinite(r.total) ? r.total : r.json.dados.length))))
  const porTipo = TIPOS_CAMARA.map(([, nome], i) => [nome, contas[i]] as [string, number])
  const projetos = { total: contas.reduce((s, n) => s + n, 0), porTipo, desde, nota: 'Contando os de coautoria.' }

  const ano = new Date().getUTCFullYear()
  const notas: { categoria: string; valor: number }[] = []
  for (let pg = 1; pg <= 12; pg++) {
    const j = await buscar(ctx.orc, `${API}/deputados/${id}/despesas?idLegislatura=${leg.id}&ano=${ano}&itens=100&pagina=${pg}`)
    for (const x of j.dados) notas.push({ categoria: x.tipoDespesa, valor: Number(x.valorLiquido) || 0 })
    if (j.dados.length < 100) break
  }
  const gastos = somarGastos(ano, notas)
  const situacao = /suplente/i.test(st.condicaoEleitoral || '') ? 'suplente' : 'titular'
  await ctx.db.prepare(`UPDATE politicos SET situacao = ?, desde = ?, nome = coalesce(?, nome),
      resumo = json_set(coalesce(resumo, '{}'), '$.projetos', json(?), '$.gastos', json(?)), resumo_em = ? WHERE id = ?`)
    .bind(situacao, desde, st.nomeEleitoral || null, JSON.stringify(projetos), JSON.stringify(gastos), agora(), `camara:${id}`).run()
  return 7
}

/** Votações nominais do Plenário numa janela (máx. 3 meses) e o voto de cada deputado. */
async function votacoes(ctx: Contexto, ini: string, fim: string) {
  const lista: any[] = []
  for (let pg = 1; pg <= 30; pg++) {
    const j = await buscar(ctx.orc, `${API}/votacoes?idOrgao=${PLENARIO}&dataInicio=${ini}&dataFim=${fim}&itens=100&pagina=${pg}&ordem=DESC&ordenarPor=dataHoraRegistro`)
    lista.push(...j.dados)
    if (j.dados.length < 100) break
  }
  const ja = await existentes(ctx.db, 'votacoes', lista.map((v) => `camara:${v.id}`))
  for (const v of lista) {
    if (ja.has(`camara:${v.id}`)) continue
    let votos: any[]
    try { votos = (await buscar(ctx.orc, `${API}/votacoes/${v.id}/votos`)).dados }
    catch (e) { if (e instanceof SemOrcamento) throw e; continue } // essa votação falhou: tenta na próxima rodada
    const db = ctx.db
    const cmd = [db.prepare('INSERT OR REPLACE INTO votacoes (id, casa_id, data, titulo, descricao, nominal, url) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(`camara:${v.id}`, 'camara', v.data, v.proposicaoObjeto || null, v.descricao || null, votos.length ? 1 : 0, v.idEvento ? `https://www.camara.leg.br/evento-legislativo/${v.idEvento}` : null)]
    for (const x of votos) if (x.deputado_?.id) cmd.push(db.prepare('INSERT OR REPLACE INTO votos (votacao_id, politico_id, voto) VALUES (?, ?, ?)').bind(`camara:${v.id}`, `camara:${x.deputado_.id}`, x.tipoVoto || 'Não informado'))
    await lote(db, cmd)
  }
}

/** Sessões deliberativas do Plenário numa janela e quem registrou presença. */
async function sessoes(ctx: Contexto, ini: string, fim: string) {
  const lista: any[] = []
  for (let pg = 1; pg <= 10; pg++) {
    const j = await buscar(ctx.orc, `${API}/eventos?idOrgao=${PLENARIO}&dataInicio=${ini}&dataFim=${fim}&itens=100&pagina=${pg}`)
    lista.push(...j.dados)
    if (j.dados.length < 100) break
  }
  const deliberativas = lista.filter((e) => e.descricaoTipo === 'Sessão Deliberativa' && e.situacao === 'Encerrada')
  const ja = await existentes(ctx.db, 'sessoes', deliberativas.map((e) => `camara:${e.id}`))
  for (const e of deliberativas) {
    if (ja.has(`camara:${e.id}`)) continue
    const presentes = (await buscar(ctx.orc, `${API}/eventos/${e.id}/deputados`)).dados as any[]
    if (!presentes.length) continue // lista ainda não publicada: tenta depois
    const db = ctx.db
    await lote(db, [
      db.prepare('INSERT OR REPLACE INTO sessoes (id, casa_id, data, tipo) VALUES (?, ?, ?, ?)').bind(`camara:${e.id}`, 'camara', e.dataHoraInicio.slice(0, 10), 'deliberativa'),
      ...presentes.map((p) => db.prepare('INSERT OR IGNORE INTO presencas (sessao_id, politico_id) VALUES (?, ?)').bind(`camara:${e.id}`, `camara:${p.id}`)),
    ])
  }
}

/** Os últimos 85 dias, de 6 em 6 horas. */
export async function recentes(ctx: Contexto): Promise<number> {
  const [{ ini, fim }] = janelas(ctx.desde, new Date())
  await votacoes(ctx, ini, fim)
  await sessoes(ctx, ini, fim)
  return 0.25
}

/** Uma vez: agenda as janelas antigas, até COLETA_DESDE. */
export async function historico(ctx: Contexto): Promise<number> {
  const ate = new Date(); ate.setUTCDate(ate.getUTCDate() - 86)
  await agendar(ctx.db, janelas(ctx.desde, ate).map(({ ini, fim }) => `camara:janela:${ini}:${fim}`), 7)
  return 0
}

export async function janela(ctx: Contexto, ini: string, fim: string): Promise<number> {
  await votacoes(ctx, ini, fim)
  await sessoes(ctx, ini, fim)
  return 0
}
