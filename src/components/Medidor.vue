<script setup lang="ts">
// Presença: a parte de um total, com a marca da média da casa para comparar (sem nota nem cor de "bom/ruim").
import { computed } from 'vue'
import { num, pct } from '../lib/formato'
const props = defineProps<{ parte: number; total: number; media?: number | null; rotuloMedia?: string }>()
const p = computed(() => pct(props.parte, props.total))
const m = computed(() => (props.media == null ? null : Math.round(props.media * 100)))
</script>

<template>
  <div class="medidor">
    <div class="trilho" role="img" :aria-label="`${p}%: ${num(parte)} de ${num(total)}${m != null ? `. Média da casa: ${m}%` : ''}`">
      <span class="feito" :style="{ width: `${p}%` }"></span>
      <span v-if="m != null" class="media" :style="{ left: `${m}%` }"></span>
    </div>
    <div class="legenda">
      <span><b>{{ num(parte) }}</b> de {{ num(total) }}</span>
      <span v-if="m != null" class="muted"><span class="tique" aria-hidden="true"></span> {{ rotuloMedia ?? 'média da casa' }}: {{ m }}%</span>
    </div>
  </div>
</template>

<style scoped>
.trilho { position: relative; height: 12px; border-radius: 6px; background: var(--surface); border: 1px solid var(--border); overflow: visible; }
.feito { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 6px; background: var(--accent-deep); }
.media { position: absolute; top: -5px; bottom: -5px; width: 2px; margin-left: -1px; background: var(--text); border-radius: 1px; box-shadow: 0 0 0 2px var(--bg-elev); }
.legenda { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 14px; margin-top: 8px; font-size: .88rem; }
.tique { display: inline-block; width: 2px; height: 12px; background: var(--text); vertical-align: -1px; margin-right: 4px; }
</style>
