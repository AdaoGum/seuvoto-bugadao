// Regras puras, usadas pelo Worker e pelo site (e cobertas por testes).
import type { Status } from './cobertura'

/** Minúsculas, sem acento e sem pontuação: para busca e para casar nomes de cidade. */
export const normalizar = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
/** Como o Interlegis monta o endereço: "Foz do Iguaçu" → "fozdoiguacu". */
export const slug = (t: string) => normalizar(t).replace(/ /g, '')

/* ---------- Comparecimento ---------- */

export type Comparecimento = 'votou' | 'presente' | 'justificada' | 'falta' | 'outro'

/** Senado: o código de cada voto diz se a pessoa votou, estava e não votou, ou o motivo da ausência. */
export function comparecimentoSenado(sigla: string): Comparecimento {
  if (['Sim', 'Não', 'Abstenção', 'Votou', 'Obstrução', 'P-OD'].includes(sigla)) return 'votou'
  if (sigla === 'P-NRV' || sigla.startsWith('Presidente')) return 'presente'
  if (sigla === 'NCom') return 'falta'
  if (sigla === 'AP' || sigla === 'MIS' || sigla === 'REP' || /^L[A-Z]*$/.test(sigla)) return 'justificada'
  return 'outro'
}

export const ROTULO_VOTO: Record<string, string> = {
  'P-NRV': 'Presente, não votou', NCom: 'Não compareceu', AP: 'Em atividade parlamentar', MIS: 'Em missão oficial',
  LS: 'De licença', LP: 'De licença', LAP: 'De licença', LG: 'De licença', REP: 'Em representação',
  'Presidente (art. 51 RISF)': 'Presidindo a sessão', 'Artigo 17': 'Presidindo a sessão', Votou: 'Votou (secreta)',
  'Não votou': 'Não registrou voto',
}
export const rotuloVoto = (v: string) => ROTULO_VOTO[v] ?? (/^L[A-Z]*$/.test(v) ? 'De licença' : v)
export const sentidoVoto = (v: string): 'sim' | 'nao' | 'outro' => (v === 'Sim' ? 'sim' : v === 'Não' ? 'nao' : 'outro')

/* ---------- Tipos de proposição ---------- */

export const TIPOS_CAMARA: [string, string][] = [
  ['PL', 'Projetos de lei'], ['PEC', 'Propostas de emenda à Constituição'], ['PLP', 'Projetos de lei complementar'],
  ['PDL', 'Projetos de decreto legislativo'], ['REQ', 'Requerimentos'], ['INC', 'Indicações'],
]
const TIPOS_SENADO: Record<string, string> = {
  PL: 'Projetos de lei', PLS: 'Projetos de lei', PEC: 'Propostas de emenda à Constituição', PLP: 'Projetos de lei complementar',
  PDL: 'Projetos de decreto legislativo', PRS: 'Projetos de resolução', RQS: 'Requerimentos', REQ: 'Requerimentos', RQN: 'Requerimentos',
  INS: 'Indicações',
}
/** "PL 90/2023" → "Projetos de lei". */
export const tipoSenado = (identificacao: string) => TIPOS_SENADO[(identificacao || '').split(' ')[0]] ?? 'Outros'

/** O que cada tipo quer dizer, para o glossário da ficha. */
export const GLOSSARIO: Record<string, string> = {
  'Projetos de lei': 'Proposta de lei nova ou de mudança numa lei.',
  'Propostas de emenda à Constituição': 'Proposta de mudar a Constituição. Precisa de muito mais votos para passar.',
  'Projetos de lei complementar': 'Lei que regulamenta um ponto da Constituição.',
  'Projetos de decreto legislativo': 'Decisão do Legislativo que não precisa de sanção, como sustar um ato do governo.',
  'Projetos de resolução': 'Regra interna da casa.',
  Requerimentos: 'Pedido formal: informações a um ministério, uma audiência, urgência para um projeto, uma homenagem.',
  Indicações: 'Sugestão ao governo de uma obra ou ação. Não obriga o governo a fazer.',
  Moções: 'Manifestação da casa: apoio, aplauso, repúdio ou pesar. Não muda nenhuma lei.',
  Emendas: 'Proposta de mudança no texto de um projeto que já está tramitando.',
  Pareceres: 'Opinião de uma comissão sobre um projeto, assinada pelo relator.',
  'Indicativos de projeto de lei': 'Sugestão de projeto ao Executivo, quando só ele pode propor aquele assunto.',
}

/** Explicação de um tipo de matéria, aceitando os nomes de cada casa ("Requerimento", "Projeto de Lei Ordinária"…). */
export function explicacao(nome: string): string | undefined {
  if (GLOSSARIO[nome]) return GLOSSARIO[nome]
  const n = normalizar(nome)
  const regras: [RegExp, string][] = [
    [/^indicativo/, 'Indicativos de projeto de lei'], [/^(proposta de )?emenda (a|à) constituicao|^pec/, 'Propostas de emenda à Constituição'],
    [/^projeto de lei complementar/, 'Projetos de lei complementar'], [/^projeto de decreto legislativo/, 'Projetos de decreto legislativo'],
    [/^projeto de resolucao/, 'Projetos de resolução'], [/^projeto de lei/, 'Projetos de lei'], [/^requerimento/, 'Requerimentos'],
    [/^indicac/, 'Indicações'], [/^moc/, 'Moções'], [/^emenda/, 'Emendas'], [/^parecer/, 'Pareceres'],
  ]
  const r = regras.find(([re]) => re.test(n))
  return r ? GLOSSARIO[r[1]] : undefined
}

/* ---------- Medição de uma casa com SAPL ---------- */

export interface Medicao { votos: number; presencas: number; materias: number; sessoesLeg: number; ultimoVoto?: string | null; inicioLeg?: string }
/** O que dá para dizer de uma casa a partir dos totais do SAPL dela. */
export function statusMedido(m: Medicao): { votos: Status; presenca: Status; projetos: Status } {
  const votosRecentes = !!(m.ultimoVoto && m.inicioLeg && m.ultimoVoto >= m.inicioLeg)
  return {
    votos: m.votos === 0 ? 'nao' : votosRecentes ? 'sim' : 'parcial',
    presenca: m.presencas > 0 && m.sessoesLeg > 0 ? 'sim' : m.presencas > 0 ? 'parcial' : 'nao',
    projetos: m.materias > 0 ? 'sim' : 'nao',
  }
}

/** Status da casa a partir do que foi coletado de cada parlamentar ativo. */
export function statusDosResumos(n: number, comVotos: number, comPresenca: number, comProjetos: number) {
  const st = (k: number): Status => (n === 0 ? 'naosei' : k === 0 ? 'nao' : k >= n / 2 ? 'sim' : 'parcial')
  return { votos: st(comVotos), presenca: st(comPresenca), projetos: st(comProjetos) }
}

/* ---------- Diretório do Interlegis ---------- */

export interface CasaInterlegis { nome: string; municipio: string; sapl: string; verificado: string; resultado: string; usado: string }
const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
const texto = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) =>
  e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTIDADES[e] ?? m).replace(/\s+/g, ' ').trim()

/** "Câmara Municipal de Foz do Iguaçu" → "Foz do Iguaçu". */
export const municipioDaCamara = (nome: string) =>
  nome.replace(/^C[âa]mara\s+(Municipal\s+)?(de\s+Vereadores\s+)?(d[eoa]s?\s+)?/i, '').trim()

/** Lê uma página de orgaosatendidos?uf=XX&servico=SAPL: as câmaras municipais com SAPL e a última página. */
export function lerInterlegis(html: string): { casas: CasaInterlegis[]; ultimaPagina: number } {
  const casas: CasaInterlegis[] = []
  for (const bloco of html.split('class="orgao-atendido"').slice(1)) {
    const nome = /<div style="font-weight:bold;margin-bottom:3px;">([^<]+)<\/div>/.exec(bloco)?.[1]
    if (!nome || !/-\s*C[âa]mara Municipal\s*</.test(bloco)) continue
    const linha = /<td>SAPL<\/td>\s*<td>[^<]*<\/td>\s*<td><a[^>]*href="([^"]+)"[^>]*>[^<]*<\/a><\/td>\s*<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>/.exec(bloco)
    if (!linha) continue
    const sapl = baseSapl(linha[1])
    if (!sapl) continue
    const n = texto(nome)
    casas.push({ nome: n, municipio: municipioDaCamara(n), sapl, verificado: texto(linha[2]), resultado: texto(linha[3]), usado: texto(linha[4]) })
  }
  const paginas = [...html.matchAll(/[?&;]p=(\d+)/g)].map((m) => Number(m[1]))
  return { casas, ultimaPagina: Math.max(1, ...paginas) }
}

/** "http://sapl.x.uf.leg.br/qualquer" → "https://sapl.x.uf.leg.br". */
export function baseSapl(url: string): string | null {
  try {
    const u = new URL(url.trim())
    return /^sapl/.test(u.hostname) ? `https://${u.hostname}` : null
  } catch { return null }
}

/* ---------- Datas ---------- */

export const iso = (d: Date) => d.toISOString().slice(0, 10)
/** Janelas de até `dias` dias, da mais recente para trás, até `desde` (a Câmara aceita no máximo 3 meses). */
export function janelas(desde: string, ate: Date, dias = 85): { ini: string; fim: string }[] {
  const out: { ini: string; fim: string }[] = []
  let fim = new Date(ate)
  while (iso(fim) >= desde) {
    const ini = new Date(fim); ini.setUTCDate(ini.getUTCDate() - dias)
    out.push({ ini: iso(ini) < desde ? desde : iso(ini), fim: iso(fim) })
    fim = new Date(ini); fim.setUTCDate(fim.getUTCDate() - 1)
  }
  return out
}
/** Data da pessoa ou da coleta, a mais recente das duas. */
export const maisRecente = (...datas: (string | null | undefined)[]) => datas.filter(Boolean).sort().pop() ?? ''

/* ---------- Gastos ---------- */

/** Nome de categoria de despesa enxuto: "COMBUSTÍVEIS E LUBRIFICANTES." → "Combustíveis e lubrificantes". */
export function categoria(t: string): string {
  const s = (t || 'Outros').split(/[,;]| inclusive /i)[0].replace(/\.\s*$/, '').trim().toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}
export interface Gastos { ano: number; total: number; notas: number; categorias: [string, number][] }
export function somarGastos(ano: number, itens: { categoria: string; valor: number }[], top = 6): Gastos {
  const por = new Map<string, number>()
  let total = 0
  for (const i of itens) { const c = categoria(i.categoria); por.set(c, (por.get(c) || 0) + i.valor); total += i.valor }
  const ordem = [...por.entries()].sort((a, b) => b[1] - a[1])
  const cats = ordem.slice(0, top)
  const resto = ordem.slice(top).reduce((s, [, v]) => s + v, 0)
  if (resto > 0) cats.push(['Outras categorias', resto])
  return { ano, total: Math.round(total * 100) / 100, notas: itens.length, categorias: cats.map(([c, v]) => [c, Math.round(v * 100) / 100]) }
}
