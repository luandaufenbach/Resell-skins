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
 * `pricesOk` falso indica que o banco falhou; quem guarda em cache não deve guardar esse resultado.
 */
export async function attachPrices(items) {
  const names = [...new Set(items.map((item) => item.marketName))]
  if (!names.length) return { items, pricesOk: true }

  try {
    const batches = []
    for (let i = 0; i < names.length; i += LOTE) batches.push(names.slice(i, i + LOTE))
    const [discount, ...results] = await Promise.all([
      defaultDiscount(),
      ...batches.map((nomes) => supabase('/rest/v1/rpc/precos_por_nome', { method: 'POST', body: { nomes } })),
    ])
    const byName = new Map(results.flat().map((r) => [r.market_hash_name, r]))

    const priced = items.map((item) => {
      const row = byName.get(item.marketName)
      if (!row) return { ...item, price: null }
      const steam = Number(row.preco_steam_brl)
      return {
        ...item,
        price: { steam, estimated: row.estimado, seller: Math.round(steam * (1 - discount) * 100) / 100 },
      }
    })
    return { items: priced, pricesOk: true }
  } catch (error) {
    console.error('[preços] banco indisponível:', error.message)
    return { items: items.map((item) => ({ ...item, price: null })), pricesOk: false }
  }
}

// Desconto padrão da loja sobre o preço Steam (0.30 = 30%), da tabela de configuração.
async function defaultDiscount() {
  const [row] = await supabase('/rest/v1/configuracao', { query: { chave: 'eq.desconto_padrao', select: 'valor' } })
  const value = Number(row?.valor)
  return value >= 0 && value < 1 ? value : 0.3
}

function supabase(path, options = {}) {
  const { supabaseUrl, supabaseSecretKey } = useRuntimeConfig()
  if (!supabaseUrl || !supabaseSecretKey) throw new Error('NUXT_SUPABASE_URL ou NUXT_SUPABASE_SECRET_KEY ausente')

  return $fetch(path, {
    baseURL: supabaseUrl,
    headers: { apikey: supabaseSecretKey, Authorization: `Bearer ${supabaseSecretKey}` },
    timeout: 8000,
    retry: 1,
    ...options,
  })
}
