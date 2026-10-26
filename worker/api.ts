// API do site (/api/*). Tudo sai do D1, pronto: o coletor já fez o trabalho pesado.
import { UFS, ufDe, FEDERAL, type Status } from '../shared/cobertura'
import { comparecimentoSenado, maisRecente, normalizar, statusDosResumos } from '../shared/logica'
import type { Busca, CargoLugar, Ficha, Item, Lugar, LinhaCobertura, PessoaLista, VotoLinha } from '../shared/tipos'
import { rodarColetor } from './coletor/fila'
import { agendarJa, agora, daqui } from './util'

class NaoAchei extends Error {}

// Resultados caros guardados na memória do Worker por alguns minutos (cada instância tem a sua).
const memo = new Map<string, { ate: number; valor: unknown }>()
async function lembrar<T>(chave: string, minutos: number, f: () => Promise<T>): Promise<T> {
  const m = memo.get(chave)
  if (m && m.ate > Date.now()) return m.valor as T
  const valor = await f()
  memo.set(chave, { ate: Date.now() + minutos * 60_000, valor })
  return valor
}
const DF = '5300108'

interface CasaLinha {
  id: string; tipo: string; nome: string; sigla: string | null; uf: string | null; ibge: string | null; acesso: string | null; sapl: string | null; url: string | null
  votos: Status | null; presenca: Status | null; projetos: Status | null; gastos: Status | null; nota: string | null; verificado_em: string | null
  origem: string; saude: string | null; procurada_em: string | null; coletada_em: string | null
}
interface PoliticoLinha {
  id: string; casa_id: string; cargo: string; nome: string; partido: string | null; uf: string | null; foto: string | null; pagina: string | null
  situacao: string | null; desde: string | null; resumo: string | null; resumo_em: string | null
}

const resposta = (dados: unknown, segundos: number, status = 200) => new Response(JSON.stringify(dados), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': segundos ? `public, max-age=${segundos}` : 'no-store' },
})

export async function api(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(req.url)
  const p = decodeURIComponent(url.pathname.replace(/^\/api/, ''))
  if (req.method !== 'GET') return resposta({ erro: 'só leitura' }, 0, 405)
  try {
    let m: RegExpExecArray | null
    if (p === '/busca') return resposta(await busca(env, url.searchParams.get('q') ?? ''), 60)
    if ((m = /^\/lugar\/(\d{7})$/.exec(p))) return resposta(await lugar(env, ctx, m[1]), 60)
    if (p === '/pessoas') return resposta(await pessoas(env, url.searchParams), 300)
    if ((m = /^\/p\/(.+)\/votos$/.exec(p))) return resposta(await votos(env, m[1], url.searchParams), 300)
    if ((m = /^\/p\/(.+)$/.exec(p))) return resposta(await ficha(env, m[1]), 300)
    if (p === '/cobertura') return resposta(await cobertura(env), 600)
    if (p === '/saude') return resposta(await saude(env), 0)
    return resposta({ erro: 'Esse endereço não existe.' }, 0, 404)
  } catch (e) {
    if (e instanceof NaoAchei) return resposta({ erro: e.message }, 60, 404)
    console.error(e)
    return resposta({ erro: 'Deu um problema do nosso lado. Tente de novo em instantes.' }, 0, 500)
  }
}

/* ---------- O que cada casa publica ---------- */

const dataBR = (d?: string | null) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '')
const artigoCasa = (c: CasaLinha) => (c.tipo === 'federal' ? (c.id === 'camara' ? 'A Câmara' : 'O Senado') : c.tipo === 'assembleia' ? `A ${c.sigla ?? 'Assembleia'}` : c.nome.replace(/^Câmara Municipal/, 'A Câmara'))
const COISAS = { votos: ['Votos', 'os votos de cada um'], presenca: ['Presença e faltas', 'a presença de cada um'], projetos: ['Projetos e pedidos', 'os projetos por autor'], gastos: ['Gastos do gabinete', 'os gastos por parlamentar'] } as const

/** Casas com SAPL: o status sai do que foi coletado de cada parlamentar ativo. */
async function medido(env: Env, casa: CasaLinha) {
  if (!casa.sapl) return null
  const r = await env.DB.prepare(`SELECT count(*) AS n,
      sum(coalesce(json_extract(resumo, '$.votos.total'), 0) > 0) AS v,
      sum(coalesce(json_extract(resumo, '$.presenca.presente'), 0) > 0) AS pr,
      sum(coalesce(json_extract(resumo, '$.projetos.total'), 0) > 0) AS pj
    FROM politicos WHERE casa_id = ? AND ativo = 1 AND resumo_em IS NOT NULL`).bind(casa.id).first<{ n: number; v: number; pr: number; pj: number }>()
  return r && r.n > 0 ? { n: r.n, ...statusDosResumos(r.n, r.v ?? 0, r.pr ?? 0, r.pj ?? 0) } : null
}

async function itensDaCasa(env: Env, casa: CasaLinha): Promise<{ itens: Item[]; medido: boolean }> {
  const med = await medido(env, casa)
  const quem = artigoCasa(casa)
  const quando = dataBR(med ? casa.coletada_em : casa.verificado_em)
  const itens: Item[] = []
  for (const chave of ['votos', 'presenca', 'projetos', 'gastos'] as const) {
    if (chave === 'gastos' && !casa.gastos) continue
    const status = (med && chave !== 'gastos' ? med[chave] : casa[chave]) ?? 'naosei'
    const [nome, coisa] = COISAS[chave]
    let nota: string | undefined
    if (status === 'nao') nota = med && chave !== 'gastos' ? `${quem} não registra ${coisa} no sistema (medido em ${quando}).` : `${quem} não publica ${coisa} em formato aberto (conferido em ${quando}).`
    else if (status === 'naosei') nota = casa.origem === 'interlegis' ? 'Ainda vamos medir o sistema desta casa.' : 'O site da casa não deixou conferir.'
    else if (status === 'parcial') nota = med && chave !== 'gastos' ? `Só parte dos parlamentares tem isso registrado no sistema (medido em ${quando}).` : 'Só em página ou PDF, ou com dados antigos.'
    if (chave === 'gastos' && status !== 'nao' && casa.sapl) nota = status === 'sim' ? 'A casa publica fora do SAPL; ainda não trazemos para cá.' : nota
    itens.push({ chave, nome, status, nota })
  }
  return { itens, medido: !!med }
}

const casaInfo = (c: CasaLinha, med: boolean) => ({ id: c.id, nome: c.nome, sigla: c.sigla ?? undefined, acesso: c.acesso ?? undefined, url: c.url ?? undefined, nota: c.nota ?? undefined, medido: med, verificado_em: (med ? c.coletada_em : c.verificado_em) ?? undefined })

/* ---------- /api/lugar/:ibge ---------- */

async function lugar(env: Env, ctx: ExecutionContext, ibge: string): Promise<Lugar> {
  const db = env.DB
  const mun = ibge === DF ? { ibge, nome: 'Brasília', uf: 'DF', diario_nivel: null, diario_desde: null }
    : await db.prepare('SELECT ibge, nome, uf, diario_nivel, diario_desde FROM municipios WHERE ibge = ?').bind(ibge).first<{ ibge: string; nome: string; uf: string; diario_nivel: string | null; diario_desde: string | null }>()
  if (!mun) throw new NaoAchei('Não achei essa cidade.')
  const u = ufDe(mun.uf)!
  const ids = ['camara', 'senado', `al:${u.uf}`, `cm:${ibge}`]
  const casas = new Map((await db.prepare(`SELECT * FROM casas WHERE id IN (?, ?, ?, ?)`).bind(...ids).all<CasaLinha>()).results.map((c) => [c.id, c]))
  const contas = new Map((await db.prepare(`SELECT casa_id, count(*) AS n FROM politicos WHERE ativo = 1 AND ((casa_id IN ('camara', 'senado') AND uf = ?) OR casa_id IN (?, ?)) GROUP BY casa_id`)
    .bind(u.uf, ids[2], ids[3]).all<{ casa_id: string; n: number }>()).results.map((r) => [r.casa_id, r.n]))

  const legislativo = async (cargo: CargoLugar['cargo'], nome: string, esfera: CargoLugar['esfera'], id: string, quantos?: string): Promise<CargoLugar> => {
    const c = casas.get(id)
    if (!c) return { cargo, nome, esfera, itens: [], pessoas: 0, coleta: 'nao_verificada' }
    const { itens, medido: med } = await itensDaCasa(env, c)
    return { cargo, nome, esfera, casa: casaInfo(c, med), itens, pessoas: contas.get(id) ?? 0, quantos }
  }
  const tse: Item = { chave: 'tse', nome: 'Ficha do candidato (TSE)', status: 'sim', nota: 'Bens, doações e gastos de campanha: o TSE publica; entram aqui em breve.' }
  const naoVota: Item = { chave: 'votos', nome: 'Votos', status: 'na', nota: 'Cargo executivo não vota.' }
  const proposta: Item = { chave: 'proposta', nome: 'Proposta de governo', status: 'sim', nota: 'TSE, em PDF. Entra aqui em breve.' }

  const cargos: CargoLugar[] = [
    { cargo: 'presidente', nome: 'Presidente', esfera: 'federal', itens: [naoVota, proposta, { chave: 'agenda', nome: 'Agenda oficial', status: 'sim', nota: 'e-Agendas, da CGU.' }, tse], pessoas: 0, coleta: 'nao_se_aplica' },
    await legislativo('senador', 'Senadores', 'federal', 'senado', `3 por estado (${u.uf})`),
    await legislativo('depfed', 'Deputados federais', 'federal', 'camara', `eleitos por ${u.nome}`),
    { cargo: 'governador', nome: u.uf === 'DF' ? 'Governador do DF' : 'Governador', esfera: 'estadual', itens: [naoVota, proposta, { chave: 'contas', nome: 'Contas do estado', status: 'naosei', nota: 'Tesouro Nacional (Siconfi): ainda não testado.' }, tse], pessoas: 0, coleta: 'nao_se_aplica' },
    await legislativo('depest', u.uf === 'DF' ? 'Deputados distritais' : 'Deputados estaduais', 'estadual', `al:${u.uf}`),
  ]
  if (u.uf !== 'DF') {
    const nivel = mun.diario_nivel
    const diario: Item = nivel === '3' ? { chave: 'diario', nome: 'Diário Oficial do município', status: 'sim', nota: `No Querido Diário desde ${dataBR(mun.diario_desde)}.` }
      : nivel === '1' || nivel === '2' ? { chave: 'diario', nome: 'Diário Oficial do município', status: 'parcial', nota: 'No Querido Diário, ainda sem o texto completo.' }
        : { chave: 'diario', nome: 'Diário Oficial do município', status: 'nao', nota: `O Querido Diário ainda não cobre ${mun.nome}.` }
    cargos.push({ cargo: 'prefeito', nome: 'Prefeito', esfera: 'municipal', itens: [naoVota, proposta, diario, tse], pessoas: 0, coleta: 'nao_se_aplica' })
    const ver = await legislativo('vereador', 'Vereadores', 'municipal', `cm:${ibge}`)
    ver.coleta = await coletaDaCamara(env, ctx, ibge, casas.get(`cm:${ibge}`))
    if (!ver.casa) ver.itens = [{ chave: 'votos', nome: 'Votos', status: 'naosei', nota: 'Estamos procurando o sistema desta câmara agora.' }]
    cargos.push(ver)
  }
  return { uf: u.uf, ufNome: u.nome, ibge, municipio: mun.nome, capital: u.ibge === ibge, cargos }
}

/** Câmara do interior: se ninguém coletou ainda, procura e coleta agora (e avisa que está coletando). */
async function coletaDaCamara(env: Env, ctx: ExecutionContext, ibge: string, c?: CasaLinha): Promise<CargoLugar['coleta']> {
  const db = env.DB
  const recente = c?.procurada_em && c.procurada_em >= daqui(-2 / 1440)
  if (!c) {
    const t = await db.prepare(`SELECT 1 FROM tarefas WHERE id = ?`).bind(`sapl:adivinhar:${ibge}`).first()
    if (!t) await agendarJa(db, `sapl:adivinhar:${ibge}`, 1)
    ctx.waitUntil(rodarColetor(env, { maxPedidos: 60, segundos: 20 }))
    return 'coletando'
  }
  // Capital sem SAPL no levantamento: o bloco já explica pelo que a casa publica.
  if (!c.sapl) return c.origem === 'levantamento' ? undefined : 'sem_sapl'
  const velha = !c.coletada_em || c.coletada_em < daqui(-7)
  if (!velha) return 'pronta'
  if (!recente) {
    await db.prepare('UPDATE casas SET procurada_em = ? WHERE id = ?').bind(agora(), c.id).run()
    await agendarJa(db, `sapl:casa:${c.id}`, 1)
    ctx.waitUntil(rodarColetor(env, { maxPedidos: 120, segundos: 25 }))
  }
  return c.coletada_em ? 'pronta' : 'coletando'
}

/* ---------- /api/pessoas ---------- */

const PESSOA = 'id, nome, partido, uf, foto, situacao, cargo'
async function pessoas(env: Env, q: URLSearchParams): Promise<PessoaLista[]> {
  const casa = q.get('casa') ?? ''
  const uf = q.get('uf')
  const sql = `SELECT ${PESSOA} FROM politicos WHERE casa_id = ? AND ativo = 1 ${uf ? 'AND uf = ?' : ''} ORDER BY situacao = 'suplente', busca`
  const st = env.DB.prepare(sql)
  return (await (uf ? st.bind(casa, uf) : st.bind(casa)).all<PessoaLista>()).results
}

/* ---------- /api/p/:id ---------- */

const NOME_CARGO: Record<string, string> = { senador: 'Senador', depfed: 'Deputado federal', depest: 'Deputado estadual', vereador: 'Vereador' }
const VOTOU_CAMARA = ['Sim', 'Não', 'Abstenção', 'Obstrução', 'Artigo 17']

async function ficha(env: Env, id: string): Promise<Ficha> {
  const db = env.DB
  const p = await db.prepare('SELECT * FROM politicos WHERE id = ?').bind(id).first<PoliticoLinha>()
  if (!p) throw new NaoAchei('Não achei essa pessoa.')
  // O banco fica longe (cada consulta é uma ida e volta): tudo que não depende de outra coisa vai junto.
  const casaP = db.prepare('SELECT * FROM casas WHERE id = ?').bind(p.casa_id).first<CasaLinha>()
  const r = JSON.parse(p.resumo || '{}')
  const federal = p.casa_id === 'camara' || p.casa_id === 'senado'
  // COLETA_DESDE limita só o que vem das janelas federais; do SAPL temos a legislatura inteira.
  const desde = federal ? maisRecente(p.desde, env.COLETA_DESDE) : (p.desde ?? '')
  const faltando: Ficha['faltando'] = []
  let presenca: Ficha['presenca'] = null
  let votosF: Ficha['votos'] = null

  const blocoPresenca = (async () => { if (p.casa_id !== 'senado') {
    // Câmara e SAPL: só entram na conta as sessões em que a casa registrou alguma lista de presença.
    const sP = db.prepare(`SELECT
        (SELECT count(*) FROM sessoes WHERE casa_id = ?3 AND data >= ?1) AS sessoes,
        (SELECT count(DISTINCT s.id) FROM sessoes s JOIN presencas pr ON pr.sessao_id = s.id WHERE s.casa_id = ?3 AND s.data >= ?1) AS total,
        (SELECT count(*) FROM presencas pr JOIN sessoes s ON s.id = pr.sessao_id WHERE pr.politico_id = ?2 AND s.data >= ?1) AS presente`)
      .bind(desde, id, p.casa_id).first<{ sessoes: number; total: number; presente: number }>()
    // A média da casa varre todas as presenças: fica guardada 30 min (é a mesma para quem tem o mesmo "desde").
    const mediaP = lembrar(`media:${p.casa_id}:${desde}`, 30, () => db.prepare(`SELECT
        (SELECT count(*) FROM politicos WHERE casa_id = ?2 AND ativo = 1 AND (?2 = 'camara' OR resumo_em IS NOT NULL)) AS ativos,
        (SELECT count(*) FROM presencas pr JOIN sessoes s ON s.id = pr.sessao_id JOIN politicos po ON po.id = pr.politico_id
          WHERE s.casa_id = ?2 AND s.data >= ?1 AND po.ativo = 1) AS todas`).bind(desde, p.casa_id).first<{ ativos: number; todas: number }>())
    const [s, media] = await Promise.all([sP, mediaP])
    if (s && !s.presente && r.presenca?.presente) {
      // A presença por sessão desta pessoa ainda não foi gravada (o coletor refaz por semana): usa o resumo.
      presenca = { tipo: 'sessoes', presente: r.presenca.presente, total: r.presenca.total, desde: r.presenca.desde, mediaCasa: null,
        nota: 'Sessões ordinárias desta legislatura com presença registrada no sistema da casa. Falta justificada não vem separada.' }
    } else if (s && s.total) {
      const semLista = s.sessoes - s.total
      presenca = { tipo: 'sessoes', presente: s.presente, total: s.total, desde, mediaCasa: media?.ativos ? Math.min(1, media.todas / (media.ativos * s.total)) : null,
        nota: p.casa_id === 'camara'
          ? 'Sessões deliberativas do Plenário em que registrou presença. A Câmara não separa a falta justificada (licença, missão oficial).'
          : `Sessões ordinárias em que registrou presença no sistema da casa. Falta justificada não vem separada.${semLista > 0 ? ` A casa não lançou a lista de presença de ${semLista} das ${s.sessoes} sessões do período; essas ficam fora da conta.` : ''}` }
    }
  } else {
    const [meus, todos] = await Promise.all([
      db.prepare(`SELECT v.voto, count(*) AS n FROM votos v JOIN votacoes t ON t.id = v.votacao_id WHERE v.politico_id = ? AND t.data >= ? GROUP BY v.voto`).bind(id, desde).all<{ voto: string; n: number }>().then((x) => x.results),
      lembrar(`media:senado:${desde}`, 30, async () => (await db.prepare(`SELECT v.voto, count(*) AS n FROM votos v JOIN votacoes t ON t.id = v.votacao_id
        JOIN politicos po ON po.id = v.politico_id WHERE t.casa_id = 'senado' AND t.data >= ? AND po.ativo = 1 GROUP BY v.voto`).bind(desde).all<{ voto: string; n: number }>()).results),
    ])
    const somar = (l: { voto: string; n: number }[]) => {
      const d = { votou: 0, presente: 0, justificada: 0, falta: 0, outro: 0 }
      for (const x of l) d[comparecimentoSenado(x.voto)] += x.n
      return d
    }
    const d = somar(meus), dt = somar(todos)
    const total = Object.values(d).reduce((a, b) => a + b, 0)
    const totalT = Object.values(dt).reduce((a, b) => a + b, 0)
    if (total) presenca = { tipo: 'votacoes', presente: d.votou + d.presente, total, desde, detalhe: d, mediaCasa: totalT ? (dt.votou + dt.presente) / totalT : null,
      nota: 'Votações do Plenário em que estava presente. O Senado informa o motivo de cada ausência.' }
  } })()

  const blocoVotos = (async () => { if (federal) {
    const [linhas, por, nominais] = await Promise.all([
      votosDe(env, p, desde, null, null, 8),
      db.prepare(`SELECT v.voto, count(*) AS n FROM votos v JOIN votacoes t ON t.id = v.votacao_id WHERE v.politico_id = ? AND t.data >= ? GROUP BY v.voto ORDER BY n DESC`)
        .bind(id, desde).all<{ voto: string; n: number }>().then((x) => x.results),
      db.prepare(`SELECT count(*) AS n FROM votacoes WHERE casa_id = ? AND nominal = 1 AND data >= ?`).bind(p.casa_id, desde).first<{ n: number }>(),
    ])
    // No Senado, ausência também vem como "voto" (LS, MIS…): só conta o que é voto de verdade.
    const total = por.filter((x) => p.casa_id !== 'senado' || comparecimentoSenado(x.voto) === 'votou').reduce((s, x) => s + x.n, 0)
    if (nominais?.n) {
      const naoVotou = p.casa_id === 'camara' ? Math.max(0, nominais.n - total) : 0
      votosF = { total, porVoto: [...por.map((x) => [x.voto, x.n] as [string, number]), ...(naoVotou ? [['Não votou', naoVotou] as [string, number]] : [])],
        recentes: linhas, mais: nominais.n > linhas.length, nominais: nominais.n,
        nota: p.casa_id === 'camara' ? '"Não votou" não é sempre falta: pode ser quem preside a sessão, licença, missão ou obstrução.' : 'Em votação secreta, aparece só que votou.' }
    }
  } else if (r.votos?.historico) {
    votosF = { total: r.votos.total, porVoto: r.votos.porVoto, recentes: [], mais: false,
      nota: r.votos.total ? 'O sistema da casa registra os votos sem dizer em qual matéria, a não ser com muitas consultas a mais; aqui eles aparecem somados.' : 'Há votos no sistema, mas todos de legislaturas anteriores.' }
  } })()

  const [casaLida] = await Promise.all([casaP, blocoPresenca, blocoVotos])
  const casa = casaLida!
  const quem = artigoCasa(casa)
  const statusCasa = (k: 'votos' | 'presenca' | 'gastos') => casa[k] ?? 'naosei'
  const motivo = (k: 'votos' | 'presenca' | 'gastos', coisa: string) => {
    const s = statusCasa(k)
    return s === 'nao' ? `${quem} não publica ${coisa} em formato aberto.` : s === 'naosei' ? 'Não deu para conferir se a casa publica.' : p.resumo_em ? `${quem} não tem isso registrado para esta pessoa.` : 'Ainda estamos coletando.'
  }
  if (!presenca) faltando.push({ chave: 'presenca', titulo: 'Presença e faltas', motivo: motivo('presenca', 'a presença de cada um') })
  if (!votosF) faltando.push({ chave: 'votos', titulo: 'Votos', motivo: motivo('votos', 'os votos de cada um') })
  if (!r.gastos) faltando.push({ chave: 'gastos', titulo: 'Gastos do gabinete', motivo: statusCasa('gastos') === 'sim' ? `${quem} publica, mas fora do sistema que lemos; ainda não trazemos para cá.` : motivo('gastos', 'os gastos por parlamentar') })
  if (federal) faltando.push({ chave: 'emendas', titulo: 'Emendas', motivo: 'Para onde mandou dinheiro e quanto foi pago: o Portal da Transparência publica. Entra aqui em breve.' })
  faltando.push({ chave: 'campanha', titulo: 'Campanha', motivo: 'Bens declarados, doações recebidas e gastos de campanha: o TSE publica. Entram aqui em breve.' })

  const fontes = [{ nome: federal ? casa.nome : `${casa.nome} (SAPL)`, url: casa.sapl ? `${casa.sapl}/` : (casa.url ?? (p.casa_id === 'camara' ? FEDERAL.camara.url : FEDERAL.senado.url)) }]
  if (p.pagina) fontes.unshift({ nome: 'Página oficial', url: p.pagina })
  const cargoNome = p.cargo === 'depest' && p.uf === 'DF' ? 'Deputado distrital' : NOME_CARGO[p.cargo] ?? p.cargo
  return {
    pessoa: { id: p.id, nome: p.nome, partido: p.partido, uf: p.uf, foto: p.foto, situacao: p.situacao, cargo: p.cargo, pagina: p.pagina, desde: p.desde, casa_id: p.casa_id, casa: casa.nome, cargoNome },
    presenca, votos: votosF, projetos: r.projetos ?? null, gastos: r.gastos ?? null, faltando, fontes, atualizado_em: p.resumo_em, coletando: !p.resumo_em,
  }
}

/** Votações nominais (federais) com o voto da pessoa; na Câmara, quem não votou não aparece na lista da fonte. */
async function votosDe(env: Env, p: PoliticoLinha, desde: string, antes: string | null, filtro: string | null, limite: number): Promise<VotoLinha[]> {
  const cond = filtro === 'sim' ? `AND v.voto = 'Sim'` : filtro === 'nao' ? `AND v.voto = 'Não'`
    : filtro === 'ausente' ? `AND (v.voto IS NULL OR v.voto NOT IN (${[...VOTOU_CAMARA, 'Votou'].map((x) => `'${x}'`).join(', ')}))` : ''
  const r = await env.DB.prepare(`SELECT t.data, t.titulo, t.descricao, t.url, coalesce(v.voto, 'Não votou') AS voto
      FROM votacoes t LEFT JOIN votos v ON v.votacao_id = t.id AND v.politico_id = ?
      WHERE t.casa_id = ? AND t.nominal = 1 AND t.data >= ? ${antes ? 'AND t.data < ?' : ''} ${cond}
      ORDER BY t.data DESC, t.id DESC LIMIT ?`)
  const args: unknown[] = [p.id, p.casa_id, desde, ...(antes ? [antes] : []), limite]
  return (await r.bind(...args).all<VotoLinha>()).results
}

async function votos(env: Env, id: string, q: URLSearchParams): Promise<{ votos: VotoLinha[]; mais: boolean }> {
  const p = await env.DB.prepare('SELECT * FROM politicos WHERE id = ?').bind(id).first<PoliticoLinha>()
  if (!p) throw new NaoAchei('Não achei essa pessoa.')
  const lista = await votosDe(env, p, maisRecente(p.desde, env.COLETA_DESDE), q.get('antes'), q.get('filtro'), 31)
  return { votos: lista.slice(0, 30), mais: lista.length > 30 }
}

/* ---------- /api/busca ---------- */

async function busca(env: Env, q: string): Promise<Busca> {
  const n = normalizar(q)
  if (n.length < 2) return { municipios: [], pessoas: [] }
  const [m, p] = await Promise.all([
    env.DB.prepare(`SELECT ibge, nome, uf FROM municipios WHERE busca LIKE ?1 OR busca LIKE ?2 ORDER BY busca = ?3 DESC, busca LIKE ?1 DESC, length(busca) LIMIT 6`)
      .bind(`${n}%`, `% ${n}%`, n).all<{ ibge: string; nome: string; uf: string }>(),
    env.DB.prepare(`SELECT ${PESSOA} FROM politicos WHERE ativo = 1 AND (busca LIKE ?1 OR busca LIKE ?2) ORDER BY busca LIKE ?1 DESC, cargo, busca LIMIT 8`)
      .bind(`${n}%`, `% ${n}%`).all<PessoaLista>(),
  ])
  return { municipios: m.results, pessoas: p.results }
}

/* ---------- /api/cobertura ---------- */

async function cobertura(env: Env): Promise<LinhaCobertura[]> {
  const db = env.DB
  const casas = new Map((await db.prepare(`SELECT * FROM casas WHERE origem = 'levantamento'`).all<CasaLinha>()).results.map((c) => [c.id, c]))
  const interior = new Map((await db.prepare(`SELECT uf, count(*) AS comSapl, sum(votos = 'sim' OR presenca = 'sim') AS comDados FROM casas
      WHERE tipo = 'camara' AND origem != 'levantamento' AND sapl IS NOT NULL GROUP BY uf`).all<{ uf: string; comSapl: number; comDados: number }>()).results.map((r) => [r.uf, r]))
  const linhas: LinhaCobertura[] = []
  for (const u of UFS) {
    const al = casas.get(`al:${u.uf}`), cm = casas.get(`cm:${u.ibge}`)
    if (!al) continue
    const a = await itensDaCasa(env, al)
    const c = cm ? await itensDaCasa(env, cm) : null
    linhas.push({
      uf: u.uf, ufNome: u.nome,
      assembleia: { sigla: al.sigla ?? '', acesso: al.acesso ?? '', itens: a.itens, url: al.url ?? '' },
      capital: { nome: u.uf === 'DF' ? 'Brasília (não tem câmara municipal)' : u.capital, acesso: cm?.acesso ?? '', itens: c?.itens ?? [], url: cm?.url ?? '' },
      interior: { comSapl: interior.get(u.uf)?.comSapl ?? 0, comDados: interior.get(u.uf)?.comDados ?? 0 },
    })
  }
  return linhas
}

/* ---------- /api/saude (para o dono conferir o coletor) ---------- */

async function saude(env: Env) {
  const db = env.DB
  const t = agora()
  const [fila, erros, execs, pols, contas, pendentes] = await Promise.all([
    db.prepare('SELECT count(*) AS total, sum(proxima_em <= ?) AS vencidas, sum(ultimo_erro IS NOT NULL) AS com_erro FROM tarefas').bind(t).first(),
    db.prepare('SELECT id, ultimo_erro, tentativas, proxima_em FROM tarefas WHERE ultimo_erro IS NOT NULL ORDER BY tentativas DESC, id LIMIT 20').all(),
    db.prepare('SELECT * FROM execucoes ORDER BY id DESC LIMIT 10').all(),
    db.prepare(`SELECT casa_id, count(*) AS ativos, sum(resumo_em IS NOT NULL) AS com_resumo FROM politicos WHERE ativo = 1 GROUP BY casa_id ORDER BY casa_id`).all(),
    db.prepare(`SELECT (SELECT count(*) FROM votacoes) AS votacoes, (SELECT count(*) FROM votos) AS votos, (SELECT count(*) FROM sessoes) AS sessoes,
      (SELECT count(*) FROM presencas) AS presencas, (SELECT count(*) FROM municipios) AS municipios,
      (SELECT count(*) FROM casas WHERE sapl IS NOT NULL) AS casas_sapl, (SELECT count(*) FROM casas WHERE origem = 'medido') AS casas_medidas`).first(),
    db.prepare('SELECT id FROM tarefas WHERE proxima_em <= ? LIMIT 20000').bind(t).all<{ id: string }>(),
  ])
  const porTipo: Record<string, number> = {}
  for (const { id } of pendentes.results) { const k = id.split(':').slice(0, 2).join(':').replace(/:\d.*$/, ''); porTipo[k] = (porTipo[k] || 0) + 1 }
  return { agora: t, fila, pendentesPorTipo: porTipo, erros: erros.results, execucoes: execs.results, politicos: pols.results, contas }
}
