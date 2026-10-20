// Lojas dos revendedores: criação pelo painel, código de posse, inventário e leitura pública. O
// visitante da loja nunca dispara consulta à Steam: os itens ficam no banco e só o revendedor pede
// para atualizar.

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const CODE_TTL = 24 * 60 * 60 * 1000
export const REFRESH_INTERVAL = 10 * 60 * 1000

// A API do Supabase devolve no máximo 1000 linhas por chamada.
const LOTE = 1000

// Colunas que a loja pública usa: nada de código, e-mail ou pagamento.
const PUBLIC_COLUMNS = 'id,slug,steamid,whatsapp,nome,avatar,verificada_em,pago_ate,inventario_em'

/** Código de posse: "VTR-" e 4 caracteres sem os que se confundem (0/O, 1/I). */
export function newCode() {
  // 32 letras: 256 é múltiplo de 32, então o resto não tem viés.
  const bytes = crypto.getRandomValues(new Uint8Array(4))
  return `VTR-${[...bytes].map((b) => CODE_ALPHABET[b % 32]).join('')}`
}

/**
 * Loja do dono da sessão, lida com o token dele (o RLS só deixa ver a própria). null se não há.
 * `pago` diz se já houve algum pagamento: o revendedor não lê a tabela de pagamentos, então essa
 * parte vem com a chave secreta.
 */
export async function ownStore(session) {
  try {
    const [row] = await supabaseAs(session.token, '/rest/v1/lojas', {
      query: { dono: `eq.${session.user.id}`, select: '*,itens(count)' },
    })
    if (!row) return null
    const payments = await supabase('/rest/v1/pagamentos', { query: { loja_id: `eq.${row.id}`, select: 'id', limit: 1 } })
    return { ...row, pago: payments.length > 0 }
  } catch (error) {
    throw unavailable('lojas', error)
  }
}

/**
 * Dados do cadastro para o painel preencher o formulário de criar a loja. Só sugestão: quem
 * confirmou o e-mail confere e corrige antes de criar, porque o Supabase guarda os dados do
 * primeiro cadastro feito com o e-mail, que pode não ter sido o dono dele.
 */
export function storeDraft(session) {
  const meta = session.user.user_metadata ?? {}
  return {
    steam: isSteamId64(meta.steamid) ? `https://steamcommunity.com/profiles/${meta.steamid}` : '',
    whatsapp: /^\d{12,15}$/.test(String(meta.whatsapp ?? '')) ? String(meta.whatsapp) : '',
    slug: slugProblem(meta.slug) ? '' : String(meta.slug),
  }
}

/**
 * Cria a loja da conta com os dados já validados e faz a primeira leitura do inventário, que
 * vira a base das entradas e saídas. 409 SLUG_TAKEN se o endereço foi tomado.
 */
export async function createStore(session, { slug, steamid, whatsapp }, inventory) {
  try {
    await supabase('/rest/v1/lojas', {
      method: 'POST',
      body: {
        dono: session.user.id,
        slug,
        steamid,
        whatsapp,
        codigo: newCode(),
        codigo_expira_em: new Date(Date.now() + CODE_TTL).toISOString(),
      },
      headers: { Prefer: 'return=minimal' },
      retry: 0,
    })
  } catch (error) {
    if (supabaseError(error).code !== '23505') throw unavailable('lojas', error)
    // Duas abas criando ao mesmo tempo: a loja já existe. Senão, o endereço foi tomado.
    const existing = await ownStore(session)
    if (existing) return existing
    throw createError({ statusCode: 409, statusMessage: 'Já existe', data: { code: 'SLUG_TAKEN' } })
  }

  const store = await ownStore(session)
  // Se a gravação dos itens falhar, o painel mostra a loja vazia e o botão de atualizar.
  await saveInventory(store.id, inventory).catch((error) =>
    console.error('[lojas] primeira leitura do inventário:', error.message),
  )
  return (await ownStore(session)) ?? store
}

/** WhatsApp e endereço do formulário (cadastro e criação da loja), conferidos sem sair do servidor. */
export function storeFields(body) {
  const whatsapp = String(body?.whatsapp ?? '')
  const slug = String(body?.slug ?? '').trim().toLowerCase()
  if (!/^\d{12,15}$/.test(whatsapp)) throw invalid('INVALID_PHONE')
  const slugCode = slugProblem(slug)
  if (slugCode) throw invalid(slugCode)
  return { whatsapp, slug }
}

/**
 * Link da Steam do formulário: SteamID, endereço livre, inventário sem loja verificada e público.
 * Devolve { steamid, inventory } (inventário lido, com cache de 10 minutos).
 */
export async function storeInventory(event, steamInput, slug) {
  const { steamApiKey } = useRuntimeConfig(event)
  const steamid = await resolveSteamId(steamInput, steamApiKey)
  await assertAvailable(slug, steamid)
  return { steamid, inventory: await getStore(steamid) }
}

/** Grava o inventário lido (itens, entradas e saídas) numa transação no banco. */
export function saveInventory(storeId, data) {
  return supabase('/rest/v1/rpc/sincronizar_loja', {
    method: 'POST',
    body: {
      p_loja: storeId,
      p_itens: data.items,
      p_nome: data.profile?.name ?? null,
      p_avatar: data.profile?.avatar ?? null,
    },
    timeout: 20000,
    retry: 0,
  })
}

/** Endereço livre e inventário sem loja verificada; senão 409 com o motivo. */
export async function assertAvailable(slug, steamid) {
  let rows
  try {
    rows = await supabase('/rest/v1/lojas', {
      query: {
        or: `(slug.eq.${slug},and(steamid.eq.${steamid},verificada_em.not.is.null))`,
        select: 'slug,steamid,verificada_em',
      },
    })
  } catch (error) {
    throw unavailable('lojas', error)
  }
  const code = rows.some((row) => row.slug === slug)
    ? 'SLUG_TAKEN'
    : rows.some((row) => row.steamid === steamid)
      ? 'STEAM_TAKEN'
      : null
  if (code) throw createError({ statusCode: 409, statusMessage: 'Já existe', data: { code } })
}

/** Loja pela URL, só com as colunas públicas. null se não existe. */
export async function findStoreBySlug(slug) {
  const [row] = await supabase('/rest/v1/lojas', { query: { slug: `eq.${slug}`, select: PUBLIC_COLUMNS } })
  return row ?? null
}

/** No ar: verificada e com o pagamento (ou o teste) em dia. */
export function isOpen(store) {
  return Boolean(store.verificada_em) && Date.parse(store.pago_ate) > Date.now()
}

/**
 * Itens da loja com preço, em cache por 10 minutos. A chave leva a hora da última leitura do
 * inventário: depois de "Atualizar inventário" a loja já mostra os itens novos.
 */
export const getStoreItems = defineCachedFunction(
  async (storeId) => {
    const rows = []
    for (let offset = 0; ; offset += LOTE) {
      const page = await supabase('/rest/v1/itens', {
        query: { loja_id: `eq.${storeId}`, select: 'dados', order: 'assetid', limit: LOTE, offset },
      })
      rows.push(...page)
      if (page.length < LOTE) break
    }
    return attachPrices(rows.map((row) => row.dados).sort(compareItems))
  },
  {
    name: 'loja-itens',
    maxAge: 60 * 10,
    getKey: (storeId, version) => `${storeId}-${version}`,
    validate: (entry) => entry.value !== undefined && entry.value.pricesOk !== false,
  },
)

/** O que o painel mostra da loja. */
export function panelStore(store) {
  const verified = Boolean(store.verificada_em)
  const paid = Boolean(store.pago)
  const readAt = store.inventario_em ? Date.parse(store.inventario_em) : null
  return {
    slug: store.slug,
    steamid: store.steamid,
    whatsapp: store.whatsapp,
    name: store.nome,
    avatar: store.avatar,
    verified,
    code: verified ? null : store.codigo,
    codeExpiresAt: verified ? null : store.codigo_expira_em,
    paidUntil: store.pago_ate,
    open: isOpen(store),
    trial: verified && !paid,
    // Sem teste, verificar_loja grava pago_ate igual à hora da verificação: o SteamID, o e-mail ou
    // o WhatsApp já tinha usado o teste.
    trialUsed: verified && !paid && Date.parse(store.pago_ate) <= Date.parse(store.verificada_em),
    items: store.itens?.[0]?.count ?? 0,
    readAt: store.inventario_em,
    nextRefreshAt: readAt ? new Date(readAt + REFRESH_INTERVAL).toISOString() : null,
  }
}
