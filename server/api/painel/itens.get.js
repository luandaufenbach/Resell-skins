// GET /api/painel/itens
// Todos os itens da loja (inclusive os ocultos) com os ajustes do revendedor e os dois preços: o
// padrão (preço Steam menos o desconto da loja) e o manual. O custo só sai aqui, para o dono.
// Lido com o token dele: o RLS só deixa ver os itens da própria loja.
const LOTE = 1000

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  rateLimitKey(event, 'itens', session.user.id, 120, 10 * 60)

  const store = await ownStore(session)
  if (!store) throw invalid('NO_STORE')

  const rows = []
  try {
    for (let offset = 0; ; offset += LOTE) {
      const page = await supabaseAs(session.token, '/rest/v1/itens', {
        query: {
          loja_id: `eq.${store.id}`,
          select: 'dados,oculto,preco,sob_consulta,custo,situacao',
          order: 'assetid',
          limit: LOTE,
          offset,
        },
      })
      rows.push(...page)
      if (page.length < LOTE) break
    }
  } catch (error) {
    throw unavailable('itens', error)
  }

  rows.sort((a, b) => compareItems(a.dados, b.dados))
  const { items, pricesOk } = await attachPrices(
    rows.map((row) => row.dados),
    storeRules(store),
  )
  return { items: items.map((item, i) => panelItem(item, rows[i])), pricesOk }
})
