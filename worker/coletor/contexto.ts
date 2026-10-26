import type { Orcamento } from '../util'

export interface Contexto {
  env: Env
  db: D1Database
  orc: Orcamento
  desde: string                   // COLETA_DESDE: de quando para cá buscar votações e sessões
  ufs: Set<string> | null         // COLETA_UFS: só estes estados (coleta local); null = todos
}

/** Filtro de UF da coleta local (COLETA_UFS): nas casas e nos parlamentares por estado. */
export const naUf = (ctx: Contexto, uf: string | null | undefined) => !ctx.ufs || (!!uf && ctx.ufs.has(uf))
