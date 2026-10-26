<script setup lang="ts">
// Barras horizontais de uma cor só, com o valor escrito ao lado (dá para ler sem ver a barra).
import { computed } from 'vue'
import { explicacao } from '../../shared/logica'
import { num, reais } from '../lib/formato'
import Termo from './Termo.vue'

const props = defineProps<{ itens: [string, number][]; formato?: 'numero' | 'reais'; rotulo: string }>()
const max = computed(() => Math.max(1, ...props.itens.map(([, v]) => v)))
const total = computed(() => props.itens.reduce((s, [, v]) => s + v, 0))
const fmt = (v: number) => (props.formato === 'reais' ? reais(v) : num(v))
</script>

<template>
  <table class="barras">
    <caption class="sr-only">{{ rotulo }}</caption>
    <tbody>
      <tr v-for="[nome, v] in itens" :key="nome" :title="`${nome}: ${fmt(v)}${total ? ` (${Math.round((v / total) * 100)}%)` : ''}`">
        <th scope="row"><Termo v-if="explicacao(nome)" :termo="nome" :explicacao="explicacao(nome)!" /><template v-else>{{ nome }}</template></th>
        <td class="trilho" aria-hidden="true"><span class="barra" :style="{ width: `${Math.max(v > 0 ? 2 : 0, (v / max) * 100)}%` }"></span></td>
        <td class="valor">{{ fmt(v) }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.barras { width: 100%; border-collapse: collapse; }
.barras tr { border-top: 1px solid var(--border); }
.barras tr:first-child { border-top: 0; }
th { text-align: left; font-weight: 500; font-size: .9rem; padding: 8px 12px 8px 0; width: 42%; }
.trilho { padding: 8px 0; width: 40%; }
.barra { display: block; height: 8px; border-radius: 0 4px 4px 0; background: var(--accent-deep); min-width: 0; }
.valor { text-align: right; padding: 8px 0 8px 12px; font: 600 .88rem/1.2 var(--font-mono); white-space: nowrap; }
@media (max-width: 560px) {
  tr { display: grid; grid-template-columns: 1fr auto; }
  th { width: auto; padding-bottom: 2px; }
  .trilho { grid-column: 1 / -1; grid-row: 2; padding: 0 0 8px; }
  .valor { padding-bottom: 2px; }
}
</style>
