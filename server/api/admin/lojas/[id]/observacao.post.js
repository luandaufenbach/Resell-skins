// POST /api/admin/lojas/:id/observacao  { texto }
// Observação do admin sobre a loja (até 1000 caracteres). Vazia, apaga. O revendedor não vê.
export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event)
  const id = storeIdParam(event)
  const text = adminText((await readJson(event)).texto, 1000)
  await adminStores(id)

  try {
    if (text) {
      await supabase('/rest/v1/observacoes', {
        method: 'POST',
        query: { on_conflict: 'loja_id' },
        body: { loja_id: id, texto: text, alterada_em: new Date().toISOString() },
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        retry: 0,
      })
    } else {
      await supabase('/rest/v1/observacoes', { method: 'DELETE', query: { loja_id: `eq.${id}` }, retry: 0 })
    }
  } catch (error) {
    throw unavailable('admin', error)
  }
  await logAdmin(session, id, 'observacao', { apagada: !text })
  const [store] = await adminStores(id)
  return { store }
})
