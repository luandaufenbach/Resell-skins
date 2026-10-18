// GET /api/inventory/:steamid
// Resposta: { steamid, profile: { name, avatar, url } | null, items: [...], fetchedAt, pricesOk }
// Cada item traz `price` ({ steam, estimated, seller } ou null), lido da tabela de preços.
// Use "demo" como steamid para ver o catálogo de exemplo sem consultar a Steam.
export default defineEventHandler(async (event) => {
  const steamid = getRouterParam(event, 'steamid')

  if (steamid !== 'demo' && !isSteamId64(steamid)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'SteamID inválido',
      data: { code: 'INVALID_INPUT' },
    })
  }

  return getPricedStore(steamid)
})
