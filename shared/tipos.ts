// O formato das respostas da API (Worker → site).
import type { Status } from './cobertura'
import type { Gastos } from './logica'

export type Cargo = 'presidente' | 'senador' | 'depfed' | 'governador' | 'depest' | 'prefeito' | 'vereador'
export type Esfera = 'federal' | 'estadual' | 'municipal'

export interface Item { chave: string; nome: string; status: Status; nota?: string }

export interface CargoLugar {
  cargo: Cargo
  nome: string                 // "Senadores", "Deputados estaduais"…
  esfera: Esfera
  casa?: { id: string; nome: string; sigla?: string; acesso?: string; url?: string; nota?: string; medido: boolean; verificado_em?: string }
  itens: Item[]
  pessoas: number              // quantos ativos temos para listar
  quantos?: string             // "3 por estado", "70 de São Paulo"
  coleta?: 'pronta' | 'coletando' | 'sem_sapl' | 'nao_verificada' | 'nao_se_aplica'
}

export interface Lugar {
  uf: string; ufNome: string
  ibge: string | null; municipio: string | null; capital: boolean
  cargos: CargoLugar[]
}

export interface PessoaLista { id: string; nome: string; partido: string | null; uf: string | null; foto: string | null; situacao: string | null; cargo: string }

export interface VotoLinha { data: string; titulo: string | null; descricao: string | null; url: string | null; voto: string }

export interface Ficha {
  pessoa: PessoaLista & { pagina: string | null; desde: string | null; casa_id: string; casa: string; cargoNome: string }
  presenca: null | {
    tipo: 'sessoes' | 'votacoes'
    presente: number; total: number; desde: string
    detalhe?: { votou: number; presente: number; justificada: number; falta: number; outro: number }
    mediaCasa?: number | null
    nota: string
  }
  votos: null | { total: number; porVoto: [string, number][]; recentes: VotoLinha[]; mais: boolean; nominais?: number; nota?: string }
  projetos: null | { total: number; porTipo: [string, number][]; desde: string; nota: string }
  gastos: null | Gastos
  faltando: { chave: string; titulo: string; motivo: string }[]
  fontes: { nome: string; url: string }[]
  atualizado_em: string | null
  coletando: boolean
}

export interface Busca { municipios: { ibge: string; nome: string; uf: string }[]; pessoas: PessoaLista[] }

export interface LinhaCobertura { uf: string; ufNome: string; assembleia: { sigla: string; acesso: string; itens: Item[]; url: string }; capital: { nome: string; acesso: string; itens: Item[]; url: string }; interior: { comSapl: number; comDados: number } }
