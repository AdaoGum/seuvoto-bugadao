<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import Icone from '../components/Icone.vue'
import { CARGOS_COLA, cola, limparCola, naCola, onde } from '../lib/guardado'
import { titulo, urlPessoa } from '../lib/formato'

titulo('Minha cola')
const grupo = ref<'geral' | 'municipal'>('geral')
const cargos = computed(() => CARGOS_COLA.filter((c) => c.grupo === grupo.value))
const nomeCargo = (id: string, nome: string) => (id === 'depest' && onde.atual?.uf === 'DF' ? 'Deputado distrital' : nome)
const preenchidos = computed(() => cargos.value.filter((c) => cola[c.id].numero || cola[c.id].nome))
const so = (e: Event, max: number) => { const i = e.target as HTMLInputElement; i.value = i.value.replace(/\D/g, '').slice(0, max); return i.value }

function imprimir() { window.print() }

/** Desenha a cola numa imagem (para guardar no celular ou mandar no grupo). */
async function salvarImagem() {
  await document.fonts?.ready
  const linhas = preenchidos.value
  const L = 1080, pad = 64, alt = 230 + Math.max(1, linhas.length) * 170 + 120
  const cv = document.createElement('canvas')
  cv.width = L; cv.height = alt
  const g = cv.getContext('2d')!
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, L, alt)
  g.strokeStyle = '#0B0B12'; g.lineWidth = 6; g.strokeRect(24, 24, L - 48, alt - 48)
  g.fillStyle = '#0B0B12'; g.font = '800 64px Sora, Inter, sans-serif'; g.fillText('Minha cola', pad, 140)
  g.fillStyle = '#555566'; g.font = '500 28px "JetBrains Mono", monospace'
  g.fillText(grupo.value === 'geral' ? 'ELEIÇÃO GERAL' : 'ELEIÇÃO MUNICIPAL', pad, 190)
  let y = 230
  for (const c of linhas) {
    const v = cola[c.id]
    g.strokeStyle = '#C9C9D1'; g.lineWidth = 2; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(pad, y); g.lineTo(L - pad, y); g.stroke(); g.setLineDash([])
    g.fillStyle = '#555566'; g.font = '500 30px Inter, sans-serif'; g.fillText(nomeCargo(c.id, c.nome), pad, y + 52)
    g.fillStyle = '#0B0B12'; g.font = '600 40px Inter, sans-serif'; g.fillText(cortar(g, [v.nome, v.partido].filter(Boolean).join(' · ') || '—', 620), pad, y + 108)
    if (v.resumo) { g.fillStyle = '#3F3F46'; g.font = '400 24px Inter, sans-serif'; g.fillText(cortar(g, v.resumo, 640), pad, y + 148) }
    g.fillStyle = '#0B0B12'; g.font = '700 96px "JetBrains Mono", monospace'; g.textAlign = 'right'
    g.fillText(v.numero || '·'.repeat(c.digitos), L - pad, y + 118); g.textAlign = 'left'
    y += 170
  }
  g.fillStyle = '#85859A'; g.font = '500 24px "JetBrains Mono", monospace'; g.fillText('seuvoto.bugadao.com · a ordem é a da urna', pad, alt - 60)
  const a = document.createElement('a')
  a.href = cv.toDataURL('image/png'); a.download = 'minha-cola.png'; a.click()
}
function cortar(g: CanvasRenderingContext2D, t: string, max: number) {
  if (g.measureText(t).width <= max) return t
  while (t.length > 1 && g.measureText(`${t}…`).width > max) t = t.slice(0, -1)
  return `${t}…`
}
</script>

<template>
  <div class="wrap">
    <header class="cab">
      <p class="rotulo">Para levar na votação</p>
      <h1>Minha cola</h1>
      <p class="muted">Celular não entra na cabine; papel pode. Digite os números, ou abra a ficha de alguém e toque em "Pôr na minha cola". Fica só neste aparelho.</p>
    </header>

    <div class="chips grupos" role="group" aria-label="Eleição">
      <button type="button" class="chip" :aria-pressed="grupo === 'geral'" @click="grupo = 'geral'">Eleição geral · 2030</button>
      <button type="button" class="chip" :aria-pressed="grupo === 'municipal'" @click="grupo = 'municipal'">Eleição municipal · 2028</button>
    </div>

    <div class="area">
      <section class="cartao linhas" aria-label="Seus candidatos">
        <div v-for="c in cargos" :key="c.id" class="linha">
          <label :for="`n-${c.id}`" class="cg">{{ nomeCargo(c.id, c.nome) }}</label>
          <input :id="`n-${c.id}`" :value="cola[c.id].numero" class="campo mono num" inputmode="numeric" :maxlength="c.digitos" :placeholder="'0'.repeat(c.digitos)"
            :aria-label="`Número para ${nomeCargo(c.id, c.nome)} (${c.digitos} dígitos)`" @input="cola[c.id].numero = so($event, c.digitos)" />
          <input v-model="cola[c.id].nome" class="campo nome" type="text" placeholder="Nome (opcional)" :aria-label="`Nome para ${nomeCargo(c.id, c.nome)}`" />
          <p v-if="cola[c.id].resumo" class="resumo-linha muted pequeno">{{ cola[c.id].resumo }} <RouterLink v-if="cola[c.id].id" :to="urlPessoa(cola[c.id].id)">ver ficha</RouterLink></p>
        </div>
        <p class="muted pequeno">O número do candidato sai no TSE perto da eleição. Na urna, a ordem é esta, de cima para baixo.</p>
      </section>

      <div class="lado">
        <div id="cola-impressa" class="papel">
          <h2>Minha cola <small>seuvoto.bugadao.com</small></h2>
          <p class="g">{{ grupo === 'geral' ? 'Eleição geral' : 'Eleição municipal' }}</p>
          <div v-for="c in preenchidos" :key="c.id" class="r">
            <span class="c">{{ nomeCargo(c.id, c.nome) }}</span>
            <span class="n">{{ cola[c.id].numero || '·'.repeat(c.digitos) }}</span>
            <span class="nm">{{ [cola[c.id].nome, cola[c.id].partido].filter(Boolean).join(' · ') }}</span>
            <span v-if="cola[c.id].resumo" class="rs">{{ cola[c.id].resumo }}</span>
          </div>
          <p v-if="!preenchidos.length" class="vazio">Os candidatos aparecem aqui.</p>
          <p class="pe">A ordem é a da urna. Dados de fontes oficiais.</p>
        </div>
        <div class="botoes">
          <button class="btn btn-go" type="button" :disabled="!preenchidos.length" @click="imprimir"><Icone nome="imprimir" /> Imprimir</button>
          <button class="btn" type="button" :disabled="!preenchidos.length" @click="salvarImagem"><Icone nome="imagem" /> Salvar imagem</button>
          <button v-if="naCola" class="btn btn-ghost" type="button" @click="limparCola">Limpar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cab { padding: 32px 0 14px; max-width: 62ch; display: grid; gap: 6px; }
.cab h1 { font-size: clamp(1.7rem, 4.4vw, 2.4rem); }
.grupos { margin-bottom: 14px; }
.area { display: grid; gap: 18px; }
@media (min-width: 900px) { .area { grid-template-columns: minmax(0, 1fr) 380px; align-items: start; } }
.linhas { display: grid; gap: 14px; }
.linha { display: grid; grid-template-columns: 140px 110px minmax(0, 1fr); gap: 10px; align-items: center; }
.cg { font-weight: 600; }
.num { text-align: center; letter-spacing: .12em; font-size: 1.1rem; }
.resumo-linha { grid-column: 2 / -1; margin-top: -6px; }
@media (max-width: 600px) { .linha { grid-template-columns: 1fr 110px; } .nome, .resumo-linha { grid-column: 1 / -1; } }
.lado { display: grid; gap: 12px; }
@media (min-width: 900px) { .lado { position: sticky; top: calc(var(--topo-h) + 14px); } }
.papel { background: #fff; color: #0B0B12; border: 2px solid #0B0B12; border-radius: 18px; padding: 20px; }
.papel h2 { font: 800 1.2rem/1.2 var(--font-display); display: flex; justify-content: space-between; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.papel h2 small { font: 500 .64rem/1 var(--font-mono); color: #555566; }
.g { font: 700 .66rem/1 var(--font-mono); letter-spacing: .08em; text-transform: uppercase; color: #555566; margin: 14px 0 6px; }
.r { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 12px; padding: 9px 0; border-top: 1px dashed #c9c9d1; }
.c { font-size: .76rem; color: #555566; }
.n { grid-row: span 2; align-self: center; font: 700 1.8rem/1 var(--font-mono); letter-spacing: .08em; }
.nm { font-weight: 600; font-size: .9rem; }
.rs { grid-column: 1 / -1; font-size: .74rem; color: #3F3F46; }
.vazio { color: #85859A; font-size: .88rem; padding: 10px 0; }
.pe { font: 500 .62rem/1.4 var(--font-mono); color: #85859A; margin-top: 12px; }
.botoes { display: flex; flex-wrap: wrap; gap: 8px; }
</style>

<style>
@media print {
  body { background: #fff !important; }
  body * { visibility: hidden; }
  #cola-impressa, #cola-impressa * { visibility: visible; }
  #cola-impressa { position: absolute; left: 0; top: 0; width: 9cm; border-width: 1px; }
}
</style>
