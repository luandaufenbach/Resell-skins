// POST /api/painel/marca  { name?, tagline?, whatsapp?, socials?, color?, background?, focus? }
// Grava a marca da loja: só os campos que vieram. Logo e banner vão por /api/painel/imagem e o
// endereço por /api/painel/endereco. Resposta: { store }.
export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  rateLimitKey(event, 'marca', session.user.id, 60, 10 * 60)

  const store = await ownStore(session)
  if (!store) throw invalid('NO_STORE')

  const changes = brandChanges(await readJson(event))
  if (Object.keys(changes).length) await updateStore(store.id, changes)
  return { store: panelStore(await ownStore(session)) }
})
