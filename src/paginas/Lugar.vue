<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import type { Esfera, Lugar } from '../../shared/tipos'
import CargoBloco from '../components/CargoBloco.vue'
import { pegar } from '../lib/api'
import { onde } from '../lib/guardado'
import { titulo } from '../lib/formato'

const rota = useRoute()
const lugar = ref<Lugar | null>(null)
const erro = ref('')
let timer: ReturnType<typeof setTimeout> | undefined

async function carregar(novo = false) {
  clearTimeout(timer)
  const ibge = String(rota.params.ibge)
  try {
    const l = await pegar<Lugar>(`/lugar/${ibge}`, { novo })
    lugar.value = l
    erro.value = ''
    onde.atual = { ibge, nome: l.municipio ?? 'Brasília', uf: l.uf }
    titulo(`${l.municipio} · ${l.uf}`)
    // Câmara do interior sendo coletada agora: confere de novo daqui a pouco.
    if (l.cargos.some((c) => c.coleta === 'coletando')) timer = setTimeout(() => carregar(true), 20_000)
  } catch (e) { erro.value = (e as Error).message }
}
watch(() => rota.params.ibge, () => { lugar.value = null; carregar() }, { immediate: true })
onBeforeUnmount(() => clearTimeout(timer))

const ESFERAS: { id: Esfera; nome: string; texto: string }[] = [
  { id: 'federal', nome: 'Federal', texto: 'Em Brasília: quem faz as leis do país e quem governa.' },
  { id: 'estadual', nome: 'Estadual', texto: 'No estado: governo e Assembleia Legislativa.' },
  { id: 'municipal', nome: 'Municipal', texto: 'Na cidade: prefeitura e câmara de vereadores.' },
]
const porEsfera = computed(() => ESFERAS.map((e) => ({ ...e, cargos: lugar.value?.cargos.filter((c) => c.esfera === e.id) ?? [] })).filter((e) => e.cargos.length))
</script>

<template>
  <div class="wrap">
    <p v-if="erro" class="cartao erro">{{ erro }} <RouterLink to="/">Voltar ao início</RouterLink></p>
    <template v-else-if="lugar">
      <header class="cab">
        <div>
          <p class="rotulo">Onde você vota</p>
          <h1>{{ lugar.municipio }} <span class="muted">· {{ lugar.ufNome }}</span></h1>
          <p class="muted">Você vota para {{ lugar.cargos.length }} cargos. Toque num nome para ver o que a pessoa fez.</p>
        </div>
        <RouterLink to="/" class="btn btn-sm">Trocar de cidade</RouterLink>
      </header>
      <nav class="atalhos" aria-label="Ir para">
        <a v-for="e in porEsfera" :key="e.id" :href="`#esfera-${e.id}`" class="chip">{{ e.nome }}</a>
      </nav>
      <section v-for="e in porEsfera" :id="`esfera-${e.id}`" :key="e.id" class="cartao esfera">
        <div class="secao-t"><h2>{{ e.nome }}</h2><span class="muted pequeno">{{ e.texto }}</span></div>
        <CargoBloco v-for="c in e.cargos" :key="c.cargo" :c="c" :uf="lugar.uf" :municipio="lugar.municipio" />
      </section>
      <p v-if="lugar.uf === 'DF'" class="muted pequeno">O Distrito Federal não tem prefeito nem vereador: quem administra é o governador, e as leis do DF saem da Câmara Legislativa.</p>
    </template>
    <div v-else class="carregando-lugar">
      <div class="esqueleto" style="height: 90px; max-width: 520px"></div>
      <div class="esqueleto" style="height: 320px"></div>
      <div class="esqueleto" style="height: 220px"></div>
    </div>
  </div>
</template>

<style scoped>
.cab { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end; justify-content: space-between; padding: 32px 0 12px; }
.cab h1 { font-size: clamp(1.6rem, 4.2vw, 2.3rem); margin: 6px 0 6px; }
.cab h1 .muted { font-weight: 600; }
.atalhos { display: flex; gap: 8px; margin: 6px 0 14px; position: sticky; top: calc(var(--topo-h) + 6px); z-index: 5; }
.atalhos .chip { background: var(--bg-elev); }
.esfera { margin-bottom: 14px; }
.erro { margin-top: 32px; }
.carregando-lugar { display: grid; gap: 14px; padding-top: 32px; }
</style>
