// Lojas dos revendedores: criação pelo painel, código de posse, inventário e leitura pública. O
// visitante da loja nunca dispara consulta à Steam: os itens ficam no banco e só o revendedor pede
// para atualizar.

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const CODE_TTL = 24 * 60 * 60 * 1000
export const REFRESH_INTERVAL = 10 * 60 * 1000

// A API do Supabase devolve no máximo 1000 linhas por chamada.
const LOTE = 1000

// Colunas que a loja pública usa: nada de código, e-mail, plano ou pagamento.
const PUBLIC_COLUMNS = [
  'id,slug,steamid,whatsapp,nome,avatar,verificada_em,pago_ate,inventario_em,alterada_em',
  'nome_loja,frase,redes,logo,banner,banner_x,banner_y,cor,fundo,desconto,arredondamento',
].join(',')

// Colunas dos itens que a loja pública lê. O custo fica de fora: é só do revendedor.
const PUBLIC_ITEM_COLUMNS = 'dados,preco,sob_consulta,situacao'

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
  let old
  try {
    ;[rows, old] = await Promise.all([
      supabase('/rest/v1/lojas', {
        query: {
          or: `(slug.eq.${slug},and(steamid.eq.${steamid},verificada_em.not.is.null))`,
          select: 'slug,steamid,verificada_em',
        },
      }),
      oldAddress(slug),
    ])
  } catch (error) {
    throw unavailable('lojas', error)
  }
  const code =
    old || rows.some((row) => row.slug === slug)
      ? 'SLUG_TAKEN'
      : rows.some((row) => row.steamid === steamid)
        ? 'STEAM_TAKEN'
        : null
  if (code) throw slugTaken(code)
}

/** Troca o endereço da loja. O antigo redireciona para o novo por 60 dias (public.trocar_endereco). */
export async function changeSlug(storeId, slug) {
  try {
    await supabase('/rest/v1/rpc/trocar_endereco', { method: 'POST', body: { p_loja: storeId, p_slug: slug }, retry: 0 })
  } catch (error) {
    const { code } = supabaseError(error)
    // Endereço de outra loja, atual ou antigo ainda valendo (índice único ou interno.endereco_livre).
    if (code === '23505') throw slugTaken('SLUG_TAKEN')
    if (code === 'P0001' && error?.data?.hint === 'SLUG_CHANGES') {
      throw createError({ statusCode: 429, statusMessage: 'Trocas demais', data: { code: 'SLUG_CHANGES' } })
    }
    throw unavailable('lojas', error)
  }
}

/**
 * Loja pela URL, só com as colunas públicas. null se não existe; { moved } quando o endereço é
 * antigo e ainda redireciona para o atual.
 */
export async function findStoreBySlug(slug) {
  const [row] = await supabase('/rest/v1/lojas', { query: { slug: `eq.${slug}`, select: PUBLIC_COLUMNS } })
  if (row) return row
  const old = await oldAddress(slug)
  return old?.current ? { moved: old.current } : null
}

// Endereço antigo ainda reservado: { current } com o endereço atual da loja que o usava (null se a
// loja foi apagada; a reserva vale assim mesmo). null se não está reservado.
async function oldAddress(slug) {
  const [row] = await supabase('/rest/v1/enderecos_antigos', {
    query: { slug: `eq.${slug}`, ate: `gt.${new Date().toISOString()}`, select: 'lojas(slug)' },
  })
  return row ? { current: row.lojas?.slug ?? null } : null
}

function slugTaken(code) {
  return createError({ statusCode: 409, statusMessage: 'Já existe', data: { code } })
}

/** Grava mudanças do painel na loja e marca a hora: a loja pública sai do cache na próxima visita. */
export async function updateStore(storeId, changes) {
  try {
    await supabase('/rest/v1/lojas', {
      method: 'PATCH',
      query: { id: `eq.${storeId}` },
      body: { ...changes, alterada_em: new Date().toISOString() },
      headers: { Prefer: 'return=minimal' },
      retry: 0,
    })
  } catch (error) {
    // Nome com "steam" ou outro limite do banco que o servidor não pegou antes.
    if (supabaseError(error).code === '23514') throw invalid('INVALID_FIELD')
    throw unavailable('lojas', error)
  }
}

/** Desconto e arredondamento da loja, no formato de attachPrices. */
export function storeRules(store) {
  return {
    discount: Number(store.desconto ?? DEFAULT_DISCOUNT),
    rounding: isRounding(store.arredondamento) ? store.arredondamento : 'centavos',
  }
}

/** Versão da loja para o cache: muda quando o inventário é lido e quando o painel grava algo. */
export function storeVersion(store) {
  return Math.max(Date.parse(store.inventario_em ?? 0) || 0, Date.parse(store.alterada_em ?? 0) || 0)
}

/** Marca da loja como a loja pública e o painel mostram. */
export function storeBrand(store) {
  return {
    name: store.nome_loja ?? null,
    tagline: store.frase ?? null,
    logo: imageUrl(store.logo),
    banner: imageUrl(store.banner),
    focus: { x: store.banner_x ?? 50, y: store.banner_y ?? 50 },
    socials: socialLinks(store.redes),
    theme: { cor: store.cor ?? null, fundo: store.fundo ?? 'escuro' },
  }
}

/** No ar: verificada e com o pagamento (ou o teste) em dia. */
export function isOpen(store) {
  return Boolean(store.verificada_em) && Date.parse(store.pago_ate) > Date.now()
}

/**
 * Itens visíveis da loja com preço, em cache por 10 minutos. A chave leva a versão da loja
 * (storeVersion): depois de "Atualizar inventário" ou de uma mudança no painel, a loja já mostra
 * o que mudou. `rules` é o desconto e o arredondamento da loja (storeRules).
 */
export const getStoreItems = defineCachedFunction(
  async (storeId, version, rules) => {
    const rows = []
    for (let offset = 0; ; offset += LOTE) {
      const page = await supabase('/rest/v1/itens', {
        query: {
          loja_id: `eq.${storeId}`,
          oculto: 'is.false',
          select: PUBLIC_ITEM_COLUMNS,
          order: 'assetid',
          limit: LOTE,
          offset,
        },
      })
      rows.push(...page)
      if (page.length < LOTE) break
    }
    const settings = new Map(rows.map((row) => [row.dados.id, row]))
    const { items, pricesOk } = await attachPrices(rows.map((row) => row.dados).sort(compareItems), rules)
    const out = items.map((item) => withSettings(item, settings.get(item.id)))
    // Vendidos vão para o fim: continuam na loja até sair do inventário, mas não disputam a vitrine.
    out.sort((a, b) => (a.status === 'vendido') - (b.status === 'vendido'))
    return { items: out, pricesOk }
  },
  {
    name: 'loja-itens',
    maxAge: 60 * 10,
    getKey: (storeId, version) => `${storeId}-${version}`,
    validate: (entry) => entry.value !== undefined && entry.value.pricesOk !== false,
  },
)

/**
 * Ajustes do revendedor sobre o item: preço manual ou "sob consulta" e a situação (reservado ou
 * vendido). O preço manual troca o do revendedor e mantém o preço Steam para o riscado.
 */
function withSettings(item, row) {
  const out = { ...item, status: row?.situacao ?? null }
  if (row?.sob_consulta) return { ...out, price: null, ask: true }
  if (row?.preco != null) {
    return {
      ...out,
      price: { steam: item.price?.steam ?? null, estimated: item.price?.estimated ?? false, seller: Number(row.preco) },
    }
  }
  return out
}

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
    brand: storeBrand(store),
    // Usuários das redes como foram gravados, para o formulário da marca.
    handles: store.redes ?? {},
    pricing: { discount: Math.round(storeRules(store).discount * 100), rounding: storeRules(store).rounding },
    plan: { id: store.plano, value: store.valor == null ? null : Number(store.valor) },
  }
}
