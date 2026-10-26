<script setup lang="ts">
import { computed, ref } from 'vue'
import { normalizar } from '../../shared/logica'
import type { LinhaCobertura } from '../../shared/tipos'
import Icone from '../components/Icone.vue'
import Selo from '../components/Selo.vue'
import { pegar } from '../lib/api'
import { titulo } from '../lib/formato'

titulo('O que cada lugar publica')
const linhas = ref<LinhaCobertura[] | null>(null)
const erro = ref('')
const filtro = ref('')
pegar<LinhaCobertura[]>('/cobertura').then((l) => (linhas.value = l)).catch((e) => (erro.value = e.message))
const visiveis = computed(() => (linhas.value ?? []).filter((l) => !filtro.value || normalizar(`${l.uf} ${l.ufNome} ${l.capital.nome}`).includes(normalizar(filtro.value))))
const contagem = computed(() => {
  const l = linhas.value ?? []
  const n = (f: (x: LinhaCobertura) => boolean) => l.filter(f).length
  return {
    votos: n((x) => x.assembleia.itens.find((i) => i.chave === 'votos')?.status === 'sim'),
    presenca: n((x) => x.assembleia.itens.find((i) => i.chave === 'presenca')?.status === 'sim'),
    interior: l.reduce((s, x) => s + x.interior.comSapl, 0),
  }
})
</script>

<template>
  <div class="wrap">
    <header class="cab">
      <p class="rotulo">Transparência</p>
      <h1>O que cada lugar publica</h1>
      <p class="muted">Câmara dos Deputados e Senado publicam votos, presença, projetos e gastos em dados abertos. Nas Assembleias e câmaras, depende de cada uma. Aqui está o retrato, estado por estado.</p>
    </header>

    <div v-if="linhas" class="destaques">
      <div class="numero"><b>{{ contagem.votos }} de 27</b><span>Assembleias publicam os votos de cada deputado</span></div>
      <div class="numero"><b>{{ contagem.presenca }} de 27</b><span>publicam a presença</span></div>
      <div class="numero"><b>{{ contagem.interior.toLocaleString('pt-BR') }}</b><span>câmaras do interior com o sistema aberto do Interlegis, já encontradas</span></div>
    </div>

    <div class="legenda pequeno">
      <Selo status="sim" /><Selo status="parcial" rotulo="Em parte (página, PDF ou dado antigo)" /><Selo status="nao" rotulo="Não publica em formato aberto" /><Selo status="naosei" rotulo="Não deu para verificar" />
    </div>

    <label class="sr-only" for="f-uf">Filtrar estado</label>
    <input id="f-uf" v-model="filtro" class="campo filtro" type="search" placeholder="Filtrar estado ou capital" />

    <p v-if="erro" class="muted">{{ erro }}</p>
    <div v-else-if="!linhas" class="esqueleto" style="height: 400px"></div>
    <div v-else class="tabela-wrap">
      <table class="tabela">
        <thead>
          <tr><th scope="col">Estado</th><th scope="col">Assembleia Legislativa</th><th scope="col">Câmara da capital</th><th scope="col">Interior</th></tr>
        </thead>
        <tbody>
          <tr v-for="l in visiveis" :key="l.uf">
            <th scope="row"><b>{{ l.uf }}</b><span class="muted pequeno">{{ l.ufNome }}</span></th>
            <td>
              <a :href="l.assembleia.url" target="_blank" rel="noopener" class="casa">{{ l.assembleia.sigla }} <Icone nome="link" class="ic" /></a>
              <span class="acesso muted">{{ l.assembleia.acesso }}</span>
              <ul class="itens"><li v-for="i in l.assembleia.itens" :key="i.chave" :title="i.nota"><span>{{ i.nome }}</span><Selo :status="i.status" /></li></ul>
            </td>
            <td>
              <template v-if="l.capital.itens.length">
                <a :href="l.capital.url" target="_blank" rel="noopener" class="casa">{{ l.capital.nome }} <Icone nome="link" class="ic" /></a>
                <span class="acesso muted">{{ l.capital.acesso }}</span>
                <ul class="itens"><li v-for="i in l.capital.itens" :key="i.chave" :title="i.nota"><span>{{ i.nome }}</span><Selo :status="i.status" /></li></ul>
              </template>
              <span v-else class="muted pequeno">{{ l.capital.nome }}</span>
            </td>
            <td class="interior">
              <template v-if="l.uf !== 'DF'"><b>{{ l.interior.comSapl.toLocaleString('pt-BR') }}</b> com SAPL<br /><span class="muted pequeno">{{ l.interior.comDados.toLocaleString('pt-BR') }} com votos ou presença em dia</span></template>
              <span v-else class="muted pequeno">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="muted pequeno rodape-t">Levantamento manual de 23/10/2026, site por site; as casas com SAPL são medidas de novo pelo coletor a cada poucos dias. "Não publica" quer dizer que não achamos em formato aberto: pode existir em página, PDF ou por pedido via Lei de Acesso à Informação.</p>
  </div>
</template>

<style scoped>
.cab { padding: 32px 0 14px; max-width: 70ch; display: grid; gap: 6px; }
.cab h1 { font-size: clamp(1.7rem, 4.4vw, 2.4rem); }
.destaques { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); margin: 6px 0 16px; }
.numero { padding: 16px; border-radius: var(--radius-xl); border: 1px solid var(--border); background: var(--bg-elev); display: grid; gap: 4px; }
.numero b { font: 800 1.7rem/1.1 var(--font-display); }
.numero span { color: var(--muted); font-size: .9rem; }
.legenda { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-bottom: 12px; }
.filtro { max-width: 340px; margin-bottom: 12px; }
.tabela-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius-xl); background: var(--bg-elev); }
.tabela { width: 100%; border-collapse: collapse; min-width: 760px; }
.tabela th, .tabela td { text-align: left; vertical-align: top; padding: 12px 14px; border-top: 1px solid var(--border); }
.tabela thead th { border-top: 0; font: 600 .72rem/1.3 var(--font-mono); text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
.tabela tbody th { display: grid; gap: 2px; width: 110px; }
.casa { font-weight: 700; text-decoration: none; }
.ic { width: 12px; height: 12px; vertical-align: -1px; }
.acesso { display: block; font-size: .8rem; margin-bottom: 6px; }
.itens { list-style: none; margin: 0; padding: 0; display: grid; gap: 3px; }
.itens li { display: flex; justify-content: space-between; gap: 10px; font-size: .84rem; }
.interior { width: 170px; }
.rodape-t { margin-top: 12px; max-width: 80ch; }
</style>
