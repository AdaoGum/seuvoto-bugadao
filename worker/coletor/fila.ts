// A fila do coletor. Cada rodada (cron de 10 em 10 minutos, ou alguém abrindo uma câmara nova)
// pega as tarefas vencidas, na ordem de prioridade, até acabar o orçamento de pedidos e de tempo.
// Toda tarefa é idempotente: se parar no meio, a próxima rodada refaz sem duplicar nada.
import { Orcamento, SemOrcamento, agora, daqui } from '../util'
import type { Contexto } from './contexto'
import * as camara from './camara'
import * as senado from './senado'
import * as sapl from './sapl'
import * as base from './base'

/** Roda a tarefa e diz em quantos dias ela volta (0 = terminou de vez, sai da fila). */
type Tarefa = (ctx: Contexto, partes: string[]) => Promise<number>

const TAREFAS: [RegExp, Tarefa][] = [
  [/^casas:semear$/, base.semearCasas],
  [/^municipios$/, base.municipios],
  [/^camara:deputados$/, camara.deputados],
  [/^camara:dep:(\d+)$/, (c, [id]) => camara.deputado(c, id)],
  [/^camara:recentes$/, camara.recentes],
  [/^camara:historico$/, camara.historico],
  [/^camara:janela:([\d-]+):([\d-]+)$/, (c, [ini, fim]) => camara.janela(c, ini, fim)],
  [/^senado:senadores$/, senado.senadores],
  [/^senado:sen:(\d+)$/, (c, [cod]) => senado.senador(c, cod)],
  [/^senado:recentes$/, senado.recentes],
  [/^senado:historico$/, senado.historico],
  [/^senado:ano:(\d{4})$/, (c, [ano]) => senado.votacoesAno(c, Number(ano))],
  [/^senado:gastos$/, senado.gastos],
  [/^sapl:casas$/, sapl.casas],
  [/^sapl:casa:(.+)$/, (c, [id]) => sapl.casa(c, id)],
  [/^sapl:parl:(.+)$/, (c, [id]) => sapl.parlamentar(c, id)],
  [/^sapl:medir:(.+)$/, (c, [id]) => sapl.medir(c, id)],
  [/^sapl:adivinhar:(\d+)$/, (c, [ibge]) => sapl.adivinhar(c, ibge)],
  [/^interlegis$/, base.interlegis],
  [/^interlegis:([A-Z]{2}):(\d+)$/, (c, [uf, p]) => base.interlegisPagina(c, uf, Number(p))],
]

// As tarefas-raiz: sempre na fila. Menor prioridade = roda antes.
const RAIZES: [string, number][] = [
  ['casas:semear', 1], ['municipios', 2],
  ['camara:recentes', 2], ['senado:recentes', 2],
  ['camara:deputados', 3], ['senado:senadores', 3],
  ['senado:gastos', 4], ['sapl:casas', 4],
  ['camara:historico', 6], ['senado:historico', 6],
  ['interlegis', 8],
]

// Depois de um erro, espera mais a cada tentativa: 30 min, 2 h, 12 h, 1 dia, 3 dias.
const ESPERA_ERRO = [0.02, 0.08, 0.5, 1, 3]

export async function rodarColetor(env: Env, { maxPedidos = 800, segundos = 280 } = {}) {
  const db = env.DB
  const ufs = env.COLETA_UFS?.trim()
  const ctx: Contexto = { env, db, orc: new Orcamento(maxPedidos, Date.now() + segundos * 1000), desde: env.COLETA_DESDE || '2023-02-01', ufs: ufs ? new Set(ufs.split(',').map((u) => u.trim().toUpperCase())) : null }
  const inicio = agora()
  await db.batch(RAIZES.map(([id, p]) => db.prepare('INSERT OR IGNORE INTO tarefas (id, prioridade, proxima_em) VALUES (?, ?, ?)').bind(id, p, inicio)))
  const exec = await db.prepare('INSERT INTO execucoes (inicio) VALUES (?) RETURNING id').bind(inicio).first<{ id: number }>()
  let feitas = 0, erros = 0

  while (Date.now() < ctx.orc.ate && ctx.orc.pedidos < ctx.orc.max) {
    const t = await db.prepare('SELECT id, proxima_em, tentativas FROM tarefas WHERE proxima_em <= ? ORDER BY prioridade, proxima_em LIMIT 1')
      .bind(agora()).first<{ id: string; proxima_em: string; tentativas: number }>()
    if (!t) break
    // Reserva a tarefa por 15 minutos: outra rodada ao mesmo tempo não pega a mesma.
    const reserva = await db.prepare('UPDATE tarefas SET proxima_em = ? WHERE id = ? AND proxima_em = ?').bind(daqui(15 / 1440), t.id, t.proxima_em).run()
    if (!reserva.meta.changes) continue
    const achada = TAREFAS.map(([re, f]) => [re.exec(t.id), f] as const).find(([m]) => m)
    if (!achada) { await db.prepare('DELETE FROM tarefas WHERE id = ?').bind(t.id).run(); continue }
    const [m, rodar] = achada
    try {
      const dias = await rodar(ctx, m!.slice(1))
      if (dias <= 0) await db.prepare('DELETE FROM tarefas WHERE id = ?').bind(t.id).run()
      else await db.prepare('UPDATE tarefas SET proxima_em = ?, tentativas = 0, ultimo_erro = NULL, feita_em = ? WHERE id = ?').bind(daqui(dias), agora(), t.id).run()
      feitas++
    } catch (e) {
      if (e instanceof SemOrcamento) { // não é erro: volta para o começo da fila
        await db.prepare('UPDATE tarefas SET proxima_em = ? WHERE id = ?').bind(t.proxima_em, t.id).run()
        break
      }
      erros++
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 500)
      await db.prepare('UPDATE tarefas SET tentativas = tentativas + 1, ultimo_erro = ?, proxima_em = ? WHERE id = ?')
        .bind(msg, daqui(ESPERA_ERRO[Math.min(t.tentativas, ESPERA_ERRO.length - 1)]), t.id).run()
    }
  }
  await db.prepare('UPDATE execucoes SET fim = ?, feitas = ?, erros = ?, pedidos = ? WHERE id = ?').bind(agora(), feitas, erros, ctx.orc.pedidos, exec!.id).run()
  // Guarda só as últimas 500 rodadas.
  await db.prepare('DELETE FROM execucoes WHERE id < ?').bind(exec!.id - 500).run()
  return { feitas, erros, pedidos: ctx.orc.pedidos }
}
