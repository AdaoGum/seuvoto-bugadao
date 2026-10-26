// Acesso à API do Worker, com cache na memória durante a visita.
const cache = new Map<string, Promise<unknown>>()

export class ErroApi extends Error {
  constructor(msg: string, readonly status: number) { super(msg) }
}

export function pegar<T>(caminho: string, { novo = false } = {}): Promise<T> {
  if (!novo && cache.has(caminho)) return cache.get(caminho) as Promise<T>
  const p = fetch(`/api${caminho}`, { headers: { Accept: 'application/json' } }).then(async (r) => {
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new ErroApi(j.erro || 'Não deu para carregar agora. Tente de novo em instantes.', r.status)
    return j as T
  })
  cache.set(caminho, p)
  p.catch(() => cache.delete(caminho))
  return p
}
