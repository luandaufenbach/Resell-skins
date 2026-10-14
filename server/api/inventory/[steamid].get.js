// GET /api/inventory/:steamid
// Resposta: { steamid, profile: { name, avatar, url } | null, items: [...], fetchedAt }
// Use "demo" como steamid para ver o catálogo de exemplo sem consultar a Steam.
export default defineEventHandler(async (event) => {
  const steamid = getRouterParam(event, 'steamid')

  if (steamid === 'demo') return demoStore()

  if (!isSteamId64(steamid)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'SteamID inválido',
      data: { code: 'INVALID_INPUT' },
    })
  }

  return getStore(steamid)
})
