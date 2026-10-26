// Tarefas de base: as casas do levantamento, as 5.570 cidades e o diretório do Interlegis.
import { ASSEMBLEIAS, CAMARAS_CAPITAIS, DATA_LEVANTAMENTO, FEDERAL, UFS, type Levantada } from '../../shared/cobertura'
import { lerInterlegis, normalizar } from '../../shared/logica'
import { agendar, agora, buscar, lote } from '../util'
import { naUf, type Contexto } from './contexto'

/** Grava (e atualiza) as casas do levantamento manual: Câmara, Senado, 27 Assembleias, 26 capitais. */
export async function semearCasas(ctx: Contexto): Promise<number> {
  const db = ctx.db
  const linha = (id: string, tipo: string, nome: string, uf: string | null, ibge: string | null, l: Levantada) =>
    db.prepare(`INSERT INTO casas (id, tipo, nome, sigla, uf, ibge, acesso, sapl, url, votos, presenca, projetos, gastos, nota, verificado_em, origem)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'levantamento')
        ON CONFLICT(id) DO UPDATE SET tipo = excluded.tipo, nome = excluded.nome, sigla = excluded.sigla, uf = excluded.uf, ibge = excluded.ibge,
          acesso = excluded.acesso, sapl = excluded.sapl, url = excluded.url, votos = excluded.votos, presenca = excluded.presenca,
          projetos = excluded.projetos, gastos = excluded.gastos, nota = excluded.nota, verificado_em = excluded.verificado_em, origem = 'levantamento'`)
      .bind(id, tipo, nome, l.sigla ?? null, uf, ibge, l.acesso, l.sapl ?? null, l.url, l.votos, l.presenca, l.projetos, l.gastos ?? null, l.nota, DATA_LEVANTAMENTO)
  const cmd = [
    linha('camara', 'federal', FEDERAL.camara.nome, null, null, FEDERAL.camara),
    linha('senado', 'federal', FEDERAL.senado.nome, null, null, FEDERAL.senado),
  ]
  for (const u of UFS) {
    const al = ASSEMBLEIAS[u.uf]
    cmd.push(linha(`al:${u.uf}`, 'assembleia', u.uf === 'DF' ? 'Câmara Legislativa do Distrito Federal' : `Assembleia Legislativa ${artigo(u.nome)}`, u.uf, null, al))
    const cm = CAMARAS_CAPITAIS[u.uf]
    if (cm) cmd.push(linha(`cm:${u.ibge}`, 'camara', `Câmara Municipal ${u.capital === 'Rio de Janeiro' || u.capital === 'Recife' ? 'do' : 'de'} ${u.capital}`, u.uf, u.ibge, cm))
  }
  await lote(db, cmd)
  return 1
}

// "do Piauí", "da Bahia", "de São Paulo"…
const FEMININOS = new Set(['Bahia', 'Paraíba'])
const SEM_ARTIGO = new Set(['Alagoas', 'Goiás', 'Minas Gerais', 'Pernambuco', 'Rondônia', 'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Mato Grosso', 'Mato Grosso do Sul'])
const artigo = (nome: string) => (SEM_ARTIGO.has(nome) ? `de ${nome}` : FEMININOS.has(nome) ? `da ${nome}` : `do ${nome}`)

/** As 5.570 cidades (Querido Diário), com a cobertura do Diário Oficial de cada uma. */
export async function municipios(ctx: Contexto): Promise<number> {
  const j = await buscar(ctx.orc, 'https://api.queridodiario.org.br/cities')
  const cidades = j.cities as { territory_id: string; territory_name: string; state_code: string; level: string; availability_date: string }[]
  if (cidades.length < 5000) throw new Error(`o Querido Diário devolveu só ${cidades.length} cidades`)
  const db = ctx.db
  await lote(db, cidades.map((c) => db.prepare(`INSERT INTO municipios (ibge, nome, uf, busca, diario_nivel, diario_desde) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(ibge) DO UPDATE SET nome = excluded.nome, uf = excluded.uf, busca = excluded.busca, diario_nivel = excluded.diario_nivel, diario_desde = excluded.diario_desde`)
    .bind(c.territory_id, c.territory_name, c.state_code, normalizar(c.territory_name), c.level ?? null, c.availability_date || null)), 100)
  return 30
}

/** Todo mês: varre o diretório do Interlegis, estado por estado, atrás das câmaras com SAPL. */
export async function interlegis(ctx: Contexto): Promise<number> {
  await agendar(ctx.db, UFS.filter((u) => naUf(ctx, u.uf)).map((u) => `interlegis:${u.uf}:1`), 8)
  return 30
}

export async function interlegisPagina(ctx: Contexto, uf: string, p: number): Promise<number> {
  const n = await ctx.db.prepare('SELECT count(*) AS n FROM municipios').first<{ n: number }>()
  if (!n?.n) throw new Error('esperando a lista de municípios')
  const html = await buscar(ctx.orc, `https://www12.senado.leg.br/interlegis/orgaosatendidos?uf=${uf}&servico=SAPL&p=${p}`, { texto: true }) as string
  const { casas, ultimaPagina } = lerInterlegis(html)
  const db = ctx.db
  const novas: string[] = []
  for (const c of casas) {
    const m = await db.prepare('SELECT ibge, nome FROM municipios WHERE uf = ? AND busca = ?').bind(uf, normalizar(c.municipio)).first<{ ibge: string; nome: string }>()
    if (!m) continue
    const info = JSON.stringify({ verificado: c.verificado, resultado: c.resultado, usado: c.usado, lido_em: agora() })
    await db.prepare(`INSERT INTO casas (id, tipo, nome, uf, ibge, acesso, sapl, url, votos, presenca, projetos, origem, saude)
        VALUES (?, 'camara', ?, ?, ?, 'SAPL (Interlegis)', ?, ?, 'naosei', 'naosei', 'naosei', 'interlegis', json_object('interlegis', json(?)))
        ON CONFLICT(id) DO UPDATE SET sapl = excluded.sapl, url = excluded.url, saude = json_set(coalesce(casas.saude, '{}'), '$.interlegis', json(?))
        WHERE casas.origem != 'levantamento'`)
      .bind(`cm:${m.ibge}`, `Câmara Municipal de ${m.nome}`, uf, m.ibge, c.sapl, `${c.sapl}/`, info, info).run()
    novas.push(`sapl:medir:cm:${m.ibge}`)
  }
  await agendar(db, novas, 8)
  if (p < ultimaPagina) await agendar(db, [`interlegis:${uf}:${p + 1}`], 8)
  return 30
}
