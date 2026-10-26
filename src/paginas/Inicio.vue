<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ASSEMBLEIAS, CAMARAS_CAPITAIS, UFS } from '../../shared/cobertura'
import Busca from '../components/Busca.vue'
import Icone from '../components/Icone.vue'
import { onde } from '../lib/guardado'
import { titulo } from '../lib/formato'

titulo('')
const router = useRouter()
const uf = ref('')
function irEstado() {
  const u = UFS.find((x) => x.uf === uf.value)
  if (!u) return
  onde.atual = { ibge: u.ibge, nome: u.capital, uf: u.uf }
  router.push(`/lugar/${u.ibge}`)
}
// Números do levantamento, para mostrar logo de cara que nem todo lugar publica tudo.
const alVotos = Object.values(ASSEMBLEIAS).filter((a) => a.votos === 'sim').length
const capVotos = Object.values(CAMARAS_CAPITAIS).filter((a) => a.votos === 'sim').length
</script>

<template>
  <div class="wrap">
    <section class="hero">
      <p class="rotulo">Votos · presença · projetos · gastos</p>
      <h1>Quem representa você, e <em>o que fez</em> com o seu voto.</h1>
      <p class="sub">Senadores, deputados e vereadores, com os dados das fontes oficiais e o link de cada uma. Quando um lugar não publica algum dado, a gente avisa.</p>
      <div class="entrada">
        <Busca grande autofoco />
        <div class="ou">
          <label for="uf" class="muted pequeno">ou escolha o estado</label>
          <select id="uf" v-model="uf" class="campo" @change="irEstado">
            <option value="" disabled>Estado…</option>
            <option v-for="u in UFS" :key="u.uf" :value="u.uf">{{ u.nome }}</option>
          </select>
        </div>
      </div>
      <RouterLink v-if="onde.atual" :to="`/lugar/${onde.atual.ibge}`" class="continuar">
        <Icone nome="lugar" />
        <span><small class="muted">Continuar de onde parou</small><b>{{ onde.atual.nome }} · {{ onde.atual.uf }}</b></span>
        <Icone nome="seta" />
      </RouterLink>
    </section>

    <section class="passos" aria-label="Como funciona">
      <div class="passo"><span class="n">1</span><h2>Diga onde vota</h2><p>Sua cidade mostra os sete cargos em que você vota, do vereador ao presidente.</p></div>
      <div class="passo"><span class="n">2</span><h2>Veja o que cada um fez</h2><p>Presença nas sessões, como votou, o que propôs e quanto gastou do gabinete.</p></div>
      <div class="passo"><span class="n">3</span><h2>Monte sua cola</h2><p>Os números dos seus candidatos num cartão para imprimir. Celular não entra na cabine.</p></div>
    </section>

    <section class="cartao aviso">
      <div>
        <h2>Nem todo lugar publica tudo</h2>
        <p class="muted">Câmara e Senado publicam quase tudo em dados abertos. Já das 27 Assembleias, só {{ alVotos }} publicam os votos de cada deputado, e das 26 câmaras de capital, {{ capVotos }}. A gente mostra o que existe e diz o que falta, lugar por lugar.</p>
      </div>
      <RouterLink to="/cobertura" class="btn">Ver o que cada lugar publica <Icone nome="seta" /></RouterLink>
    </section>
  </div>
</template>

<style scoped>
.hero { padding: 48px 0 28px; max-width: 760px; }
.hero h1 { font-size: clamp(2rem, 5.4vw, 3.2rem); letter-spacing: -.03em; margin-top: 10px; }
.hero h1 em { font-style: normal; color: var(--accent); }
.sub { margin-top: 14px; font-size: 1.1rem; color: var(--muted); max-width: 60ch; }
.entrada { margin-top: 26px; display: grid; gap: 14px; }
.ou { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.ou .campo { width: auto; min-width: 220px; }
.continuar { margin-top: 18px; display: inline-flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 16px; border: 1px solid var(--border); background: var(--bg-elev); text-decoration: none; color: var(--text); }
.continuar:hover { border-color: var(--accent); }
.continuar span { display: grid; }
.continuar svg { width: 20px; height: 20px; color: var(--accent); }
.passos { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); margin: 24px 0; }
.passo { padding: 18px; border-radius: var(--radius-xl); background: var(--surface); border: 1px solid var(--border); }
.passo .n { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 10px; background: var(--accent); color: var(--on-accent); font: 700 .9rem/1 var(--font-display); }
.passo h2 { font-size: 1.05rem; margin: 12px 0 6px; }
.passo p { color: var(--muted); font-size: .94rem; }
.aviso { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between; }
.aviso > div { max-width: 64ch; display: grid; gap: 6px; }
.aviso h2 { font-size: 1.15rem; }
.aviso .btn svg { width: 16px; height: 16px; }
</style>
