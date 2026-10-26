<script setup lang="ts">
// Um campo só para cidade ou político. Setas e Enter escolhem; Esc fecha.
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { Busca } from '../../shared/tipos'
import { pegar } from '../lib/api'
import { onde } from '../lib/guardado'
import { urlPessoa } from '../lib/formato'
import Foto from './Foto.vue'
import Icone from './Icone.vue'

const props = defineProps<{ compacta?: boolean; autofoco?: boolean; grande?: boolean }>()
const emit = defineEmits<{ escolheu: [] }>()
const router = useRouter()
const texto = ref('')
const res = ref<Busca>({ municipios: [], pessoas: [] })
const aberta = ref(false)
const ativo = ref(0)
const carregando = ref(false)
const campo = ref<HTMLInputElement>()
const id = `busca-${Math.random().toString(36).slice(2, 7)}`

const CARGO: Record<string, string> = { senador: 'Senador', depfed: 'Dep. federal', depest: 'Dep. estadual', vereador: 'Vereador' }
const opcoes = computed(() => [
  ...res.value.municipios.map((m) => ({ tipo: 'cidade' as const, chave: m.ibge, titulo: m.nome, sub: m.uf, ir: () => irCidade(m) })),
  ...res.value.pessoas.map((p) => ({ tipo: 'pessoa' as const, chave: p.id, titulo: p.nome, sub: [CARGO[p.cargo], p.partido, p.uf].filter(Boolean).join(' · '), foto: p.foto, ir: () => router.push(urlPessoa(p.id)) })),
])

let timer: ReturnType<typeof setTimeout> | undefined
let pedido = 0
watch(texto, (t) => {
  clearTimeout(timer)
  if (t.trim().length < 2) { res.value = { municipios: [], pessoas: [] }; return }
  timer = setTimeout(async () => {
    const meu = ++pedido
    carregando.value = true
    try {
      const r = await pegar<Busca>(`/busca?q=${encodeURIComponent(t.trim())}`)
      if (meu === pedido) { res.value = r; ativo.value = 0; aberta.value = true }
    } catch { /* busca falhou: só não mostra nada */ } finally { if (meu === pedido) carregando.value = false }
  }, 200)
})

function irCidade(m: { ibge: string; nome: string; uf: string }) {
  onde.atual = m
  router.push(`/lugar/${m.ibge}`)
}
function escolher(i: number) {
  const o = opcoes.value[i]
  if (!o) return
  o.ir()
  texto.value = ''
  aberta.value = false
  emit('escolheu')
}
function tecla(e: KeyboardEvent) {
  const n = opcoes.value.length
  if (e.key === 'ArrowDown' && n) { e.preventDefault(); aberta.value = true; ativo.value = (ativo.value + 1) % n }
  else if (e.key === 'ArrowUp' && n) { e.preventDefault(); ativo.value = (ativo.value - 1 + n) % n }
  else if (e.key === 'Enter' && aberta.value && n) { e.preventDefault(); escolher(ativo.value) }
  else if (e.key === 'Escape') aberta.value = false
}
onMounted(() => { if (props.autofoco) campo.value?.focus() })
const vazio = computed(() => aberta.value && !carregando.value && texto.value.trim().length >= 2 && !opcoes.value.length)
</script>

<template>
  <div class="busca" :class="{ compacta, grande }" @focusout="(e) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) aberta = false }">
    <label :for="id" class="sr-only">Buscar cidade ou político</label>
    <div class="campo-busca">
      <Icone nome="busca" />
      <input :id="id" ref="campo" v-model="texto" type="search" autocomplete="off" spellcheck="false"
        :placeholder="compacta ? 'Cidade ou político' : 'Digite sua cidade ou o nome de um político'"
        role="combobox" :aria-expanded="aberta && opcoes.length > 0" :aria-controls="`${id}-lista`" aria-autocomplete="list"
        :aria-activedescendant="aberta && opcoes.length ? `${id}-${ativo}` : undefined"
        @keydown="tecla" @focus="aberta = opcoes.length > 0" />
      <span v-if="carregando" class="carregando pequeno" aria-hidden="true"></span>
    </div>
    <ul v-show="aberta && opcoes.length" :id="`${id}-lista`" class="opcoes" role="listbox">
      <template v-for="(o, i) in opcoes" :key="o.chave">
        <li v-if="i === 0 && o.tipo === 'cidade'" class="grupo" role="presentation">Cidades</li>
        <li v-if="o.tipo === 'pessoa' && (i === 0 || opcoes[i - 1].tipo === 'cidade')" class="grupo" role="presentation">Políticos</li>
        <li :id="`${id}-${i}`" role="option" :aria-selected="i === ativo" class="opcao" :class="{ ativo: i === ativo }" @mousedown.prevent="escolher(i)" @mousemove="ativo = i">
          <Foto v-if="o.tipo === 'pessoa'" :src="o.foto" :nome="o.titulo" :tam="34" />
          <span v-else class="pino"><Icone nome="lugar" /></span>
          <span class="txt"><b>{{ o.titulo }}</b><small>{{ o.sub }}</small></span>
        </li>
      </template>
    </ul>
    <p v-if="vazio" class="vazio pequeno muted">Nada com "{{ texto }}". Tente o nome da cidade sem abreviar, ou parte do nome do político.</p>
  </div>
</template>

<style scoped>
.busca { position: relative; }
.campo-busca { display: flex; align-items: center; gap: 10px; padding: 0 14px; min-height: 52px; border: 1px solid var(--border-strong); border-radius: 16px; background: var(--bg-elev); }
.campo-busca:focus-within { outline: 2px solid var(--accent); outline-offset: 1px; }
.campo-busca svg { width: 20px; height: 20px; color: var(--muted); flex: none; }
.campo-busca input { flex: 1; min-width: 0; border: 0; background: transparent; outline: none; font-size: 1.02rem; padding: 12px 0; }
.compacta .campo-busca { min-height: 40px; border-radius: 12px; }
.compacta input { font-size: .92rem; padding: 7px 0; }
.grande .campo-busca { min-height: 62px; border-radius: 20px; box-shadow: var(--shadow); }
.grande input { font-size: 1.1rem; }
.opcoes { position: absolute; left: 0; right: 0; top: calc(100% + 6px); z-index: 30; list-style: none; margin: 0; padding: 6px; background: var(--bg-elev); border: 1px solid var(--border-strong); border-radius: 16px; box-shadow: var(--shadow); max-height: min(70vh, 460px); overflow: auto; }
.grupo { font: 600 .68rem/1 var(--font-mono); text-transform: uppercase; letter-spacing: .06em; color: var(--muted); padding: 10px 10px 6px; }
.opcao { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 12px; cursor: pointer; }
.opcao.ativo { background: var(--accent-soft); }
.pino { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: var(--surface); color: var(--accent); flex: none; }
.pino svg { width: 18px; height: 18px; }
.txt { display: grid; min-width: 0; }
.txt b { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.txt small { color: var(--muted); font-size: .8rem; }
.vazio { margin-top: 8px; }
</style>
