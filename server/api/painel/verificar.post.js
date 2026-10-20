// POST /api/painel/verificar
// Prova de posse do inventário sem login da Steam: o código da loja tem que aparecer no perfil
// público do SteamID salvo na loja (resumo, nome ou nome real). Confirmado, a loja fica pública e
// o teste de 7 dias começa (public.verificar_loja).
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
    await supabase('/rest/v1/rpc/verificar_loja', {
      method: 'POST',
      body: { p_slug: store.slug, p_por: 'perfil' },
      retry: 0,
    })
  } catch (error) {
    // Outra loja verificada já tem este SteamID (índice único).
    if (supabaseError(error).code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'Já existe', data: { code: 'STEAM_TAKEN' } })
    }
    throw unavailable('lojas', error)
  }
  return { store: panelStore(await ownStore(session)) }
})
