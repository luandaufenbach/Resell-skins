// POST /api/painel/itens/:assetid  { hidden?, price?, ask?, cost?, status? }
// Ajustes de um item da própria loja. `price: null` volta ao preço padrão. Resposta: { item }.
export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  rateLimitKey(event, 'item', session.user.id, 600, 10 * 60)

  const assetid = String(getRouterParam(event, 'assetid') ?? '')
  if (!/^\d{1,20}$/.test(assetid)) throw invalid('INVALID_FIELD')

  const store = await ownStore(session)
  if (!store) throw invalid('NO_STORE')

  const changes = itemChanges(await readJson(event))
  if (!Object.keys(changes).length) throw invalid('INVALID_FIELD')

  let rows
  try {
    rows = await supabase('/rest/v1/itens', {
      method: 'PATCH',
      // A loja vem da sessão, nunca do corpo: só os itens da própria loja.
      query: { loja_id: `eq.${store.id}`, assetid: `eq.${assetid}`, select: 'oculto,preco,sob_consulta,custo,situacao' },
      body: changes,
      headers: { Prefer: 'return=representation' },
      retry: 0,
    })
  } catch (error) {
    throw unavailable('itens', error)
  }
  if (!rows.length) {
    throw createError({ statusCode: 404, statusMessage: 'Item não encontrado', data: { code: 'ITEM_NOT_FOUND' } })
  }

  // A loja pública sai do cache na próxima visita.
  await updateStore(store.id, {})
  return { item: itemSettings(rows[0]) }
})
