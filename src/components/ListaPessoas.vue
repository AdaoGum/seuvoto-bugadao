<script setup lang="ts">
// Quem está no cargo, com filtro por nome ou partido. Mostra 12 e abre o resto sob pedido.
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { normalizar } from '../../shared/logica'
import type { PessoaLista } from '../../shared/tipos'
import { pegar } from '../lib/api'
import { urlPessoa } from '../lib/formato'
import Foto from './Foto.vue'

const props = defineProps<{ casa: string; uf?: string; total: number }>()
const pessoas = ref<PessoaLista[] | null>(null)
const erro = ref('')
const filtro = ref('')
const todos = ref(false)

watch(() => [props.casa, props.uf], async () => {
  pessoas.value = null; erro.value = ''
  try { pessoas.value = await pegar<PessoaLista[]>(`/pessoas?casa=${encodeURIComponent(props.casa)}${props.uf ? `&uf=${props.uf}` : ''}`) }
  catch (e) { erro.value = (e as Error).message }
}, { immediate: true })

const filtradas = computed(() => {
  const f = normalizar(filtro.value)
  return (pessoas.value ?? []).filter((p) => !f || normalizar(`${p.nome} ${p.partido ?? ''}`).includes(f))
})
const visiveis = computed(() => (todos.value || filtro.value ? filtradas.value : filtradas.value.slice(0, 12)))
</script>

<template>
  <div class="lista">
    <div v-if="total > 12" class="filtro">
      <label class="sr-only" :for="`f-${casa}`">Filtrar por nome ou partido</label>
      <input :id="`f-${casa}`" v-model="filtro" class="campo" type="search" placeholder="Filtrar por nome ou partido" />
    </div>
    <p v-if="erro" class="muted">{{ erro }}</p>
    <div v-else-if="!pessoas" class="grade">
      <div v-for="i in Math.min(total || 6, 6)" :key="i" class="esqueleto" style="height: 66px"></div>
    </div>
    <template v-else>
      <div class="grade">
        <RouterLink v-for="p in visiveis" :key="p.id" :to="urlPessoa(p.id)" class="pessoa">
          <Foto :src="p.foto" :nome="p.nome" :tam="46" />
          <span class="txt"><b>{{ p.nome }}</b><small>{{ [p.partido, p.uf].filter(Boolean).join(' · ') || '—' }}<template v-if="p.situacao === 'suplente'"> · suplente</template></small></span>
        </RouterLink>
      </div>
      <p v-if="filtro && !filtradas.length" class="muted pequeno">Ninguém com "{{ filtro }}".</p>
      <button v-if="!filtro && !todos && filtradas.length > 12" class="btn btn-sm mais" type="button" @click="todos = true">Ver todos os {{ filtradas.length }}</button>
    </template>
  </div>
</template>

<style scoped>
.filtro { max-width: 340px; margin-bottom: 10px; }
.filtro .campo { min-height: 40px; }
.grade { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr)); }
.pessoa { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 16px; border: 1px solid var(--border); background: var(--bg-elev); color: var(--text); text-decoration: none; transition: border-color .15s, transform .15s; }
.pessoa:hover { border-color: var(--accent); }
.txt { display: grid; min-width: 0; }
.txt b { font-weight: 600; font-size: .94rem; line-height: 1.3; }
.txt small { color: var(--muted); font-size: .78rem; }
.mais { margin-top: 10px; }
</style>
