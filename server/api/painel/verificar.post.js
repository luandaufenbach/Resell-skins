// POST /api/painel/verificar
// Prova de posse do inventário sem login da Steam: o código da loja tem que aparecer no perfil
// público do SteamID salvo na loja (resumo, nome ou nome real). Confirmado, a loja fica pública e
// o teste de 7 dias começa (public.verificar_loja_id). A gravação é pelo id da loja, com o SteamID
// e o código conferidos aqui: se a loja mudou enquanto o perfil era lido, 409 STORE_CHANGED.
export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  // Cada tentativa lê o perfil na Steam, que conta na cota do site inteiro.
  rateLimitKey(event, 'verificar', session.user.id, 5, 10 * 60)

  const store = await ownStore(session)
  if (!store) throw invalid('NO_STORE')
  if (store.verificada_em) return { store: panelStore(store) }
  if (!store.codigo || Date.parse(store.codigo_expira_em) <= Date.now()) throw invalid('CODE_EXPIRED')

  if (!(await profileHasCode(store.steamid, store.codigo))) throw invalid('CODE_NOT_FOUND')

  try {
    await supabase('/rest/v1/rpc/verificar_loja_id', {
      method: 'POST',
      body: { p_loja: store.id, p_por: 'perfil', p_steamid: store.steamid, p_codigo: store.codigo },
      retry: 0,
    })
  } catch (error) {
    throw verifyError(error, 'lojas')
  }
  return { store: panelStore(await ownStore(session)) }
})
