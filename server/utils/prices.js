// Preço Steam e preço do revendedor de cada item, lidos da tabela de preços do banco
// (atualizada uma vez por dia por scripts/precos.js). Visitar a loja nunca consulta a SteamApis
// nem a Steam. Se o banco não responder, a loja segue sem preços em vez de quebrar.

// A API do Supabase devolve no máximo 1000 linhas por chamada.
const LOTE = 1000

/**
 * Loja (inventário + perfil) com os preços, guardada por 10 minutos. O inventário tem o próprio
 * cache (getStore), então uma falha do banco não entra neste cache e não obriga a consultar a
 * Steam de novo na próxima visita. `steamid` já vem validado pela rota ("demo" ou SteamID64).
 */
export const getPricedStore = defineCachedFunction(
  async (steamid) => {
    const store = steamid === 'demo' ? demoStore() : await getStore(steamid)
    const { items, pricesOk } = await attachPrices(store.items)
    return { ...store, items, pricesOk }
  },
  {
    name: 'priced-store',
    maxAge: 60 * 10,
    getKey: (steamid) => steamid,
    validate: (entry) => entry.value !== undefined && entry.value.pricesOk !== false,
  },
)

/**
 * Acrescenta `price` aos itens: { steam, estimated, seller } ou null (sem preço Steam).
 * `rules` ({ discount, rounding }) vem da loja; sem ele, vale o desconto padrão da configuração,
 * sem arredondar (prévia e demo). `pricesOk` falso indica que o banco falhou; quem guarda em
 * cache não deve guardar esse resultado.
 */
export async function attachPrices(items, rules = null) {
  const names = [...new Set(items.map((item) => item.marketName))]
  if (!names.length) return { items, pricesOk: true }

  try {
    const batches = []
    for (let i = 0; i < names.length; i += LOTE) batches.push(names.slice(i, i + LOTE))
    const [{ discount, rounding }, ...results] = await Promise.all([
      rules ?? defaultRules(),
      ...batches.map((nomes) => supabase('/rest/v1/rpc/precos_por_nome', { method: 'POST', body: { nomes } })),
    ])
    const byName = new Map(results.flat().map((r) => [r.market_hash_name, r]))

    const priced = items.map((item) => {
      const row = byName.get(item.marketName)
      if (!row) return { ...item, price: null }
      const steam = Number(row.preco_steam_brl)
      return { ...item, price: { steam, estimated: row.estimado, seller: sellerPrice(steam, discount, rounding) } }
    })
    return { items: priced, pricesOk: true }
  } catch (error) {
    console.error('[preços] banco indisponível:', error.message)
    return { items: items.map((item) => ({ ...item, price: null })), pricesOk: false }
  }
}

// Desconto padrão sobre o preço Steam (0.30 = 30%), da tabela de configuração.
async function defaultRules() {
  const { desconto_padrao: value } = await readConfig(['desconto_padrao'])
  return { discount: value >= 0 && value < 1 ? value : DEFAULT_DISCOUNT, rounding: 'centavos' }
}
