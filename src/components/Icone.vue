<script setup lang="ts">
// Ícones em traço (24×24), sempre decorativos: o texto do lado diz o que é.
defineProps<{ nome: 'lugar' | 'cola' | 'tema' | 'inicio' | 'busca' | 'link' | 'compartilhar' | 'info' | 'fechar' | 'imprimir' | 'imagem' | 'seta' }>()
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="nome === 'lugar'"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></template>
    <template v-else-if="nome === 'cola'"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></template>
    <template v-else-if="nome === 'tema'"><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor" /></template>
    <template v-else-if="nome === 'inicio'"><path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" /></template>
    <template v-else-if="nome === 'busca'"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></template>
    <template v-else-if="nome === 'link'"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></template>
    <template v-else-if="nome === 'compartilhar'"><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" /></template>
    <template v-else-if="nome === 'info'"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></template>
    <template v-else-if="nome === 'fechar'"><path d="M6 6l12 12M18 6L6 18" /></template>
    <template v-else-if="nome === 'imprimir'"><path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" /><rect x="7" y="14" width="10" height="7" rx="1" /></template>
    <template v-else-if="nome === 'imagem'"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 17l-5-5-9 8" /></template>
    <template v-else-if="nome === 'seta'"><path d="M5 12h14M13 6l6 6-6 6" /></template>
  </svg>
</template>
