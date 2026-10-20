// POST /api/painel/atualizar
// Relê o inventário na Steam e grava o que entrou e o que saiu. No máximo uma vez a cada 10
// minutos por loja: a Steam bloqueia o IP do servidor quando recebe consultas demais.
// Resposta: { store, result: { total, entraram, sairam } }.
import { REFRESH_INTERVAL } from '../../utils/stores.js'

const running = new Set()

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const store = await ownStore(session)
  if (!store) throw invalid('NO_STORE')

  const next = store.inventario_em ? Date.parse(store.inventario_em) + REFRESH_INTERVAL : 0
  if (next > Date.now() || running.has(store.id)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Espere um pouco',
      data: { code: 'TOO_SOON', retryAt: new Date(Math.max(next, Date.now())).toISOString() },
    })
  }

  // Conta a tentativa, não só a leitura que deu certo: com o inventário privado, a leitura falha,
  // o intervalo não começa e alguém poderia esgotar a cota de consultas à Steam do site inteiro.
  rateLimitKey(event, 'atualizar', store.id, 3, 10 * 60)

  running.add(store.id)
  try {
    const data = await readStore(store.steamid)
    const result = await saveInventory(store.id, data).catch((error) => {
      throw unavailable('lojas', error)
    })
    return { store: panelStore(await ownStore(session)), result }
  } finally {
    running.delete(store.id)
  }
})
