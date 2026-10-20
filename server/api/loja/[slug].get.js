// GET /api/loja/:slug
// Loja pública, no mesmo formato de /api/demo e /api/previa/:id, mais o slug. Lê só o banco:
// nenhuma consulta à Steam nem à SteamApis.
// Inexistente: 404 (STORE_NOT_FOUND). Não verificada ou vencida: 403 (STORE_UNAVAILABLE).
export default defineEventHandler(async (event) => {
  rateLimit(event, 'ler', 60, 60)

  const slug = String(getRouterParam(event, 'slug') ?? '')
  let store = null
  if (!slugProblem(slug)) {
    try {
      store = await findStoreBySlug(slug)
    } catch (error) {
      throw unavailable('loja', error)
    }
  }

  if (!store) {
    throw createError({ statusCode: 404, statusMessage: 'Loja não encontrada', data: { code: 'STORE_NOT_FOUND' } })
  }
  if (!isOpen(store)) {
    throw createError({ statusCode: 403, statusMessage: 'Loja indisponível', data: { code: 'STORE_UNAVAILABLE' } })
  }

  const readAt = store.inventario_em ? Date.parse(store.inventario_em) : 0
  const { items, pricesOk } = await getStoreItems(store.id, readAt).catch((error) => {
    throw unavailable('loja', error)
  })
  return {
    slug: store.slug,
    profile: {
      name: store.nome,
      avatar: store.avatar,
      url: `https://steamcommunity.com/profiles/${store.steamid}`,
    },
    items,
    pricesOk,
    whatsapp: store.whatsapp,
    fetchedAt: readAt || null,
  }
})
