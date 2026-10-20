// POST /api/eventos  { loja: <slug>, tipo: 'visita' | 'item' | 'whatsapp', item?: <assetid> }
// Enviado pela loja com navigator.sendBeacon. Cada visitante conta uma vez a cada 30 minutos por
// loja, tipo e item, para recarregar a página não inflar os números. O item tem que existir na
// loja, e cada visitante grava no máximo 40 eventos por loja nessa janela: assetids inventados não
// enchem o banco. O banco não guarda nada do visitante. Responde 204 mesmo quando ignora.
const WINDOW = 30 * 60 * 1000
const MAX_SEEN = 50_000
const TYPES = new Set(['visita', 'item', 'whatsapp'])
const seen = new Map()

// Loja pela URL guardada por 5 minutos: cada visita manda vários eventos.
const storeBySlug = defineCachedFunction((slug) => findStoreBySlug(slug), {
  name: 'loja-eventos',
  maxAge: 60 * 5,
  getKey: (slug) => slug,
})

export default defineEventHandler(async (event) => {
  rateLimit(event, 'eventos', 120, 60)
  // Outro site mandando eventos com os visitantes dele inflaria os números de uma loja.
  assertSameOrigin(event)
  setResponseStatus(event, 204)

  const body = (await readBody(event).catch(() => null)) ?? {}
  const slug = String(body.loja ?? '')
  const type = String(body.tipo ?? '')
  const item = body.item == null ? null : String(body.item)
  if (!TYPES.has(type) || slugProblem(slug)) return null
  if (item !== null && !/^\d{1,20}$/.test(item)) return null
  if (type === 'item' && !item) return null

  const visitor = visitorKey(event)
  if (!visitor) return null

  const store = await storeBySlug(slug).catch(() => null)
  if (!store || !isOpen(store)) return null

  const now = Date.now()
  const key = `${visitor}|${store.id}|${type}|${item ?? ''}`
  if (seen.get(key) > now) return null

  if (item) {
    const readAt = store.inventario_em ? Date.parse(store.inventario_em) : 0
    const { items } = await getStoreItems(store.id, readAt).catch(() => ({ items: [] }))
    if (!items.some((i) => i.id === item)) return null
  }
  // Silencioso: passar do teto só deixa de contar.
  try {
    rateLimitKey(event, 'eventos-loja', `${visitor}|${store.id}`, 40, WINDOW / 1000)
  } catch {
    return null
  }

  if (seen.size >= MAX_SEEN) prune(now)
  seen.set(key, now + WINDOW)

  await supabase('/rest/v1/eventos', {
    method: 'POST',
    body: { loja_id: store.id, tipo: type, assetid: item },
    headers: { Prefer: 'return=minimal' },
  }).catch((error) => console.error('[eventos] banco indisponível:', error.message))
  return null
})

function prune(now) {
  for (const [key, until] of seen) if (until <= now) seen.delete(key)
  for (const key of seen.keys()) {
    if (seen.size < MAX_SEEN * 0.9) break
    seen.delete(key)
  }
}
