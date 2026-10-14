// Tudo que conversa com a Steam fica aqui.
// Nenhuma chave do revendedor é usada: inventário e perfil vêm de endpoints públicos.

const COMMUNITY = 'https://steamcommunity.com'
const STEAMID64_BASE = 76561197960265728n
const INVENTORY_PAGE_SIZE = 2000
const INVENTORY_MAX_PAGES = 3

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
}

export function isSteamId64(value) {
  return /^7656119\d{10}$/.test(String(value))
}

/**
 * Aceita qualquer coisa que o revendedor costuma ter à mão e devolve o SteamID64:
 * - 76561198000000000
 * - steamcommunity.com/profiles/76561198000000000
 * - steamcommunity.com/id/apelido
 * - link de troca (steamcommunity.com/tradeoffer/new/?partner=123&token=abc)
 * - só o apelido
 */
export async function resolveSteamId(input, apiKey) {
  const raw = String(input ?? '').trim()
  if (!raw) throw invalidInput()
  if (isSteamId64(raw)) return raw

  let url = null
  try {
    url = new URL(raw.includes('://') ? raw : `https://${raw}`)
  } catch {
    url = null
  }

  if (url && /(^|\.)steamcommunity\.com$/i.test(url.hostname)) {
    const [kind, value] = url.pathname.split('/').filter(Boolean)
    if (kind === 'profiles' && isSteamId64(value)) return value
    if (kind === 'id' && value) return resolveVanity(value, apiKey)

    const partner = url.searchParams.get('partner')
    if (partner && /^\d+$/.test(partner)) return String(STEAMID64_BASE + BigInt(partner))

    throw invalidInput()
  }

  if (/^[\w-]{2,32}$/.test(raw)) return resolveVanity(raw, apiKey)
  throw invalidInput()
}

async function resolveVanity(vanity, apiKey) {
  if (apiKey) {
    const res = await $fetch('https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/', {
      query: { key: apiKey, vanityurl: vanity },
      timeout: 8000,
    }).catch(() => null)
    if (res?.response?.success === 1) return res.response.steamid
  }

  const xml = await $fetch(`${COMMUNITY}/id/${encodeURIComponent(vanity)}/?xml=1`, {
    headers: HEADERS,
    responseType: 'text',
    timeout: 8000,
  }).catch((err) => {
    throw steamError(err)
  })

  const steamid = xmlTag(xml, 'steamID64')
  if (!isSteamId64(steamid)) throw notFound()
  return steamid
}

/** Nome e avatar do perfil, pelo XML público. Retorna null se não conseguir. */
export async function fetchProfile(steamid) {
  const xml = await $fetch(`${COMMUNITY}/profiles/${steamid}/?xml=1`, {
    headers: HEADERS,
    responseType: 'text',
    timeout: 8000,
  })
  if (!xml || xml.includes('<error>')) return null

  return {
    name: xmlTag(xml, 'steamID'),
    avatar: xmlTag(xml, 'avatarFull'),
    url: `${COMMUNITY}/profiles/${steamid}`,
  }
}

/** Páginas cruas do inventário de CS2 (appid 730, contexto 2). */
export async function fetchInventory(steamid) {
  const pages = []
  let startAssetId = null

  for (let i = 0; i < INVENTORY_MAX_PAGES; i++) {
    const page = await $fetch(`${COMMUNITY}/inventory/${steamid}/730/2`, {
      query: {
        l: 'brazilian',
        count: INVENTORY_PAGE_SIZE,
        ...(startAssetId && { start_assetid: startAssetId }),
      },
      headers: HEADERS,
      timeout: 15000,
      retry: 0,
    }).catch((err) => {
      throw steamError(err)
    })

    // Inventário privado às vezes volta 200 com corpo "null".
    if (!page || page.success !== 1) throw privateInventory()

    pages.push(page)
    if (!page.more_items || !page.last_assetid) break
    startAssetId = page.last_assetid
  }

  return pages
}

/**
 * Inventário + perfil já normalizados, guardados em cache por 10 minutos.
 * A Steam bloqueia rápido (erro 429), então o catálogo nunca deve consultá-la a cada visita.
 * Erros não entram no cache.
 */
export const getStore = defineCachedFunction(
  async (steamid) => {
    const [profile, pages] = await Promise.all([
      fetchProfile(steamid).catch(() => null),
      fetchInventory(steamid),
    ])

    return {
      steamid,
      profile,
      items: normalizeInventory(pages, steamid),
      fetchedAt: Date.now(),
    }
  },
  {
    name: 'store',
    maxAge: 60 * 10,
    getKey: (steamid) => steamid,
  },
)

// ---------------------------------------------------------------------------

function xmlTag(xml, tag) {
  const match = String(xml ?? '').match(
    new RegExp(`<${tag}>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))\\s*</${tag}>`),
  )
  const value = match?.[1] ?? match?.[2]
  return value ? value.trim() : null
}

function steamError(err) {
  const status = err?.response?.status ?? err?.statusCode
  if (status === 401 || status === 403) return privateInventory()
  if (status === 429) {
    return createError({
      statusCode: 429,
      statusMessage: 'A Steam limitou as consultas',
      data: { code: 'RATE_LIMIT' },
    })
  }
  if (status === 400 || status === 404) return notFound()
  return createError({
    statusCode: 502,
    statusMessage: 'A Steam não respondeu',
    data: { code: 'STEAM_DOWN' },
  })
}

function privateInventory() {
  return createError({
    statusCode: 403,
    statusMessage: 'Inventário privado',
    data: { code: 'PRIVATE' },
  })
}

function notFound() {
  return createError({
    statusCode: 404,
    statusMessage: 'Perfil não encontrado',
    data: { code: 'NOT_FOUND' },
  })
}

function invalidInput() {
  return createError({
    statusCode: 400,
    statusMessage: 'Link da Steam inválido',
    data: { code: 'INVALID_INPUT' },
  })
}
