// POST /api/painel/loja  { steam, whatsapp, slug }
// Cria a loja da conta com os dados conferidos no painel (vêm preenchidos com os do cadastro).
// Mesmas regras do cadastro: endereço livre e não reservado, inventário público e sem loja
// verificada. Depois de criada, WhatsApp e endereço mudam na aba Marca do painel.
export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  rateLimitKey(event, 'criar-loja', session.user.id, 10, 60 * 60)

  const existing = await ownStore(session)
  if (existing) return { store: panelStore(existing) }

  const body = (await readBody(event).catch(() => null)) ?? {}
  const { whatsapp, slug } = storeFields(body)
  const { steamid, inventory } = await storeInventory(event, body.steam, slug)

  const store = await createStore(session, { slug, steamid, whatsapp }, inventory)
  return { store: panelStore(store) }
})
