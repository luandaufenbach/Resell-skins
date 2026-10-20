// Prévias da loja (tabela previas): geradas em /previa sem conta, valem 24h. A prévia guarda uma
// cópia do inventário lido na hora, e quem abre o link lê essa cópia, não a Steam. Quando vence,
// o banco apaga o WhatsApp, o SteamID e a cópia, e a linha some 7 dias depois
// (interno.limpar_previas, agendada no próprio banco).

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const ID_LENGTH = 10

export function isPreviewId(value) {
  return /^[A-Za-z0-9]{10}$/.test(String(value))
}

/** Cookie que marca o navegador de quem criou a prévia. */
export function previewCookie(id) {
  return `previa_${id}`
}

/**
 * Grava a prévia com a cópia do inventário (`store` de getStore) e devolve o id. `whatsapp` já vem
 * só com números (ou vazio).
 */
export async function createPreview(store, whatsapp) {
  const id = randomId()
  await database(() =>
    supabase('/rest/v1/previas', {
      method: 'POST',
      body: {
        id,
        steamid: store.steamid,
        whatsapp: whatsapp || null,
        perfil: store.profile,
        itens: store.items,
        lido_em: new Date(store.fetchedAt).toISOString(),
      },
      headers: { Prefer: 'return=minimal' },
      timeout: 20000,
    }),
  )
  return id
}

/** { steamid, whatsapp, expiresAt } ou null se a prévia não existe (ou já foi apagada). */
export async function findPreview(id) {
  const [row] = await database(() =>
    supabase('/rest/v1/previas', { query: { id: `eq.${id}`, select: 'steamid,whatsapp,perfil,expira_em' } }),
  )
  return row
    ? { steamid: row.steamid, whatsapp: row.whatsapp ?? '', profile: row.perfil, expiresAt: row.expira_em }
    : null
}

/**
 * Loja da prévia com preços, em cache por 10 minutos: a cópia do inventário mais os preços do
 * dia. Prévia de antes da cópia existir (sem `itens`) lê a Steam, como era antes.
 */
export const getPreviewStore = defineCachedFunction(
  async (id, steamid) => {
    const [row] = await database(() =>
      supabase('/rest/v1/previas', { query: { id: `eq.${id}`, select: 'perfil,itens,lido_em' } }),
    )
    const store = row?.itens
      ? { steamid, profile: row.perfil, items: row.itens, fetchedAt: Date.parse(row.lido_em) }
      : await getStore(steamid)
    const { items, pricesOk } = await attachPrices(store.items)
    return { ...store, items, pricesOk }
  },
  {
    name: 'previa',
    maxAge: 60 * 10,
    getKey: (id) => id,
    validate: (entry) => entry.value !== undefined && entry.value.pricesOk !== false,
  },
)

async function database(call) {
  try {
    return await call()
  } catch (error) {
    console.error('[prévias] banco indisponível:', error.message)
    throw createError({
      statusCode: 503,
      statusMessage: 'Banco indisponível',
      data: { code: 'UNAVAILABLE' },
    })
  }
}

// Sorteio sem viés: descarta os bytes que não cabem num múltiplo de 62.
function randomId() {
  let id = ''
  while (id.length < ID_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(16))) {
      if (byte < 248 && id.length < ID_LENGTH) id += ALPHABET[byte % 62]
    }
  }
  return id
}
