// POST /api/admin/lojas/:id/bloqueio  { bloqueada }
// Bloqueio manual: a loja sai do ar na hora, mesmo paga ("loja indisponível"), e o painel do
// revendedor avisa que ela foi suspensa. Registrar um pagamento também desbloqueia.
export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event)
  const id = storeIdParam(event)
  const { bloqueada } = await readJson(event)
  if (typeof bloqueada !== 'boolean') throw invalid('INVALID_FIELD')

  // Confere que a loja existe antes de gravar (404 se não).
  const [current] = await adminStores(id)
  if (Boolean(current.blockedAt) !== bloqueada) {
    await updateStore(id, { bloqueada_em: bloqueada ? new Date().toISOString() : null })
    await logAdmin(session, id, bloqueada ? 'bloqueio' : 'desbloqueio')
  }
  const [store] = await adminStores(id)
  return { store }
})
