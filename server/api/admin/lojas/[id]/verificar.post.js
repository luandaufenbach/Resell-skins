// POST /api/admin/lojas/:id/verificar  { steamid }
// Verificação manual da posse do inventário (quando o revendedor não consegue pôr o código no
// perfil). Como a verificação pelo perfil, começa o teste de 7 dias, a menos que o SteamID, o
// e-mail ou o WhatsApp já tenham usado um (public.verificar_loja_id). `steamid` é o que o admin
// viu na tela: se a loja agora tem outro, 409 STORE_CHANGED e nada muda.
export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event)
  const id = storeIdParam(event)
  const { steamid } = await readJson(event)
  if (!isSteamId64(steamid)) throw invalid('INVALID_FIELD')
  const [current] = await adminStores(id)

  if (!current.verified) {
    try {
      await supabase('/rest/v1/rpc/verificar_loja_id', {
        method: 'POST',
        body: { p_loja: id, p_por: 'admin', p_steamid: steamid, p_codigo: null },
        retry: 0,
      })
    } catch (error) {
      throw verifyError(error, 'admin')
    }
    await logAdmin(session, id, 'verificar', { steamid })
  }
  const [store] = await adminStores(id)
  return { store }
})
