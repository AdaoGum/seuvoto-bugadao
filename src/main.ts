import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import './estilo/bugadao-tokens.css'
import './estilo/base.css'
import App from './App.vue'
import Inicio from './paginas/Inicio.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Inicio },
    { path: '/lugar/:ibge(\\d{7})', component: () => import('./paginas/Lugar.vue') },
    { path: '/p/:id(.+)', component: () => import('./paginas/Ficha.vue') },
    { path: '/cola', component: () => import('./paginas/Cola.vue') },
    { path: '/cobertura', component: () => import('./paginas/Cobertura.vue') },
    { path: '/como-funciona', component: () => import('./paginas/Sobre.vue') },
    { path: '/:resto(.*)*', component: () => import('./paginas/NaoAchei.vue') },
  ],
  scrollBehavior: (to, _from, salvo) => salvo ?? (to.hash ? { el: to.hash, behavior: 'smooth' } : { top: 0 }),
})

createApp(App).use(router).mount('#app')
