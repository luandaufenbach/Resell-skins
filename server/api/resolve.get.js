// GET /api/resolve?url=<link do perfil, link de troca ou apelido>
// Resposta: { steamid: "7656119..." }
export default defineEventHandler(async (event) => {
  const { url } = getQuery(event)
  const { steamApiKey } = useRuntimeConfig(event)
  const steamid = await resolveSteamId(url, steamApiKey)
  return { steamid }
})
