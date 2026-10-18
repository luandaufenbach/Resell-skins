// Prévias da loja (tabela previas): geradas em /previa sem conta, valem 24h. Quando vencem, o
// banco apaga o WhatsApp e o SteamID, e a linha some 7 dias depois (interno.limpar_previas,
// agendada no próprio banco).

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const ID_LENGTH = 10

export function isPreviewId(value) {
  return /^[A-Za-z0-9]{10}$/.test(String(value))
}

/** Cookie que marca o navegador de quem criou a prévia. */
export function previewCookie(id) {
  return `previa_${id}`
}

/** Grava a prévia e devolve o id. `whatsapp` já vem só com números (ou vazio). */
export async function createPreview(steamid, whatsapp) {
  const id = randomId()
  await database(() =>
    supabase('/rest/v1/previas', {
      method: 'POST',
      body: { id, steamid, whatsapp: whatsapp || null },
      headers: { Prefer: 'return=minimal' },
    }),
  )
  return id
}

/** { steamid, whatsapp, expiresAt } ou null se a prévia não existe (ou já foi apagada). */
export async function findPreview(id) {
  const [row] = await database(() =>
    supabase('/rest/v1/previas', { query: { id: `eq.${id}`, select: 'steamid,whatsapp,expira_em' } }),
  )
  return row ? { steamid: row.steamid, whatsapp: row.whatsapp ?? '', expiresAt: row.expira_em } : null
}

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
