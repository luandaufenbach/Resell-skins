// O que o painel pode gravar, conferido campo a campo antes de ir para o banco (que repete os
// limites). Cada função recebe o corpo da requisição e devolve só as colunas que vieram nele.

const MAX_MONEY = 10_000_000

// Caracteres aceitos no nome e na frase: letras latinas (com acento), números, espaço, pontuação e
// símbolos comuns; na frase, também emoji. Letras de outros alfabetos ficam de fora porque algumas
// imitam as latinas ("Ѕteam" com S cirílico) e passariam pela trava de Steam e Valve.
const TEXT_CHARS = String.raw`\p{Script=Latin}\p{N}\p{Zs}\p{P}\p{Sc}+=<>|~^°`
const NAME_PATTERN = new RegExp(`^[${TEXT_CHARS}]*$`, 'u')
const TAGLINE_PATTERN = new RegExp(String.raw`^[${TEXT_CHARS}\p{Extended_Pictographic}\p{Emoji_Component}️]*$`, 'u')

/** Marca: nome, frase, WhatsApp, redes, cor, fundo e ponto de foco do banner. */
export function brandChanges(body) {
  const changes = {}
  if (has(body, 'name')) {
    const name = cleanText(body.name, 40, 'NAME_INVALID')
    if (name && !NAME_PATTERN.test(name)) throw invalid('NAME_INVALID')
    if (name && looksLikeSteam(name)) throw invalid('NAME_RESERVED')
    changes.nome_loja = name
  }
  if (has(body, 'tagline')) {
    const tagline = cleanText(body.tagline, 120, 'TAGLINE_INVALID')
    if (tagline && !TAGLINE_PATTERN.test(tagline)) throw invalid('TAGLINE_INVALID')
    if (tagline && looksLikeSteam(tagline)) throw invalid('TAGLINE_RESERVED')
    changes.frase = tagline
  }
  if (has(body, 'whatsapp')) {
    const whatsapp = String(body.whatsapp ?? '')
    if (!/^\d{12,15}$/.test(whatsapp)) throw invalid('INVALID_PHONE')
    changes.whatsapp = whatsapp
  }
  if (has(body, 'socials')) {
    const redes = {}
    for (const network of SOCIALS) {
      const handle = socialHandle(network.id, body.socials?.[network.id])
      if (handle === null) {
        throw createError({ statusCode: 400, statusMessage: 'Dados inválidos', data: { code: 'SOCIAL_INVALID', network: network.id } })
      }
      if (handle) redes[network.id] = handle
    }
    changes.redes = redes
  }
  if (has(body, 'color')) {
    const color = body.color ? String(body.color).replace(/^#/, '').toLowerCase() : null
    if (color && !/^[0-9a-f]{6}$/.test(color)) throw invalid('INVALID_FIELD')
    changes.cor = color
  }
  if (has(body, 'background')) {
    if (!['escuro', 'claro'].includes(body.background)) throw invalid('INVALID_FIELD')
    changes.fundo = body.background
  }
  if (has(body, 'focus')) {
    const { x, y } = body.focus ?? {}
    if (![x, y].every((v) => Number.isInteger(v) && v >= 0 && v <= 100)) throw invalid('INVALID_FIELD')
    changes.banner_x = x
    changes.banner_y = y
  }
  return changes
}

/** Desconto padrão (em %, de 0 a 80) e arredondamento. */
export function pricingChanges(body) {
  const changes = {}
  if (has(body, 'discount')) {
    const percent = body.discount
    if (!Number.isInteger(percent) || percent < 0 || percent > MAX_DISCOUNT * 100) throw invalid('DISCOUNT_INVALID')
    changes.desconto = percent / 100
  }
  if (has(body, 'rounding')) {
    if (!isRounding(body.rounding)) throw invalid('INVALID_FIELD')
    changes.arredondamento = body.rounding
  }
  return changes
}

/** Ajustes de um item: oculto, preço manual (null volta ao padrão), sob consulta, custo e situação. */
export function itemChanges(body) {
  const changes = {}
  if (has(body, 'hidden')) changes.oculto = bool(body.hidden)
  if (has(body, 'ask')) changes.sob_consulta = bool(body.ask)
  if (has(body, 'price')) changes.preco = money(body.price, 'PRICE_INVALID', 0.01)
  if (has(body, 'cost')) changes.custo = money(body.cost, 'COST_INVALID', 0)
  if (has(body, 'status')) {
    if (![null, 'reservado', 'vendido'].includes(body.status)) throw invalid('INVALID_FIELD')
    changes.situacao = body.status
  }
  return changes
}

/** Ajustes do item como o painel usa (custo incluso: só o dono vê). */
export function itemSettings(row) {
  return {
    hidden: row.oculto,
    price: row.preco == null ? null : Number(row.preco),
    ask: row.sob_consulta,
    cost: row.custo == null ? null : Number(row.custo),
    status: row.situacao,
  }
}

/**
 * Item da lista do painel: o necessário para reconhecer a skin, o preço Steam, o padrão (Steam
 * menos o desconto da loja) e os ajustes. Sem stickers nem links, para a lista não pesar.
 */
export function panelItem(item, row) {
  return {
    id: item.id,
    marketName: item.marketName,
    localName: item.localName,
    weapon: item.weapon,
    skin: item.skin,
    type: item.type,
    category: item.category,
    star: item.star,
    stattrak: item.stattrak,
    souvenir: item.souvenir,
    rarity: item.rarity,
    wear: item.wear,
    float: item.float,
    image: item.image,
    quantity: item.quantity,
    tradable: item.tradable,
    tradableAt: item.tradableAt,
    tradeLock: item.tradeLock,
    steam: item.price?.steam ?? null,
    estimated: item.price?.estimated ?? false,
    standard: item.price?.seller ?? null,
    ...itemSettings(row),
  }
}

/** Corpo JSON da requisição como objeto (ou {} quando não veio nada que preste). */
export async function readJson(event) {
  const body = await readBody(event).catch(() => null)
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {}
}

function has(body, key) {
  return Object.hasOwn(body, key)
}

function bool(value) {
  if (typeof value !== 'boolean') throw invalid('INVALID_FIELD')
  return value
}

// Valor em reais com até 2 casas, ou null para apagar.
function money(value, code, min) {
  if (value === null || value === '') return null
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > MAX_MONEY) throw invalid(code)
  return Math.round(value * 100) / 100
}

// Texto de uma linha: sem caracteres de controle nem espaços repetidos. NFKC troca as letras
// "largas" e outras variantes pelas comuns ("Ｓｔｅａｍ" vira "Steam"). Vazio vira null.
function cleanText(value, max, code) {
  if (value != null && typeof value !== 'string') throw invalid(code)
  const text = String(value ?? '')
    .normalize('NFKC')
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if ([...text].length > max) throw invalid(code)
  return text || null
}
