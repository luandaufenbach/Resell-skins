// POST /api/admin/lojas/:id/pagamento  { meses, valor, observacao? }
// Registra um Pix recebido: período de 1 ou 3 meses, somado a partir do vencimento ou de hoje, o
// que for maior. Tira o bloqueio e põe a loja no plano do período (public.registrar_pagamento).
const MAX_VALUE = 10000

export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event)
  const id = storeIdParam(event)
  const body = await readJson(event)

  const months = body.meses
  if (months !== 1 && months !== 3) throw invalid('INVALID_FIELD')
  const value = body.valor
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > MAX_VALUE) {
    throw invalid('PAYMENT_VALUE')
  }
  const note = adminText(body.observacao, 300)

  try {
    await supabase('/rest/v1/rpc/registrar_pagamento', {
      method: 'POST',
      body: {
        p_loja: id,
        p_meses: months,
        p_valor: Math.round(value * 100) / 100,
        p_observacao: note,
        p_admin: session.user.email,
      },
      // Repetir sozinho registraria o pagamento duas vezes.
      retry: 0,
    })
  } catch (error) {
    adminDbError(error)
  }
  await logAdmin(session, id, 'pagamento', { meses: months, valor: Math.round(value * 100) / 100 })
  const [store] = await adminStores(id)
  return { store }
})
