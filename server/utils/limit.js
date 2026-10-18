// Limite de consultas por IP. Cada inventário novo é lido da Steam a partir do servidor, e a
// Steam bloqueia o IP de quem consulta demais; os preços só podem aparecer dentro da loja, nunca
// servidos em massa (termos da SteamApis).
// A contagem fica na memória do servidor: vale enquanto o site rodar numa instância só. Rever
// quando a hospedagem for escolhida.

const buckets = new Map()
const MAX_BUCKETS = 10_000

/**
 * IP do visitante. Atrás de um proxy (a hospedagem), o IP vem no cabeçalho definido em
 * NUXT_IP_HEADER; sem ele, é o da conexão. Pode ser null (chamada interna do servidor).
 */
export function clientIp(event) {
  const { ipHeader } = useRuntimeConfig(event)
  if (ipHeader) {
    // Proxy que acrescenta ao cabeçalho deixa por último o IP que ele mesmo viu; os anteriores
    // podem ter sido inventados por quem fez a requisição.
    const ip = getRequestHeader(event, ipHeader)?.split(',').pop()?.trim()
    if (ip) return ip
  }
  return event.node.req.socket?.remoteAddress || null
}

/**
 * Conta uma consulta e responde 429 quando o IP passou de `max` na janela de `seconds`.
 * A página renderizada no servidor pede a API por dentro; essa chamada interna traz o contexto
 * da requisição original (req.__unenv__, posto pelo Nitro) e não conta de novo o que ela já contou.
 */
export function rateLimit(event, name, max, seconds) {
  const parent = event.node.req.__unenv__
  if (parent?.rateLimited?.includes(name)) return

  const ip = parent?.clientIp ?? event.context.clientIp ?? clientIp(event)
  if (!ip) return
  event.context.clientIp = ip
  event.context.rateLimited = [...(event.context.rateLimited ?? []), name]

  const now = Date.now()
  const key = `${name}|${seconds}|${ipKey(ip)}`
  let bucket = buckets.get(key)
  if (!bucket || bucket.reset <= now) {
    if (buckets.size >= MAX_BUCKETS) prune(now)
    bucket = { count: 0, reset: now + seconds * 1000 }
    buckets.set(key, bucket)
  }

  if (++bucket.count > max) {
    setResponseHeader(event, 'Retry-After', Math.ceil((bucket.reset - now) / 1000))
    throw createError({
      statusCode: 429,
      statusMessage: 'Muitas consultas seguidas',
      data: { code: 'LIMIT' },
    })
  }
}

// IPv6 conta por bloco /64: quem tem um bloco troca de endereço à vontade dentro dele.
function ipKey(ip) {
  const address = ip.replace(/%.*$/, '')
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  if (mapped) return mapped[1]
  if (!address.includes(':')) return address

  const [head, tail] = address.split('::')
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  const groups = [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right]
  return `${groups
    .slice(0, 4)
    .map((g) => g.toLowerCase().replace(/^0+(?=.)/, ''))
    .join(':')}::/64`
}

// Tira as janelas vencidas; se ainda estiver cheio, descarta as mais antigas (o Map guarda a
// ordem de entrada). Nunca zera tudo, senão quem troca muito de IP zeraria o limite de todos.
function prune(now) {
  for (const [key, bucket] of buckets) if (bucket.reset <= now) buckets.delete(key)
  for (const key of buckets.keys()) {
    if (buckets.size < MAX_BUCKETS * 0.9) break
    buckets.delete(key)
  }
}
