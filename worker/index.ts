// Worker do Seu Voto: /api/* responde do D1; o resto é o site (dist/). O cron roda o coletor.
import { api } from './api'
import { rodarColetor } from './coletor/fila'

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url)
    if (url.pathname.startsWith('/api/')) return api(req, env, ctx)
    return env.ASSETS.fetch(req)
  },
  async scheduled(_ev, env) {
    // Espera terminar (e não waitUntil): assim o cron e o /__scheduled local só voltam no fim da rodada.
    const r = await rodarColetor(env, { maxPedidos: 800, segundos: 280 })
    console.log('coletor', JSON.stringify(r))
  },
} satisfies ExportedHandler<Env>
