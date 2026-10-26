<script setup lang="ts">
import { RouterLink } from 'vue-router'
import Busca from '../components/Busca.vue'
import { titulo } from '../lib/formato'
titulo('Página não encontrada')
</script>

<template>
  <div class="wrap nao">
    <h1>Essa página não existe</h1>
    <p class="muted">O endereço pode ter mudado. Busque a cidade ou o político:</p>
    <Busca />
    <RouterLink to="/">Ir para o início</RouterLink>
  </div>
</template>

<style scoped>
.nao { max-width: 640px; padding-top: 48px; display: grid; gap: 14px; }
</style>
