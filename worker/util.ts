// Utilidades do Worker: datas, pedidos às fontes (com orçamento) e escrita em lote no D1.

export const agora = () => new Date().toISOString()
export const daqui = (dias: number) => new Date(Date.now() + dias * 864e5).toISOString()
export const hoje = () => new Date().toISOString().slice(0, 10)
export const https = (u?: string | null) => (u ? u.replace(/^http:\/\//, 'https://') : null)
export const lista = <T>(x: T | T[] | undefined | null): T[] => (x == null ? [] : Array.isArray(x) ? x : [x])
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Acabou o orçamento desta rodada: a tarefa para onde está e continua na próxima. */
export class SemOrcamento extends Error {}

/** Quantos pedidos e quanto tempo uma rodada do coletor pode gastar. */
export class Orcamento {
  pedidos = 0
  constructor(readonly max: number, readonly ate: number) {}
  gastar() {
    if (this.pedidos >= this.max || Date.now() > this.ate) throw new SemOrcamento('orçamento da rodada acabou')
    this.pedidos++
  }
}

const UA = 'seuvoto.bugadao.com (um projeto bugadao; le dados abertos)'
const host = (u: string) => { try { return new URL(u).hostname } catch { return u } }

// Intervalo mínimo entre pedidos ao mesmo servidor (o Senado aceita até 10 por segundo e dá 503 sob carga).
const INTERVALO: Record<string, number> = { 'legis.senado.leg.br': 250, 'adm.senado.gov.br': 250, 'www12.senado.leg.br': 500 }
const ultimoPedido = new Map<string, number>()
async function respeitarIntervalo(url: string) {
  const h = host(url), ms = INTERVALO[h]
  if (!ms) return
  const falta = (ultimoPedido.get(h) ?? 0) + ms - Date.now()
  if (falta > 0) await espera(falta)
  ultimoPedido.set(h, Date.now())
}

/** GET numa fonte, com tempo-limite e uma nova tentativa em erro de rede, 429 ou 5xx. */
export async function buscar(orc: Orcamento, url: string, { texto = false, comTotal = false } = {}): Promise<any> {
  for (let t = 0; ; t++) {
    orc.gastar()
    await respeitarIntervalo(url)
    let r: Response
    try {
      r = await fetch(url, { headers: { Accept: texto ? 'text/html' : 'application/json', 'User-Agent': UA }, signal: AbortSignal.timeout(25_000) })
    } catch (e) {
      if (t < 1) { await espera(1000); continue }
      throw new Error(`${host(url)}: ${e instanceof Error ? e.message : e}`)
    }
    if ((r.status === 429 || r.status >= 500) && t < 1) { await espera(2000); continue }
    if (!r.ok) throw new Error(`${host(url)} respondeu ${r.status}`)
    if (texto) return r.text()
    const json = await r.json()
    return comTotal ? { json, total: Number(r.headers.get('X-Total-Count') ?? NaN) } : json
  }
}

/** Executa os comandos em lotes (o D1 aceita batch; lotes menores não estouram limite). */
export async function lote(db: D1Database, comandos: D1PreparedStatement[], tam = 80) {
  for (let i = 0; i < comandos.length; i += tam) await db.batch(comandos.slice(i, i + tam))
}

/** Quais destes ids já existem na tabela (para não buscar de novo). */
export async function existentes(db: D1Database, tabela: 'votacoes' | 'sessoes', ids: string[]): Promise<Set<string>> {
  const ja = new Set<string>()
  for (let i = 0; i < ids.length; i += 90) {
    const parte = ids.slice(i, i + 90)
    const r = await db.prepare(`SELECT id FROM ${tabela} WHERE id IN (${parte.map(() => '?').join(',')})`).bind(...parte).all<{ id: string }>()
    for (const x of r.results) ja.add(x.id)
  }
  return ja
}

/** Põe tarefas na fila sem mexer nas que já estão lá. */
export async function agendar(db: D1Database, ids: string[], prioridade: number) {
  const t = agora()
  await lote(db, ids.map((id) => db.prepare('INSERT OR IGNORE INTO tarefas (id, prioridade, proxima_em) VALUES (?, ?, ?)').bind(id, prioridade, t)))
}
/** Põe na frente da fila (coleta pedida por alguém que abriu a página). */
export async function agendarJa(db: D1Database, id: string, prioridade = 1) {
  const t = agora()
  await db.prepare(`INSERT INTO tarefas (id, prioridade, proxima_em) VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET prioridade = min(prioridade, excluded.prioridade), proxima_em = min(proxima_em, excluded.proxima_em)`).bind(id, prioridade, t).run()
}
