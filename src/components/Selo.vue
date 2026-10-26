<script setup lang="ts">
// O que um lugar publica: ícone + texto, nunca só a cor.
import { ROTULO, type Status } from '../../shared/cobertura'
defineProps<{ status: Status; rotulo?: string }>()
const ICONE: Record<Status, string> = { sim: '✓', parcial: '◐', nao: '✕', naosei: '?', na: '–' }
</script>

<template>
  <span class="selo" :class="status"><span class="ic" aria-hidden="true">{{ ICONE[status] }}</span>{{ rotulo ?? ROTULO[status] }}</span>
</template>

<style scoped>
.selo { display: inline-flex; align-items: center; gap: 6px; font: 600 .78rem/1.2 var(--font-sans); white-space: nowrap; color: var(--st-naosei); }
.ic { display: inline-grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; font-size: .7rem; font-weight: 800; border: 1.5px solid currentColor; }
.sim { color: var(--st-sim); } .parcial { color: var(--st-parcial); } .nao { color: var(--st-nao); } .naosei { color: var(--st-naosei); } .na { color: var(--st-na); }
.naosei .ic { border-style: dashed; } .na .ic { border-style: dotted; }
</style>
