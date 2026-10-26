<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { rotuloVoto, sentidoVoto } from '../../shared/logica'
import type { Ficha, VotoLinha } from '../../shared/tipos'
import Barras from '../components/Barras.vue'
import Foto from '../components/Foto.vue'
import Icone from '../components/Icone.vue'
import Medidor from '../components/Medidor.vue'
import { pegar } from '../lib/api'
import { cargoDaCola, cola, porNaCola } from '../lib/guardado'
import { dataBR, idDaUrl, mesAno, num, pct, reais, titulo } from '../lib/formato'

const rota = useRoute()
const f = ref<Ficha | null>(null)
const erro = ref('')
const id = computed(() => idDaUrl(String(rota.params.id)))

// Votos: filtro e "carregar mais"
const filtro = ref<'' | 'sim' | 'nao' | 'ausente'>('')
const lista = ref<VotoLinha[]>([])
const mais = ref(false)
const carregandoVotos = ref(false)

watch(id, async () => {
  f.value = null; erro.value = ''; filtro.value = ''
  try {
    f.value = await pegar<Ficha>(`/p/${id.value}`)
    lista.value = f.value.votos?.recentes ?? []
    mais.value = !!f.value.votos?.mais
    titulo(f.value.pessoa.nome)
  } catch (e) { erro.value = (e as Error).message }
}, { immediate: true })

async function buscarVotos(novo: boolean) {
  carregandoVotos.value = true
  try {
    const antes = novo ? '' : lista.value.at(-1)?.data ?? ''
    const r = await pegar<{ votos: VotoLinha[]; mais: boolean }>(`/p/${id.value}/votos?filtro=${filtro.value}${antes ? `&antes=${antes}` : ''}`)
    lista.value = novo ? r.votos : [...lista.value, ...r.votos]
    mais.value = r.mais
  } finally { carregandoVotos.value = false }
}
watch(filtro, () => buscarVotos(true))

const federal = computed(() => f.value?.pessoa.casa_id === 'camara' || f.value?.pessoa.casa_id === 'senado')
const presencaPct = computed(() => (f.value?.presenca ? pct(f.value.presenca.presente, f.value.presenca.total) : null))

// Cola
const cargoCola = computed(() => (f.value ? cargoDaCola(f.value.pessoa.cargo) : null))
const resumoCola = computed(() => {
  const x = f.value
  if (!x) return ''
  const partes: string[] = []
  if (x.presenca) partes.push(`presença ${pct(x.presenca.presente, x.presenca.total)}% (${x.presenca.tipo === 'sessoes' ? 'sessões' : 'votações'})`)
  const pl = x.projetos?.porTipo.find(([t]) => t === 'Projetos de lei')?.[1]
  if (x.projetos) partes.push(pl != null ? `${num(pl)} projetos de lei` : `${num(x.projetos.total)} matérias`)
  if (x.gastos) partes.push(`${reais(x.gastos.total, true)} de gabinete em ${x.gastos.ano}`)
  return partes.join(' · ')
})
const naMinhaCola = computed(() => !!cargoCola.value && cola[cargoCola.value].id === f.value?.pessoa.id)
function pro() {
  if (!f.value || !cargoCola.value) return
  porNaCola(cargoCola.value, { nome: f.value.pessoa.nome, partido: f.value.pessoa.partido ?? '', resumo: resumoCola.value, id: f.value.pessoa.id })
}
const copiado = ref(false)
async function compartilhar() {
  const url = location.href
  if (navigator.share) { try { await navigator.share({ title: f.value?.pessoa.nome, url }); return } catch { /* cancelou */ } }
  try { await navigator.clipboard.writeText(url); copiado.value = true; setTimeout(() => (copiado.value = false), 2000) } catch { /* sem área de transferência */ }
}
</script>

<template>
  <div class="wrap">
    <p v-if="erro" class="cartao erro">{{ erro }} <RouterLink to="/">Voltar ao início</RouterLink></p>
    <template v-else-if="f">
      <header class="cab">
        <Foto :src="f.pessoa.foto" :nome="f.pessoa.nome" :tam="104" />
        <div class="quem">
          <p class="rotulo">{{ f.pessoa.cargoNome }}<template v-if="f.pessoa.situacao === 'suplente'"> · suplente</template></p>
          <h1>{{ f.pessoa.nome }}</h1>
          <p class="muted">{{ [f.pessoa.partido, f.pessoa.uf].filter(Boolean).join(' · ') }} · {{ f.pessoa.casa }}<template v-if="f.pessoa.desde"> · no mandato desde {{ mesAno(f.pessoa.desde) }}</template></p>
          <div class="acoes">
            <button v-if="cargoCola" class="btn btn-sm" :class="{ 'btn-go': !naMinhaCola }" type="button" @click="pro"><Icone nome="cola" /> {{ naMinhaCola ? 'Está na sua cola' : 'Pôr na minha cola' }}</button>
            <button class="btn btn-sm" type="button" @click="compartilhar"><Icone nome="compartilhar" /> {{ copiado ? 'Link copiado' : 'Compartilhar' }}</button>
            <a v-if="f.pessoa.pagina" class="btn btn-sm btn-ghost" :href="f.pessoa.pagina" target="_blank" rel="noopener"><Icone nome="link" /> Página oficial</a>
          </div>
        </div>
      </header>

      <p v-if="f.coletando" class="cartao aviso carregando">Ainda estamos coletando os dados desta pessoa. Volte em alguns minutos</p>

      <!-- Resumo em números: o primeiro olhar -->
      <section class="resumo" aria-label="Resumo">
        <div v-if="f.presenca" class="numero"><span class="rotulo">Presença</span><b>{{ presencaPct }}%</b>
          <small>{{ num(f.presenca.presente) }} de {{ num(f.presenca.total) }} {{ f.presenca.tipo === 'sessoes' ? 'sessões' : 'votações' }}<template v-if="f.presenca.mediaCasa != null"> · média da casa {{ Math.round(f.presenca.mediaCasa * 100) }}%</template></small></div>
        <div v-if="f.projetos" class="numero"><span class="rotulo">Projetos e pedidos</span><b>{{ num(f.projetos.total) }}</b><small>desde {{ mesAno(f.projetos.desde) }}</small></div>
        <div v-if="f.gastos" class="numero"><span class="rotulo">Gastos do gabinete</span><b>{{ reais(f.gastos.total, true) }}</b><small>em {{ f.gastos.ano }}, {{ num(f.gastos.notas) }} notas</small></div>
        <div v-if="f.votos?.total" class="numero"><span class="rotulo">Votos registrados</span><b>{{ num(f.votos.total) }}</b><small v-if="f.votos.nominais">de {{ num(f.votos.nominais) }} votações nominais</small><small v-else>nesta legislatura</small></div>
      </section>

      <div class="colunas">
        <div class="principal">
          <section v-if="f.presenca" class="cartao bloco">
            <div class="secao-t"><h2>Presença</h2><span class="muted pequeno">desde {{ dataBR(f.presenca.desde) }}</span></div>
            <Medidor :parte="f.presenca.presente" :total="f.presenca.total" :media="f.presenca.mediaCasa" />
            <ul v-if="f.presenca.detalhe" class="detalhe">
              <li><span>Votou</span><b>{{ num(f.presenca.detalhe.votou) }}</b></li>
              <li><span>Estava, mas não votou</span><b>{{ num(f.presenca.detalhe.presente) }}</b></li>
              <li><span>Ausência justificada <small class="muted">(licença, missão, atividade parlamentar)</small></span><b>{{ num(f.presenca.detalhe.justificada) }}</b></li>
              <li><span>Não compareceu, sem justificativa</span><b>{{ num(f.presenca.detalhe.falta) }}</b></li>
              <li v-if="f.presenca.detalhe.outro"><span>Outros registros</span><b>{{ num(f.presenca.detalhe.outro) }}</b></li>
            </ul>
            <p class="nota">{{ f.presenca.nota }}</p>
          </section>

          <section v-if="f.votos" class="cartao bloco">
            <div class="secao-t"><h2>Como votou</h2></div>
            <div v-if="f.votos.porVoto.length" class="contas">
              <span v-for="[v, n] in f.votos.porVoto" :key="v" class="conta"><b>{{ num(n) }}</b> {{ rotuloVoto(v) }}</span>
            </div>
            <template v-if="federal">
              <div class="chips filtros" role="group" aria-label="Filtrar votos">
                <button v-for="[k, t] in ([['', 'Todos'], ['sim', 'Sim'], ['nao', 'Não'], ['ausente', 'Sem voto']] as const)" :key="k" type="button" class="chip" :aria-pressed="filtro === k" @click="filtro = k">{{ t }}</button>
              </div>
              <ul class="votos">
                <li v-for="(v, i) in lista" :key="i">
                  <div class="v-txt">
                    <span class="v-data mono">{{ dataBR(v.data) }}</span>
                    <b v-if="v.titulo">{{ v.titulo }}</b>
                    <span class="v-desc">{{ v.descricao }}</span>
                    <a v-if="v.url" :href="v.url" target="_blank" rel="noopener" class="pequeno">ver na fonte</a>
                  </div>
                  <span class="voto" :class="sentidoVoto(v.voto)">{{ rotuloVoto(v.voto) }}</span>
                </li>
              </ul>
              <p v-if="!lista.length && !carregandoVotos" class="muted pequeno">Nenhuma votação com esse filtro.</p>
              <button v-if="mais" class="btn btn-sm" type="button" :disabled="carregandoVotos" @click="buscarVotos(false)">{{ carregandoVotos ? 'Carregando…' : 'Ver mais votações' }}</button>
            </template>
            <p v-if="f.votos.nota" class="nota">{{ f.votos.nota }}</p>
          </section>

          <section v-if="f.projetos" class="cartao bloco">
            <div class="secao-t"><h2>Projetos e pedidos</h2><span class="muted pequeno">desde {{ mesAno(f.projetos.desde) }}</span></div>
            <Barras v-if="f.projetos.porTipo.length" :itens="f.projetos.porTipo" rotulo="Projetos e pedidos por tipo" />
            <p v-else class="muted">Nenhum registrado no período.</p>
            <p class="nota">{{ f.projetos.nota }} Toque no "?" para saber o que é cada tipo.</p>
          </section>

          <section v-if="f.gastos" class="cartao bloco">
            <div class="secao-t"><h2>Gastos do gabinete</h2><span class="muted pequeno">{{ f.gastos.ano }}</span></div>
            <p class="grande">{{ reais(f.gastos.total) }} <small class="muted">em {{ num(f.gastos.notas) }} notas</small></p>
            <Barras :itens="f.gastos.categorias" formato="reais" rotulo="Gastos por categoria" />
            <p class="nota">Dinheiro da cota para o mandato (passagens, escritório, combustível, divulgação), reembolsado com nota fiscal. Não é salário.</p>
          </section>
        </div>

        <aside class="lado">
          <section v-if="f.faltando.length" class="cartao bloco">
            <h2 class="h-lado">O que não está aqui</h2>
            <ul class="falta">
              <li v-for="x in f.faltando" :key="x.chave"><b>{{ x.titulo }}</b><span>{{ x.motivo }}</span></li>
            </ul>
          </section>
          <section class="cartao bloco">
            <h2 class="h-lado">De onde vêm os dados</h2>
            <ul class="fontes">
              <li v-for="x in f.fontes" :key="x.url"><a :href="x.url" target="_blank" rel="noopener">{{ x.nome }} <Icone nome="link" class="ic" /></a></li>
            </ul>
            <p v-if="f.atualizado_em" class="muted pequeno">Atualizado em {{ dataBR(f.atualizado_em) }}.</p>
            <p class="muted pequeno">Só dados oficiais. Não damos nota nem fazemos ranking.</p>
          </section>
        </aside>
      </div>
    </template>
    <div v-else class="carregando-ficha">
      <div class="esqueleto" style="height: 120px"></div>
      <div class="esqueleto" style="height: 100px"></div>
      <div class="esqueleto" style="height: 300px"></div>
    </div>
  </div>
</template>

<style scoped>
.cab { display: flex; gap: 20px; align-items: center; padding: 32px 0 18px; flex-wrap: wrap; }
.quem { flex: 1; min-width: 240px; display: grid; gap: 4px; }
.quem h1 { font-size: clamp(1.6rem, 4.4vw, 2.4rem); }
.acoes { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.aviso { margin-bottom: 14px; }
.resumo { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); margin-bottom: 16px; }
.numero { padding: 16px; border-radius: var(--radius-xl); background: var(--bg-elev); border: 1px solid var(--border); display: grid; gap: 4px; }
.numero b { font: 800 2rem/1.1 var(--font-display); letter-spacing: -.02em; }
.numero small { color: var(--muted); font-size: .82rem; }
.colunas { display: grid; gap: 16px; grid-template-columns: 1fr; }
@media (min-width: 960px) { .colunas { grid-template-columns: minmax(0, 1fr) 320px; align-items: start; } .lado { position: sticky; top: calc(var(--topo-h) + 14px); } }
.principal, .lado { display: grid; gap: 16px; }
.bloco { display: grid; gap: 12px; }
.nota { color: var(--muted); font-size: .86rem; }
.detalhe { list-style: none; margin: 0; padding: 0; }
.detalhe li { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-top: 1px solid var(--border); font-size: .94rem; }
.detalhe b { font-family: var(--font-mono); }
.contas { display: flex; flex-wrap: wrap; gap: 8px; }
.conta { padding: 6px 10px; border-radius: 10px; background: var(--surface); border: 1px solid var(--border); font-size: .86rem; }
.filtros { margin-top: 2px; }
.votos { list-style: none; margin: 0; padding: 0; }
.votos li { display: flex; gap: 14px; justify-content: space-between; align-items: flex-start; padding: 12px 0; border-top: 1px solid var(--border); }
.v-txt { display: grid; gap: 2px; min-width: 0; }
.v-data { font-size: .76rem; color: var(--muted); }
.v-desc { font-size: .9rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.voto { flex: none; font: 700 .8rem/1.2 var(--font-sans); padding: 5px 10px; border-radius: 999px; border: 1px solid var(--border-strong); max-width: 46%; text-align: center; }
.voto.sim { border-color: var(--accent); color: var(--accent); }
.voto.nao { border-color: var(--text); }
.voto.outro { color: var(--muted); border-style: dashed; }
.grande { font: 800 1.6rem/1.2 var(--font-display); }
.grande small { font: 500 .86rem var(--font-sans); }
.h-lado { font-size: 1.02rem; }
.falta { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.falta li { display: grid; gap: 2px; font-size: .9rem; }
.falta span { color: var(--muted); }
.fontes { margin: 0; padding-left: 18px; display: grid; gap: 4px; }
.fontes .ic { width: 13px; height: 13px; vertical-align: -2px; }
.erro { margin-top: 32px; }
.carregando-ficha { display: grid; gap: 14px; padding-top: 32px; }
</style>
