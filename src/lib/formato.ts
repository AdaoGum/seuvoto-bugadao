export const num = (n: number) => n.toLocaleString('pt-BR')
export const reais = (n: number, curto = false) => {
  if (curto && Math.abs(n) >= 1000) {
    const mil = n / 1000
    return mil >= 1000 ? `R$ ${(mil / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi` : `R$ ${Math.round(mil).toLocaleString('pt-BR')} mil`
  }
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}
export const pct = (parte: number, total: number) => (total ? Math.round((parte / total) * 100) : 0)
export const dataBR = (d?: string | null) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '')
export const mesAno = (d?: string | null) => {
  if (!d) return ''
  const [a, m] = d.split('-')
  return `${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(m) - 1]}/${a}`
}
/** "Átila Lira" → "AL", para a foto que não carregou. */
export const iniciais = (nome: string) => nome.split(/\s+/).filter((p) => p.length > 2 || /^[A-ZÁÉÍÓÚ]/.test(p)).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
export const titulo = (t: string) => { document.title = t ? `${t} · Seu Voto` : 'Seu Voto · o que cada político fez, com a fonte do lado' }
/** Endereço da ficha: "camara:123086" vira /p/camara.123086 (a Cloudflare redireciona o ":" para "%3A"). */
export const urlPessoa = (id: string) => `/p/${id.replaceAll(':', '.')}`
/** O contrário, aceitando também os links antigos, com ":". */
export const idDaUrl = (param: string) => param.replaceAll('.', ':')
