// Senado Federal (legis.senado.leg.br/dadosabertos): senadores, votações com o motivo de cada
// ausência, projetos por autor e a cota (CEAPS, adm.senado.gov.br). Até 10 pedidos por segundo.
import { normalizar, somarGastos, tipoSenado, maisRecente } from '../../shared/logica'
import { agendar, agora, buscar, existentes, hoje, https, lista, lote } from '../util'
import { naUf, type Contexto } from './contexto'

const API = 'https://legis.senado.leg.br/dadosabertos'
const ADM = 'https://adm.senado.gov.br/adm-dadosabertos/api/v1'

export async function senadores(ctx: Contexto): Promise<number> {
  const j = await buscar(ctx.orc, `${API}/senador/lista/atual.json`)
  const todos = lista<any>(j.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar)
  if (todos.length < 70) throw new Error(`o Senado devolveu só ${todos.length} senadores`)
  const t = agora()
  const db = ctx.db
  const cmd = todos.map((x) => {
    const p = x.IdentificacaoParlamentar
    const m = x.Mandato ?? {}
    const exercicios = lista<any>(m.Exercicios?.Exercicio).map((e) => e.DataInicio).filter(Boolean)
    const desde = maisRecente(m.PrimeiraLegislaturaDoMandato?.DataInicio, ...exercicios)
    const situacao = /titular/i.test(m.DescricaoParticipacao || '') ? 'titular' : 'suplente'
    return db.prepare(`INSERT INTO politicos (id, casa_id, cargo, nome, busca, partido, uf, foto, pagina, situacao, desde, ativo, atualizado_em)
        VALUES (?, 'senado', 'senador', ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        ON CONFLICT(id) DO UPDATE SET nome = excluded.nome, busca = excluded.busca, partido = excluded.partido, uf = excluded.uf, foto = excluded.foto,
          pagina = excluded.pagina, situacao = excluded.situacao, desde = excluded.desde, ativo = 1, atualizado_em = excluded.atualizado_em`)
      .bind(`senado:${p.CodigoParlamentar}`, p.NomeParlamentar, normalizar(p.NomeParlamentar), p.SiglaPartidoParlamentar, p.UfParlamentar,
        https(p.UrlFotoParlamentar), https(p.UrlPaginaParlamentar), situacao, desde || null, t)
  })
  cmd.push(db.prepare(`UPDATE politicos SET ativo = 0 WHERE casa_id = 'senado' AND atualizado_em < ?`).bind(t))
  cmd.push(db.prepare(`UPDATE casas SET coletada_em = ? WHERE id = 'senado'`).bind(t))
  await lote(db, cmd)
  await agendar(db, todos.filter((x) => naUf(ctx, x.IdentificacaoParlamentar.UfParlamentar)).map((x) => `senado:sen:${x.IdentificacaoParlamentar.CodigoParlamentar}`), 5)
  return 1
}

/** Projetos de um senador desde o início do mandato (inclui coautoria). */
export async function senador(ctx: Contexto, cod: string): Promise<number> {
  const p = await ctx.db.prepare('SELECT desde FROM politicos WHERE id = ?').bind(`senado:${cod}`).first<{ desde: string | null }>()
  const desde = p?.desde || '2023-02-01'
  const itens = lista<any>(await buscar(ctx.orc, `${API}/processo.json?codigoParlamentarAutor=${cod}&dataInicioApresentacao=${desde}`))
  const por = new Map<string, number>()
  for (const x of itens) { const t = tipoSenado(x.identificacao); por.set(t, (por.get(t) || 0) + 1) }
  const porTipo = [...por.entries()].sort((a, b) => (a[0] === 'Outros' ? 1 : b[0] === 'Outros' ? -1 : b[1] - a[1]))
  const projetos = { total: itens.length, porTipo, desde, nota: 'Contando os de coautoria.' }
  await ctx.db.prepare(`UPDATE politicos SET resumo = json_set(coalesce(resumo, '{}'), '$.projetos', json(?)), resumo_em = ? WHERE id = ?`)
    .bind(JSON.stringify(projetos), agora(), `senado:${cod}`).run()
  return 7
}

/** Todas as votações de um ano (um pedido só) com o voto ou o motivo da ausência de cada senador. */
export async function votacoesAno(ctx: Contexto, ano: number): Promise<number> {
  const atual = ano === new Date().getUTCFullYear()
  const ini = maisRecente(`${ano}-01-01`, ctx.desde)
  const fim = atual ? hoje() : `${ano}-12-31`
  if (ini > fim) return atual ? 0.25 : 0
  const sessoes = lista<any>(await buscar(ctx.orc, `${API}/votacao.json?dataInicio=${ini}&dataFim=${fim}`))
  const ja = await existentes(ctx.db, 'votacoes', sessoes.map((s) => `senado:${s.codigoSessaoVotacao}`))
  const db = ctx.db
  for (const s of sessoes) {
    const id = `senado:${s.codigoSessaoVotacao}`
    if (ja.has(id)) continue
    const votos = lista<any>(s.votos)
    const titulo = s.identificacao || (s.sigla ? `${s.sigla} ${s.numero}/${s.ano}` : null)
    await lote(db, [
      db.prepare('INSERT OR REPLACE INTO votacoes (id, casa_id, data, titulo, descricao, nominal, url) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(id, 'senado', s.dataSessao, titulo, s.descricaoVotacao || s.ementa || null, votos.length ? 1 : 0,
          s.codigoMateria ? `https://www25.senado.leg.br/web/atividade/materias/-/materia/${s.codigoMateria}` : null),
      ...votos.filter((v) => v.codigoParlamentar).map((v) => db.prepare('INSERT OR REPLACE INTO votos (votacao_id, politico_id, voto) VALUES (?, ?, ?)').bind(id, `senado:${v.codigoParlamentar}`, v.siglaVotoParlamentar || 'Não informado')),
    ])
  }
  return atual ? 0.25 : 0
}

export const recentes = (ctx: Contexto) => votacoesAno(ctx, new Date().getUTCFullYear())

/** Uma vez: agenda os anos anteriores, até COLETA_DESDE. */
export async function historico(ctx: Contexto): Promise<number> {
  const atual = new Date().getUTCFullYear()
  const anos: string[] = []
  for (let a = Number(ctx.desde.slice(0, 4)); a < atual; a++) anos.push(`senado:ano:${a}`)
  await agendar(ctx.db, anos, 7)
  return 0
}

/** Cota (CEAPS) do ano: um arquivo com todos os senadores, somado por pessoa e categoria. */
export async function gastos(ctx: Contexto): Promise<number> {
  const ano = new Date().getUTCFullYear()
  const notas = lista<any>(await buscar(ctx.orc, `${ADM}/senadores/despesas_ceaps/${ano}`))
  const por = new Map<number, { categoria: string; valor: number }[]>()
  for (const n of notas) {
    const l = por.get(n.codSenador) ?? []
    l.push({ categoria: n.tipoDespesa, valor: Number(n.valorReembolsado) || 0 })
    por.set(n.codSenador, l)
  }
  const t = agora()
  await lote(ctx.db, [...por.entries()].map(([cod, l]) => ctx.db.prepare(`UPDATE politicos SET resumo = json_set(coalesce(resumo, '{}'), '$.gastos', json(?)), resumo_em = ? WHERE id = ?`)
    .bind(JSON.stringify(somarGastos(ano, l)), t, `senado:${cod}`)))
  return 1
}
