// Transforma a resposta crua da Steam em itens prontos para o catálogo.
//
// A Steam devolve duas listas separadas:
//   assets       -> cada item que a pessoa tem (assetid, classid, instanceid, amount)
//   descriptions -> os dados de cada tipo de item (nome, imagem, tags, stickers...)
// O vínculo entre as duas é o par classid + instanceid.

const IMAGE_CDN = 'https://community.akamai.steamstatic.com/economy/image/'

// Tags "Type" da Steam -> categorias do catálogo.
const CATEGORY_BY_TYPE = {
  CSGO_Type_Knife: 'facas',
  Type_Hands: 'luvas',
  CSGO_Type_Rifle: 'rifles',
  CSGO_Type_SniperRifle: 'snipers',
  CSGO_Type_Pistol: 'pistolas',
  CSGO_Type_SMG: 'smgs',
  CSGO_Type_Shotgun: 'pesadas',
  CSGO_Type_Machinegun: 'pesadas',
  Type_CustomPlayer: 'agentes',
}
const CATEGORY_ORDER = ['facas', 'luvas', 'rifles', 'snipers', 'pistolas', 'smgs', 'pesadas', 'agentes', 'outros']

const WEAR_BY_TAG = {
  WearCategory0: 'FN',
  WearCategory1: 'MW',
  WearCategory2: 'FT',
  WearCategory3: 'WW',
  WearCategory4: 'BS',
}
const WEAR_ORDER = ['FN', 'MW', 'FT', 'WW', 'BS']

// Rarity_Common ... Rarity_Immortal (Contrabando). Itens ★ (facas e luvas) sobem para o topo.
const RARITY_RANK = { Common: 1, Uncommon: 2, Rare: 3, Mythical: 4, Legendary: 5, Ancient: 6, Immortal: 7 }

const EXTERIOR_SUFFIX = /\s*\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/

export function normalizeInventory(pages, steamid) {
  const descriptions = new Map()
  const properties = new Map()
  const assets = []

  for (const page of pages) {
    for (const d of page.descriptions ?? []) descriptions.set(`${d.classid}_${d.instanceid}`, d)
    // Em inventários recentes a Steam já manda float e pattern em asset_properties.
    for (const p of page.asset_properties ?? []) properties.set(String(p.assetid), p.asset_properties ?? [])
    assets.push(...(page.assets ?? []))
  }

  const items = []
  const stacks = new Map()

  for (const asset of assets) {
    const description = descriptions.get(`${asset.classid}_${asset.instanceid}`)
    if (!description) continue

    const item = toItem(asset, description, properties.get(String(asset.assetid)), steamid)
    const amount = Number(asset.amount) || 1

    // Caixas, chaves e itens sem desgaste iguais viram um card só com quantidade.
    if (!item.wear && item.stickers.length === 0 && !item.nameTag) {
      const key = `${item.marketName}|${item.tradable}|${item.tradeLock ?? ''}`
      const stack = stacks.get(key)
      if (stack) {
        stack.quantity += amount
        continue
      }
      stacks.set(key, item)
    }

    item.quantity = amount
    items.push(item)
  }

  return items.sort(compareItems)
}

function toItem(asset, d, props = [], steamid) {
  const tags = Object.fromEntries((d.tags ?? []).map((t) => [t.category, t]))
  const marketName = d.market_hash_name || d.name
  const star = marketName.startsWith('★')
  const quality = tags.Quality?.internal_name ?? ''
  const rarityKey = tags.Rarity?.internal_name?.match(/^Rarity_([A-Za-z]+)/)?.[1]
  const wear = WEAR_BY_TAG[tags.Exterior?.internal_name] ?? null
  const { weapon, skin } = splitName(marketName)

  return {
    id: String(asset.assetid),
    marketName,
    weapon,
    skin,
    type: tags.Type?.localized_tag_name ?? null,
    category: CATEGORY_BY_TYPE[tags.Type?.internal_name] ?? 'outros',
    star,
    stattrak: quality.includes('strange') || marketName.includes('StatTrak™'),
    souvenir: quality === 'tournament' || marketName.startsWith('Souvenir '),
    rarity: {
      label: tags.Rarity?.localized_tag_name ?? null,
      color: tags.Rarity?.color ? `#${tags.Rarity.color}` : '#b0c3d9',
      rank: (RARITY_RANK[rarityKey] ?? 0) + (star ? 3 : 0),
    },
    wear,
    wearLabel: tags.Exterior?.localized_tag_name ?? null,
    float: wear ? readFloat(props) : null,
    pattern: wear ? readPattern(props) : null,
    image: d.icon_url ? IMAGE_CDN + d.icon_url : null,
    stickers: readAccessories(d.descriptions),
    nameTag: readNameTag(d.fraudwarnings),
    tradable: d.tradable === 1,
    tradeLock: d.tradable === 1 ? null : readTradeLock(d),
    inspectLink: readInspectLink(d, asset, steamid),
    steamUrl: `https://steamcommunity.com/profiles/${steamid}/inventory/#730_2_${asset.assetid}`,
    quantity: 1,
  }
}

// "★ StatTrak™ Karambit | Doppler (Factory New)" -> { weapon: "Karambit", skin: "Doppler" }
function splitName(marketName) {
  const clean = marketName
    .replace(/^★\s*/, '')
    .replace(/^StatTrak™\s*/, '')
    .replace(/^Souvenir\s+/, '')
    .replace(EXTERIOR_SUFFIX, '')

  const i = clean.indexOf(' | ')
  if (i === -1) return { weapon: clean, skin: null }
  return { weapon: clean.slice(0, i), skin: clean.slice(i + 3) }
}

// Stickers e chaveiros vêm como HTML dentro de descriptions.
function readAccessories(list = []) {
  const out = []

  for (const entry of list) {
    const value = String(entry?.value ?? '')
    const isCharm = entry?.name === 'keychain_info' || value.includes('keychain_info')
    const isSticker = entry?.name === 'sticker_info' || value.includes('sticker_info')
    if (!isCharm && !isSticker) continue

    const images = [...value.matchAll(/<img[^>]*src=["']([^"']+)["']/gi)].map((m) => m[1])
    const text = value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim()
    const list = text.split('\n').pop().replace(/^[^:]+:\s*/, '')
    const names = list ? list.split(/,\s+/) : []

    images.forEach((image, i) => {
      out.push({
        kind: isCharm ? 'charm' : 'sticker',
        image,
        name: names.length === images.length ? names[i].trim() : null,
      })
    })
  }

  return out
}

// fraudwarnings: ["Name Tag: ''Minha AK''"]
function readNameTag(warnings = []) {
  for (const w of warnings) {
    const match = String(w).match(/''(.+)''/)
    if (match) return match[1]
  }
  return null
}

// Texto da própria Steam, já em português (ex.: "Negociável após 19 de out. de 2026").
function readTradeLock(d) {
  const text = [...(d.owner_descriptions ?? []), ...(d.descriptions ?? [])]
    .map((x) => String(x?.value ?? '').replace(/<[^>]+>/g, '').trim())
    .find((v) => /\d{4}/.test(v) && /(ap[oó]s|after|until|at[eé])/i.test(v))
  return text ?? 'Bloqueado para troca'
}

function readInspectLink(d, asset, steamid) {
  const link = d.actions?.[0]?.link
  if (!link) return null
  const out = link.replace('%owner_steamid%', steamid).replace('%assetid%', asset.assetid)
  return /%[\w:]+%/.test(out) ? null : out
}

function readFloat(props) {
  const prop = props.find((p) => p.propertyid === 2) ?? props.find((p) => p.float_value != null)
  const value = Number(prop?.float_value)
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : null
}

function readPattern(props) {
  const prop = props.find((p) => p.propertyid === 1)
  const value = Number(prop?.int_value)
  return Number.isInteger(value) ? value : null
}

function compareItems(a, b) {
  return (
    b.rarity.rank - a.rarity.rank ||
    CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
    a.weapon.localeCompare(b.weapon) ||
    String(a.skin).localeCompare(String(b.skin)) ||
    WEAR_ORDER.indexOf(a.wear) - WEAR_ORDER.indexOf(b.wear)
  )
}
