<script setup lang="ts">
// Foto oficial; se não houver ou não carregar, as iniciais no lugar.
import { ref, watch } from 'vue'
import { iniciais } from '../lib/formato'
const props = defineProps<{ src?: string | null; nome: string; tam?: number }>()
const falhou = ref(false)
watch(() => props.src, () => { falhou.value = false })
</script>

<template>
  <img v-if="src && !falhou" class="foto" :src="src" alt="" loading="lazy" :style="{ width: `${tam ?? 48}px`, height: `${tam ?? 48}px` }" @error="falhou = true" />
  <span v-else class="foto sem" aria-hidden="true" :style="{ width: `${tam ?? 48}px`, height: `${tam ?? 48}px`, fontSize: `${(tam ?? 48) * 0.36}px` }">{{ iniciais(nome) }}</span>
</template>

<style scoped>
.foto { border-radius: 28%; object-fit: cover; object-position: top; background: var(--surface); flex: none; }
.sem { display: grid; place-items: center; background: var(--accent-soft); color: var(--accent); font-family: var(--font-display); font-weight: 700; }
</style>
