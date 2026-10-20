// POST /api/painel/codigo
// Gera outro código de posse (o anterior vence em 24h).
import { CODE_TTL } from '../../utils/stores.js'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  rateLimitKey(event, 'codigo', session.user.id, 10, 60 * 60)

  const store = await ownStore(session)
  if (!store) throw invalid('NO_STORE')
  if (store.verificada_em) return { store: panelStore(store) }

  const changes = { codigo: newCode(), codigo_expira_em: new Date(Date.now() + CODE_TTL).toISOString() }
  try {
    await supabase('/rest/v1/lojas', {
      method: 'PATCH',
      query: { id: `eq.${store.id}`, verificada_em: 'is.null' },
      body: changes,
      headers: { Prefer: 'return=minimal' },
    })
  } catch (error) {
    throw unavailable('lojas', error)
  }
  return { store: panelStore({ ...store, ...changes }) }
})
