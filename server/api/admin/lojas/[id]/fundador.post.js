// POST /api/admin/lojas/:id/fundador  { fundador }
// Marca ou desmarca o preço de fundador: o valor da loja passa a ser o do plano na configuração,
// com ou sem o desconto. 409 FOUNDERS_FULL quando as vagas acabaram.
export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event)
  const id = storeIdParam(event)
  const { fundador } = await readJson(event)
  if (typeof fundador !== 'boolean') throw invalid('INVALID_FIELD')

  try {
    await supabase('/rest/v1/rpc/marcar_fundador', {
      method: 'POST',
      body: { p_loja: id, p_fundador: fundador },
      retry: 0,
    })
  } catch (error) {
    adminDbError(error)
  }
  await logAdmin(session, id, fundador ? 'fundador' : 'fundador_fora')
  const [store] = await adminStores(id)
  return { store }
})
