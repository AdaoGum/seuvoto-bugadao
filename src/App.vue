<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import Busca from './components/Busca.vue'
import Icone from './components/Icone.vue'
import { naCola, onde, trocarTema } from './lib/guardado'

const rota = useRoute()
const buscando = ref(false) // busca em tela cheia, no celular
</script>

<template>
  <a class="pular sr-only" href="#conteudo">Pular para o conteúdo</a>
  <header class="topo">
    <div class="wrap topo-in">
      <RouterLink to="/" class="marca" aria-label="Seu Voto, início">
        <svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="gm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#818CF8" /><stop offset="1" stop-color="#4F46E5" /></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(#gm)" /><path d="M27 52l14 14 32-34" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" /></svg>
        <span><b>Seu Voto</b><small>um projeto bugadão</small></span>
      </RouterLink>
      <div v-if="rota.path !== '/'" class="topo-busca"><Busca compacta /></div>
      <span class="espaco"></span>
      <RouterLink v-if="onde.atual" :to="`/lugar/${onde.atual.ibge}`" class="btn btn-sm btn-ghost so-largo" :title="`Seus representantes em ${onde.atual.nome}`">
        <Icone nome="lugar" /> {{ onde.atual.nome }} · {{ onde.atual.uf }}
      </RouterLink>
      <RouterLink to="/cola" class="btn btn-sm so-largo">
        <Icone nome="cola" /> Minha cola <span v-if="naCola" class="bolinha">{{ naCola }}</span>
      </RouterLink>
      <button class="btn btn-sm btn-ghost icone" type="button" title="Trocar tema claro/escuro" aria-label="Trocar tema claro/escuro" @click="trocarTema"><Icone nome="tema" /></button>
    </div>
  </header>

  <main id="conteudo"><RouterView /></main>

  <footer class="rodape">
    <div class="wrap rodape-in">
      <div>
        <p><b>Seu Voto</b> · um projeto <a href="https://bugadao.com" target="_blank" rel="noopener">bugadão</a></p>
        <p class="muted pequeno">Só dados oficiais, sempre com o link da fonte. Não damos nota, não fazemos ranking e não recomendamos candidato. Não pedimos cadastro: a sua cola fica só no seu aparelho.</p>
      </div>
      <nav class="rodape-links" aria-label="Mais">
        <RouterLink to="/como-funciona">Como funciona</RouterLink>
        <RouterLink to="/cobertura">O que cada lugar publica</RouterLink>
        <RouterLink to="/cola">Minha cola</RouterLink>
      </nav>
    </div>
  </footer>

  <!-- Navegação de polegar, no celular -->
  <nav class="barra" aria-label="Navegação">
    <RouterLink to="/" :class="{ on: rota.path === '/' }"><Icone nome="inicio" /><span>Início</span></RouterLink>
    <RouterLink :to="onde.atual ? `/lugar/${onde.atual.ibge}` : '/'" :class="{ on: rota.path.startsWith('/lugar') }"><Icone nome="lugar" /><span>Meu lugar</span></RouterLink>
    <button type="button" :class="{ on: buscando }" @click="buscando = true"><Icone nome="busca" /><span>Buscar</span></button>
    <RouterLink to="/cola" :class="{ on: rota.path === '/cola' }"><Icone nome="cola" /><span>Cola<b v-if="naCola" class="bolinha">{{ naCola }}</b></span></RouterLink>
  </nav>
  <div v-if="buscando" class="busca-cheia" role="dialog" aria-modal="true" aria-label="Buscar">
    <div class="wrap">
      <div class="busca-cheia-topo"><b>Buscar</b><button class="btn btn-sm" type="button" @click="buscando = false">Fechar</button></div>
      <Busca autofoco @escolheu="buscando = false" />
    </div>
  </div>
</template>

<style scoped>
.pular:focus { position: fixed; left: 12px; top: 12px; z-index: 50; width: auto; height: auto; clip: auto; padding: 10px 14px; background: var(--bg-elev); border-radius: 12px; }
.topo { position: sticky; top: 0; z-index: 20; background: color-mix(in srgb, var(--bg) 86%, transparent); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); }
.topo-in { display: flex; align-items: center; gap: 10px; min-height: var(--topo-h); }
.marca { display: flex; align-items: center; gap: 10px; color: var(--text); text-decoration: none; flex: none; }
.marca svg { width: 36px; height: 36px; }
.marca b { display: block; font: 700 1.05rem/1.1 var(--font-display); }
.marca small { display: block; font: 500 .66rem/1.4 var(--font-mono); color: var(--muted); }
.topo-busca { flex: 1; max-width: 460px; margin-left: 12px; }
.espaco { flex: 1; }
.icone { width: 40px; padding: 0; }
.bolinha { display: inline-grid; place-items: center; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; background: var(--accent); color: var(--on-accent); font: 700 .72rem/1 var(--font-mono); }
@media (max-width: 760px) {
  .so-largo, .topo-busca { display: none; }
}
.rodape { border-top: 1px solid var(--border); margin-top: 56px; padding: 28px 0 32px; }
.rodape-in { display: flex; flex-wrap: wrap; gap: 20px; justify-content: space-between; }
.rodape-in > div { max-width: 62ch; display: grid; gap: 6px; }
.rodape-links { display: flex; flex-wrap: wrap; gap: 8px 18px; align-content: start; font-size: .92rem; }
.barra { display: none; }
@media (max-width: 760px) {
  .rodape { padding-bottom: 96px; }
  .barra {
    display: grid; grid-template-columns: repeat(4, 1fr); position: fixed; left: 0; right: 0; bottom: 0; z-index: 25;
    background: color-mix(in srgb, var(--bg-elev) 94%, transparent); backdrop-filter: blur(12px); border-top: 1px solid var(--border);
    padding: 6px 4px calc(6px + env(safe-area-inset-bottom));
  }
  .barra a, .barra button { display: grid; justify-items: center; gap: 2px; padding: 6px 0; border: 0; background: none; color: var(--muted); text-decoration: none; font-size: .72rem; font-weight: 600; cursor: pointer; border-radius: 12px; }
  .barra .on { color: var(--accent); }
  .barra :deep(svg) { width: 22px; height: 22px; }
  .barra .bolinha { margin-left: 4px; min-width: 16px; height: 16px; font-size: .62rem; }
}
.busca-cheia { position: fixed; inset: 0; z-index: 40; background: var(--bg); padding-top: 14px; overflow: auto; }
.busca-cheia-topo { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-family: var(--font-display); font-size: 1.1rem; }
</style>
