// GET /api/loja/:slug
// Loja pública, no mesmo formato de /api/demo e /api/previa/:id, mais o slug, a marca e o desconto
// da loja. Lê só o banco: nenhuma consulta à Steam nem à SteamApis. Itens ocultos e o custo dos
// itens não saem daqui.
// Inexistente: 404 (STORE_NOT_FOUND). Não verificada ou vencida: 403 (STORE_UNAVAILABLE).
// Endereço antigo: { moved: '<endereço atual>' }, e a página redireciona.
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
  if (store.moved) return { moved: store.moved }
  if (!isOpen(store)) {
    throw createError({ statusCode: 403, statusMessage: 'Loja indisponível', data: { code: 'STORE_UNAVAILABLE' } })
  }

  const rules = storeRules(store)
  const { items, pricesOk } = await getStoreItems(store.id, storeVersion(store), rules).catch((error) => {
    throw unavailable('loja', error)
  })
  return {
    slug: store.slug,
    profile: {
      name: store.nome_loja ?? store.nome,
      avatar: store.avatar,
      url: `https://steamcommunity.com/profiles/${store.steamid}`,
    },
    brand: storeBrand(store),
    discount: rules.discount,
    items,
    pricesOk,
    whatsapp: store.whatsapp,
    fetchedAt: store.inventario_em ? Date.parse(store.inventario_em) : null,
  }
})
