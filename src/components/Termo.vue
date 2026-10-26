<script setup lang="ts">
// Palavra de "politiquês" com a explicação a um toque (funciona com teclado e no celular).
import { ref } from 'vue'
defineProps<{ termo: string; explicacao: string }>()
const aberto = ref(false)
const id = `t-${Math.random().toString(36).slice(2, 7)}`
</script>

<template>
  <span class="termo">
    {{ termo }}
    <button type="button" class="q" :aria-expanded="aberto" :aria-controls="id" :aria-label="`O que é: ${termo}`" @click="aberto = !aberto">?</button>
    <span v-if="aberto" :id="id" class="exp" role="note">{{ explicacao }}</span>
  </span>
</template>

<style scoped>
.termo { display: inline; }
.q { display: inline-grid; place-items: center; width: 18px; height: 18px; margin-left: 4px; border-radius: 50%; border: 1px solid var(--border-strong); background: transparent; color: var(--muted); font: 700 .66rem/1 var(--font-sans); cursor: pointer; vertical-align: 1px; }
.q:hover, .q[aria-expanded="true"] { color: var(--accent); border-color: var(--accent); }
.exp { display: block; margin-top: 4px; font-size: .82rem; color: var(--muted); font-weight: 400; }
</style>
