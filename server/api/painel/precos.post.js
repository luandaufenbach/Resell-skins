// POST /api/painel/precos  { discount?, rounding? }
// Desconto padrão da loja (em %, de 0 a 80) e arredondamento do preço do revendedor.
export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  rateLimitKey(event, 'precos', session.user.id, 60, 10 * 60)

  const store = await ownStore(session)
  if (!store) throw invalid('NO_STORE')

  const changes = pricingChanges(await readJson(event))
  if (Object.keys(changes).length) await updateStore(store.id, changes)
  return { store: panelStore(await ownStore(session)) }
})
