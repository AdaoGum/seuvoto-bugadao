<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { pegar } from '../lib/api'
import { dataBR, num, titulo } from '../lib/formato'

titulo('Como funciona')
interface Saude { execucoes: { fim: string | null }[]; contas: Record<string, number>; politicos: { casa_id: string; ativos: number; com_resumo: number }[] }
const saude = ref<Saude | null>(null)
pegar<Saude>('/saude').then((s) => (saude.value = s)).catch(() => {})
const FONTES = [
  ['Câmara dos Deputados', 'https://dadosabertos.camara.leg.br/', 'votos, presença nas sessões, projetos e cota parlamentar'],
  ['Senado Federal', 'https://legis.senado.leg.br/dadosabertos/docs/', 'votos com o motivo de cada ausência, projetos e cota (CEAPS)'],
  ['SAPL / Interlegis', 'https://www12.senado.leg.br/interlegis/produtos/sapl', 'sistema aberto usado por Assembleias e milhares de câmaras'],
  ['Querido Diário', 'https://queridodiario.ok.org.br/', 'as 5.570 cidades e os diários oficiais municipais'],
  ['TSE', 'https://dadosabertos.tse.jus.br/', 'candidatos, bens, doações e propostas de governo (em breve)'],
  ['Portal da Transparência', 'https://portaldatransparencia.gov.br/', 'emendas parlamentares (em breve)'],
]
</script>

<template>
  <div class="wrap texto">
    <header class="cab">
      <p class="rotulo">Como funciona</p>
      <h1>Dados oficiais, sem opinião</h1>
    </header>

    <section>
      <h2>O que mostramos</h2>
      <p>Para cada pessoa: presença nas sessões, como votou, os projetos e pedidos que apresentou e quanto gastou do gabinete. Tudo vem das fontes oficiais, com o link de cada uma, e é atualizado sozinho, várias vezes por dia.</p>
      <p>Não damos nota, não fazemos ranking e não recomendamos ninguém. A média da casa aparece só para dar contexto.</p>
    </section>

    <section>
      <h2>Quando não tem</h2>
      <p>Todos os cargos de todo lugar aparecem, mesmo quando não há dado. Nesse caso dizemos qual casa não publica o quê, e quando conferimos. "Não publica" quer dizer que não achamos em formato aberto: o dado pode existir em página, PDF ou por pedido via Lei de Acesso à Informação.</p>
      <p><RouterLink to="/cobertura">Veja o que cada lugar publica</RouterLink>.</p>
    </section>

    <section>
      <h2>Falta nem sempre é falta</h2>
      <p>No Senado, cada ausência vem com o motivo (licença, missão oficial, atividade parlamentar ou "não compareceu"), e mostramos separado. Na Câmara e nas casas com SAPL, a fonte só diz se a pessoa registrou presença: licença e missão oficial contam como ausência. Por isso escrevemos "registrou presença", não "faltou".</p>
    </section>

    <section>
      <h2>De onde vêm os dados</h2>
      <ul class="fontes">
        <li v-for="[n, u, o] in FONTES" :key="n"><a :href="u" target="_blank" rel="noopener">{{ n }}</a> <span class="muted">· {{ o }}</span></li>
      </ul>
    </section>

    <section>
      <h2>Privacidade</h2>
      <p>Não tem cadastro. A cidade que você escolhe e a sua cola ficam só no seu aparelho. Não guardamos CPF nem dado pessoal de ninguém além do que a própria casa publica sobre o mandato.</p>
    </section>

    <section v-if="saude" class="cartao coleta">
      <h2>A coleta agora</h2>
      <p class="muted pequeno">Última rodada: {{ saude.execucoes[0]?.fim ? `${dataBR(saude.execucoes[0].fim)} ${saude.execucoes[0].fim.slice(11, 16)} (UTC)` : 'ainda não rodou' }}.</p>
      <p class="pequeno">{{ num(saude.contas.votacoes ?? 0) }} votações, {{ num(saude.contas.votos ?? 0) }} votos e {{ num(saude.contas.sessoes ?? 0) }} sessões guardados;
        {{ num(saude.politicos.reduce((s, p) => s + p.com_resumo, 0)) }} fichas prontas; {{ num(saude.contas.casas_sapl ?? 0) }} casas com SAPL conhecidas.</p>
    </section>
  </div>
</template>

<style scoped>
.texto { max-width: 760px; }
.cab { padding: 32px 0 8px; display: grid; gap: 6px; }
.cab h1 { font-size: clamp(1.7rem, 4.4vw, 2.4rem); }
section { margin-top: 22px; display: grid; gap: 8px; }
section h2 { font-size: 1.15rem; }
.fontes { margin: 0; padding-left: 20px; display: grid; gap: 6px; }
.coleta { margin-top: 28px; }
</style>
