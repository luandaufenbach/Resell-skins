// Job diário de preços. Uso: npm run precos (ou pelo agendamento do GitHub Actions).
// 1. Câmbio do dia: PTAX de venda do Banco Central (serviço Olinda).
// 2. Lista de preços do mercado da Steam da SteamApis (um arquivo com todos os itens, em USD).
// 3. Grava os dados crus, recalcula os fatores de calibração e o preço Steam de cada item.
// Precisa de NUXT_STEAMAPIS_KEY e PRECOS_DB_URL (papel job_precos, só com o acesso que o job usa).
// O log do GitHub Actions é público: nada de host, usuário ou corpo de resposta nas mensagens.
// A loja nunca chama a SteamApis.
import { connect, describeTarget, safeError } from './db.js'

const LISTA = 'https://api.steamapis.com/v2/steam/items/730/list'
const PTAX =
  'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)'
const ARQUIVO_HOSTS = /(^|\.)(r2\.cloudflarestorage\.com|steamapis\.com)$/
const LISTA_MAX_IDADE = 3 * 24 * 3600 * 1000
const LOTE = 5000

const missing = ['NUXT_STEAMAPIS_KEY', 'PRECOS_DB_URL'].filter((name) => !process.env[name])
if (missing.length) {
  fail(`Falta ${missing.join(' e ')} (no GitHub: Settings > Secrets and variables > Actions > Repository secrets).`)
  process.exit(1)
}

const sql = connect(process.env.PRECOS_DB_URL)

try {
  await saveExchangeRate()
  const items = await fetchPriceList()
  await savePrices(items)

  await sql`select interno.calibrar()`
  await sql`select interno.recalcular_precos()`

  const [r] = await sql`
    select
      count(*)::int as itens,
      count(preco_steam_brl)::int as com_preco,
      count(*) filter (where estimado)::int as estimados
    from public.precos`
  console.log(`Preços: ${r.itens} itens, ${r.com_preco} com preço Steam (${r.estimados} estimados).`)
} catch (error) {
  const target = /^E[A-Z]+$/.test(error.code ?? '') ? ` (banco: ${describeTarget(process.env.PRECOS_DB_URL)})` : ''
  fail(`Erro: ${safeError(error)}${target}`)
  process.exitCode = 1
} finally {
  await sql.end({ timeout: 5 })
}

// No GitHub Actions a mensagem também vira uma anotação da execução, que aparece no resumo e
// na API pública sem precisar abrir o log.
function fail(message) {
  console.error(message)
  if (process.env.GITHUB_ACTIONS) console.log(`::error title=precos::${message}`)
}

// Última PTAX dos últimos 10 dias (fim de semana e feriado não têm cotação). Cotação fora de uma
// faixa plausível é descartada. Sem cotação nova, o cálculo usa a última gravada.
async function saveExchangeRate() {
  try {
    const day = (d) => `'${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${d.getFullYear()}'`
    const url = new URL(PTAX)
    url.searchParams.set('@dataInicial', day(new Date(Date.now() - 10 * 864e5)))
    url.searchParams.set('@dataFinalCotacao', day(new Date()))
    url.searchParams.set('$format', 'json')
    url.searchParams.set('$select', 'cotacaoVenda,dataHoraCotacao')

    const { value } = await (await fetch(url)).json()
    const last = value?.at(-1)
    const rate = Number(last?.cotacaoVenda)
    const date = String(last?.dataHoraCotacao).slice(0, 10)
    if (!(rate > 2 && rate < 15) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('cotação ausente ou fora da faixa esperada')

    await sql`
      insert into public.cambio (data, usd_brl) values (${date}, ${rate})
      on conflict (data) do update set usd_brl = excluded.usd_brl`
    console.log(`Câmbio: US$ 1 = R$ ${rate} (PTAX de ${date}).`)
  } catch (error) {
    console.warn('Câmbio não atualizado, usando o último gravado:', safeError(error))
  }
}

// A SteamApis responde com um redirecionamento para o arquivo pronto. O redirecionamento é
// seguido à mão, só para HTTPS num host esperado, e a chave não vai junto.
async function fetchPriceList() {
  const res = await fetch(LISTA, { headers: { 'x-api-key': process.env.NUXT_STEAMAPIS_KEY }, redirect: 'manual' })
  const location = res.headers.get('location')
  if (!location) throw new Error(`SteamApis respondeu ${res.status}`)

  const url = new URL(location)
  if (url.protocol !== 'https:' || !ARQUIVO_HOSTS.test(url.hostname)) {
    throw new Error('SteamApis redirecionou para um endereço inesperado')
  }

  const file = await fetch(url)
  if (!file.ok) throw new Error(`Arquivo de preços respondeu ${file.status}`)
  const { metadata, items } = await file.json()

  if (!Array.isArray(items) || !(Date.now() - metadata?.generatedAt < LISTA_MAX_IDADE)) {
    throw new Error('Lista de preços inválida ou com mais de 3 dias')
  }
  console.log(`SteamApis: ${items.length} itens, gerado em ${new Date(metadata.generatedAt).toISOString()}.`)
  return items
}

async function savePrices(items) {
  const rows = new Map()
  for (const item of items) {
    if (typeof item.marketHashName !== 'string' || !item.marketHashName) continue
    rows.set(item.marketHashName, {
      market_hash_name: item.marketHashName,
      menor_anuncio_usd: positive(item.orderBook?.lowestSell),
      mediana_recente_usd: positive(item.prices?.recent?.median),
      vendas_recentes: Number.isInteger(item.volume?.recent) && item.volume.recent > 0 ? item.volume.recent : 0,
      ultima_venda_usd: positive(item.prices?.all?.latest),
      ultima_venda_em: positive(item.lastSale) ? new Date(item.lastSale) : null,
      atualizado_em: new Date(positive(item.updatedAt) ?? Date.now()),
    })
  }

  const list = [...rows.values()]
  for (let i = 0; i < list.length; i += LOTE) {
    await sql`
      insert into public.precos ${sql(list.slice(i, i + LOTE))}
      on conflict (market_hash_name) do update set
        menor_anuncio_usd = excluded.menor_anuncio_usd,
        mediana_recente_usd = excluded.mediana_recente_usd,
        vendas_recentes = excluded.vendas_recentes,
        ultima_venda_usd = excluded.ultima_venda_usd,
        ultima_venda_em = excluded.ultima_venda_em,
        atualizado_em = excluded.atualizado_em`
  }
}

// Número finito e maior que zero; qualquer outra coisa vira "sem valor".
function positive(value) {
  return Number.isFinite(value) && value > 0 ? value : null
}
