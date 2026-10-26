<script setup lang="ts">
// Um cargo: em uma linha o que dá para ver aqui; o detalhe (e a fonte) abre sob pedido.
import { computed, ref } from 'vue'
import type { CargoLugar } from '../../shared/tipos'
import { dataBR } from '../lib/formato'
import Icone from './Icone.vue'
import ListaPessoas from './ListaPessoas.vue'
import Selo from './Selo.vue'

const props = defineProps<{ c: CargoLugar; uf: string; municipio: string | null }>()
const detalhes = ref(false)
const legislativo = computed(() => !!props.c.casa || props.c.cargo === 'vereador')
const tem = computed(() => props.c.itens.filter((i) => i.status === 'sim' && i.chave !== 'tse').map((i) => i.nome.toLowerCase()))
const falta = computed(() => props.c.itens.filter((i) => i.status === 'nao').map((i) => i.nome.toLowerCase()))
const lista = (l: string[]) => (l.length <= 1 ? l.join('') : `${l.slice(0, -1).join(', ')} e ${l.at(-1)}`)
const federalPorUf = computed(() => props.c.cargo === 'senador' || props.c.cargo === 'depfed')
</script>

<template>
  <article class="cargo" :id="c.cargo">
    <header class="cab">
      <div>
        <h3>{{ c.nome }}</h3>
        <p class="muted pequeno">
          <template v-if="c.casa">{{ c.casa.nome }}<template v-if="c.quantos"> · {{ c.quantos }}</template></template>
          <template v-else-if="c.coleta === 'nao_se_aplica'">{{ c.cargo === 'presidente' ? 'Governo federal' : c.cargo === 'governador' ? 'Governo do estado' : 'Prefeitura' }}</template>
        </p>
      </div>
      <button v-if="c.itens.length" class="btn btn-sm btn-ghost" type="button" :aria-expanded="detalhes" @click="detalhes = !detalhes">
        <Icone nome="info" /> {{ detalhes ? 'Fechar detalhes' : 'O que tem aqui' }}
      </button>
    </header>

    <p v-if="legislativo && c.itens.length" class="resumo">
      <template v-if="tem.length">Dá para ver <b>{{ lista(tem) }}</b>.</template>
      <!-- Medido = a casa tem o sistema, mas não lança o dado; levantamento = não publica em formato aberto. -->
      <template v-if="falta.length"> {{ c.casa?.medido ? 'Não tem registrado no sistema da casa' : tem.length ? 'Não publica em formato aberto' : 'Esta casa não publica em formato aberto' }}: {{ lista(falta) }}.</template>
      <template v-if="!tem.length && !falta.length">Não deu para conferir o que esta casa publica<template v-if="c.casa?.nota">: {{ c.casa.nota.replace(/\.$/, '').toLowerCase() }}</template>.</template>
    </p>
    <p v-else-if="!legislativo" class="resumo">Cargo executivo não vota em projetos. A proposta de governo e a ficha do candidato vêm do TSE.</p>

    <ul v-if="detalhes" class="itens">
      <li v-for="i in c.itens" :key="i.chave">
        <span class="nome">{{ i.nome }}</span><Selo :status="i.status" />
        <span v-if="i.nota" class="nota">{{ i.nota }}</span>
      </li>
    </ul>
    <p v-if="detalhes && c.casa" class="fonte pequeno">
      <template v-if="c.casa.acesso">Como publica: {{ c.casa.acesso }}. </template>
      <template v-if="c.casa.nota">{{ c.casa.nota }} </template>
      <template v-if="c.casa.verificado_em">{{ c.casa.medido ? 'Medido' : 'Conferido' }} em {{ dataBR(c.casa.verificado_em) }}. </template>
      <a v-if="c.casa.url" :href="c.casa.url" target="_blank" rel="noopener">Ver na fonte <Icone nome="link" class="ic-link" /></a>
    </p>

    <!-- Quem está no cargo -->
    <div v-if="c.cargo === 'vereador' && c.coleta === 'coletando'" class="estado">
      <span class="carregando">Estamos buscando os vereadores de {{ municipio }} agora</span>
      <p class="muted pequeno">Isso leva alguns minutos. A página atualiza sozinha.</p>
    </div>
    <div v-else-if="c.cargo === 'vereador' && c.coleta === 'sem_sapl'" class="estado">
      <p><b>Não achamos um sistema aberto da câmara de {{ municipio }}.</b> Procuramos no diretório do Interlegis (SAPL) e no endereço de costume.</p>
      <p class="muted pequeno">Muitas câmaras publicam só em página ou PDF. Quando houver um jeito aberto de ler, ela aparece aqui.</p>
    </div>
    <ListaPessoas v-else-if="c.casa && c.pessoas > 0" :casa="c.casa.id" :uf="federalPorUf ? uf : undefined" :total="c.pessoas" />
    <div v-else-if="c.casa && legislativo" class="estado">
      <p v-if="c.casa.acesso?.includes('SAPL')" class="carregando pequeno">Ainda estamos coletando os parlamentares desta casa</p>
      <p v-else class="muted pequeno">{{ c.casa.sigla ?? 'Esta casa' }} não tem uma lista aberta dos parlamentares com a atuação de cada um. Os eleitos vão entrar com os dados do TSE.</p>
    </div>
    <p v-else-if="c.coleta === 'nao_se_aplica' && detalhes" class="muted pequeno estado">Quem ocupa o cargo e a proposta de governo entram com os dados do TSE (em breve).</p>
  </article>
</template>

<style scoped>
.cargo { padding: 18px 0; border-top: 1px solid var(--border); display: grid; gap: 10px; }
.cargo:first-of-type { border-top: 0; padding-top: 4px; }
.cab { display: flex; gap: 12px; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; }
.cab h3 { font-size: 1.12rem; }
.cab .btn svg { width: 16px; height: 16px; }
.resumo { font-size: .98rem; }
.itens { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.itens li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 12px; align-items: center; padding: 8px 0; border-top: 1px dashed var(--border); }
.itens li:first-child { border-top: 0; }
.nome { font-weight: 600; font-size: .92rem; }
.nota { grid-column: 1 / -1; color: var(--muted); font-size: .84rem; }
.fonte { color: var(--muted); }
.ic-link { width: 13px; height: 13px; vertical-align: -2px; }
.estado { padding: 14px; border-radius: 14px; background: var(--surface); border: 1px dashed var(--border-strong); display: grid; gap: 4px; }
</style>
