// Roda o coletor no Worker local (npm run dev:api precisa estar aberto) até a fila esvaziar.
// Uso: npm run coletar:local [-- rodadas]   (padrão: 200 rodadas)
const BASE = 'http://127.0.0.1:8787'
const rodadas = Number(process.argv[2] || 200)

for (let i = 1; i <= rodadas; i++) {
  const t0 = Date.now()
  const r = await fetch(`${BASE}/cdn-cgi/handler/scheduled?cron=*/10+*+*+*+*`)
  if (!r.ok) { console.error(`rodada ${i}: o Worker respondeu ${r.status}`); process.exit(1) }
  const s = await (await fetch(`${BASE}/api/saude`)).json()
  const ult = s.execucoes[0] ?? {}
  const tipos = Object.entries(s.pendentesPorTipo).map(([k, n]) => `${k}=${n}`).join(' ')
  console.log(`rodada ${i} (${Math.round((Date.now() - t0) / 1000)} s): ${ult.feitas} feitas, ${ult.erros} erros, ${ult.pedidos} pedidos · na fila agora: ${s.fila.vencidas ?? 0} ${tipos ? `(${tipos})` : ''}`)
  if (!s.fila.vencidas) { console.log('Fila vazia: tudo coletado por enquanto.'); break }
}
const s = await (await fetch(`${BASE}/api/saude`)).json()
console.log('\nContas:', JSON.stringify(s.contas))
console.log('Parlamentares:', s.politicos.map((p) => `${p.casa_id} ${p.com_resumo}/${p.ativos}`).join(' · '))
if (s.erros.length) console.log('\nTarefas com erro:\n' + s.erros.map((e) => `  ${e.id} (${e.tentativas}x): ${e.ultimo_erro}`).join('\n'))
