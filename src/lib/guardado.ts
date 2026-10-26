// O que fica só no aparelho da pessoa: o lugar onde vota e a cola. Nada vai para o servidor.
import { computed, reactive, watch } from 'vue'

function ler<T>(chave: string, padrao: T): T {
  try { const v = localStorage.getItem(chave); return v ? { ...padrao, ...JSON.parse(v) } : padrao } catch { return padrao }
}
function gravar(chave: string, valor: unknown) {
  try { localStorage.setItem(chave, JSON.stringify(valor)) } catch { /* modo privado: segue sem guardar */ }
}

/* ---------- Onde você vota ---------- */
export interface Onde { ibge: string; nome: string; uf: string }
export const onde = reactive<{ atual: Onde | null }>(ler('vsv-onde', { atual: null }))
watch(onde, () => gravar('vsv-onde', onde), { deep: true })

/* ---------- A cola ---------- */
export type CargoCola = 'depfed' | 'depest' | 'senador' | 'governador' | 'presidente' | 'vereador' | 'prefeito'
export interface LinhaCola { numero: string; nome: string; partido: string; resumo: string; id: string }
export const CARGOS_COLA: { id: CargoCola; nome: string; digitos: number; grupo: 'geral' | 'municipal' }[] = [
  // A ordem da urna.
  { id: 'depfed', nome: 'Deputado federal', digitos: 4, grupo: 'geral' },
  { id: 'depest', nome: 'Deputado estadual', digitos: 5, grupo: 'geral' },
  { id: 'senador', nome: 'Senador', digitos: 3, grupo: 'geral' },
  { id: 'governador', nome: 'Governador', digitos: 2, grupo: 'geral' },
  { id: 'presidente', nome: 'Presidente', digitos: 2, grupo: 'geral' },
  { id: 'vereador', nome: 'Vereador', digitos: 5, grupo: 'municipal' },
  { id: 'prefeito', nome: 'Prefeito', digitos: 2, grupo: 'municipal' },
]
const vazia = (): LinhaCola => ({ numero: '', nome: '', partido: '', resumo: '', id: '' })
export const cola = reactive<Record<CargoCola, LinhaCola>>(ler('vsv-cola', Object.fromEntries(CARGOS_COLA.map((c) => [c.id, vazia()])) as Record<CargoCola, LinhaCola>))
watch(cola, () => gravar('vsv-cola', cola), { deep: true })
export const naCola = computed(() => CARGOS_COLA.filter((c) => cola[c.id].numero || cola[c.id].nome).length)
export function porNaCola(cargo: CargoCola, dados: Partial<LinhaCola>) { Object.assign(cola[cargo], dados) }
export function limparCola() { for (const c of CARGOS_COLA) Object.assign(cola[c.id], vazia()) }
export const cargoDaCola = (cargo: string): CargoCola | null => (['depfed', 'depest', 'senador', 'vereador'].includes(cargo) ? (cargo as CargoCola) : null)

/* ---------- Tema ---------- */
export function trocarTema() {
  const raiz = document.documentElement
  const escuro = raiz.dataset.theme === 'dark' || (!raiz.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches)
  raiz.dataset.theme = escuro ? 'light' : 'dark'
  try { localStorage.setItem('bugadao-tema', raiz.dataset.theme) } catch { /* sem guardar */ }
}
