// Funções usadas pelas páginas e componentes (importadas automaticamente pelo Nuxt).

export const CATEGORIES = [
  { id: 'facas', label: 'Facas' },
  { id: 'luvas', label: 'Luvas' },
  { id: 'rifles', label: 'Rifles' },
  { id: 'snipers', label: 'Snipers' },
  { id: 'pistolas', label: 'Pistolas' },
  { id: 'smgs', label: 'SMGs' },
  { id: 'pesadas', label: 'Pesadas' },
  { id: 'agentes', label: 'Agentes' },
  { id: 'outros', label: 'Outros' },
]

/** Skins da loja de exemplo mostradas fora dela: raridades e categorias diferentes. */
export const SHOWCASE_ITEMS = [
  '★ Karambit | Doppler (Factory New)',
  'StatTrak™ AK-47 | Redline (Field-Tested)',
  '★ Sport Gloves | Vice (Field-Tested)',
  'AWP | Atheris (Factory New)',
  'Desert Eagle | Printstream (Factory New)',
  'M4A1-S | Printstream (Minimal Wear)',
]

/** Segundo nível do filtro: a arma (nome em inglês) ou, em Agentes e Outros, o tipo do item. */
export function itemGroup(item) {
  return item.category === 'agentes' || item.category === 'outros' ? (item.type ?? 'Outros') : item.weapon
}

// Faixas oficiais de float de cada desgaste.
export const WEAR_SCALE = [
  { id: 'FN', label: 'Nova de Fábrica', min: 0, max: 0.07 },
  { id: 'MW', label: 'Pouco Usada', min: 0.07, max: 0.15 },
  { id: 'FT', label: 'Testada em Campo', min: 0.15, max: 0.38 },
  { id: 'WW', label: 'Bem Desgastada', min: 0.38, max: 0.45 },
  { id: 'BS', label: 'Veterana de Guerra', min: 0.45, max: 1 },
]

export function wearLabel(id) {
  return WEAR_SCALE.find((w) => w.id === id)?.label ?? id
}

/** Imagens do CDN da Steam aceitam um tamanho no fim da URL. */
export function steamImage(url, size = '360fx360f') {
  if (!url) return null
  return url.includes('/economy/image/') ? `${url}/${size}` : url
}

/** Corta (sem arredondar) para não mudar a faixa de desgaste na exibição. */
export function formatFloat(value, digits = 4) {
  if (value == null) return ''
  const factor = 10 ** digits
  return (Math.floor(value * factor) / factor).toFixed(digits)
}

/** Título principal e linha de apoio de um item. */
export function itemTitle(item) {
  return item.skin ?? item.weapon
}

export function itemSubtitle(item) {
  return item.skin ? item.weapon : item.type
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** 1234.5 -> "R$ 1.234,50" */
export function formatBRL(value) {
  return brl.format(value)
}

/** Valor de plano: "R$ 49" quando é inteiro, "R$ 39,20" quando tem centavos. */
export function formatPlanPrice(value) {
  const rounded = Math.round(value * 100) / 100
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
  }).format(rounded)
}

/** % de economia do preço do revendedor sobre o preço Steam; null quando não há economia. */
export function savingsPercent(price) {
  if (!price?.steam || price.seller >= price.steam) return null
  return Math.round((1 - price.seller / price.steam) * 100)
}

/** Trocável agora: sem trava, ou com a trava já vencida desde a última leitura do inventário. */
export function isTradableNow(item) {
  return item.tradable || (item.tradableAt != null && Date.parse(item.tradableAt) <= Date.now())
}

/** "Disponível em 19/10" para item com trava temporária; null quando já dá para trocar. */
export function tradeLockLabel(item) {
  if (isTradableNow(item)) return null
  if (!item.tradableAt) return item.tradeLock ?? 'Bloqueado para troca'
  const date = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(item.tradableAt))
  return `Disponível em ${date}`
}

/** "(48) 99999-9999" -> "5548999999999" */
export function normalizePhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.length <= 11 ? `55${digits}` : digits
}

/** Sem `phone`, o WhatsApp pergunta para quem mandar a mensagem (usado na loja de exemplo). */
export function whatsappLink(phone, item, pageUrl) {
  const text = item
    ? `Olá! Tenho interesse em ${item.marketName}${
        item.float != null ? ` (float ${formatFloat(item.float)})` : ''
      }.${pageUrl ? `\n${pageUrl}` : ''}`
    : 'Olá! Vi sua loja de skins.'
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}

/** Páginas que mostram uma loja (e aceitam ?cor e ?fundo): a demo, as prévias e /<slug>. */
export function isStorePath(path) {
  const [first, second, ...rest] = path.split('/').filter(Boolean)
  if (first === 'previa') return Boolean(second) && !rest.length
  return Boolean(first) && !second && (first === 'demo' || !slugProblem(first))
}

/**
 * Conta visita, skin aberta e clique no WhatsApp numa loja. sendBeacon não atrasa a navegação
 * (o clique no WhatsApp sai da página) e não espera resposta.
 */
export function sendStoreEvent(slug, tipo, item = null) {
  const body = JSON.stringify({ loja: slug, tipo, item })
  try {
    if (navigator.sendBeacon?.('/api/eventos', new Blob([body], { type: 'application/json' }))) return
  } catch {
    // Alguns navegadores recusam o Blob com tipo; cai no fetch abaixo.
  }
  fetch('/api/eventos', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(
    () => {},
  )
}

export function searchText(item) {
  return normalizeText(
    [item.marketName, item.localName, item.type, item.nameTag, ...item.stickers.map((s) => s.name)]
      .filter(Boolean)
      .join(' '),
  )
}

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/** Código do erro devolvido pela API (campo data.code). */
export function errorCode(error) {
  return error?.data?.data?.code ?? error?.data?.code ?? null
}

/** Mensagens para os erros devolvidos pela API. */
export function errorMessage(error) {
  switch (errorCode(error)) {
    case 'PRIVATE':
      return {
        title: 'Este inventário está privado',
        body: 'Para aparecer aqui, ele precisa estar público. Na Steam, abra Editar perfil, depois Configurações de privacidade, e deixe Inventário como Público. A mudança vale em poucos minutos.',
      }
    case 'RATE_LIMIT':
      return {
        title: 'A Steam pediu uma pausa',
        body: 'Foram muitas consultas em pouco tempo. Tente de novo em alguns minutos.',
      }
    case 'NOT_FOUND':
      return {
        title: 'Perfil não encontrado',
        body: 'Confira o link. Ele começa com steamcommunity.com/id/ ou steamcommunity.com/profiles/.',
      }
    case 'INVALID_INPUT':
      return {
        title: 'Esse link não é da Steam',
        body: 'Cole o link do seu perfil (steamcommunity.com/id/seunome) ou o seu link de troca.',
      }
    case 'INVALID_PHONE':
      return {
        title: 'Confira o WhatsApp',
        body: 'Use o DDD e o número, como (48) 99999-9999. Se preferir, deixe o campo vazio.',
      }
    case 'EXPIRED':
      return {
        title: 'Esta prévia expirou',
        body: 'Cada prévia vale 24 horas. Gere outra com o mesmo link da Steam: leva poucos segundos.',
      }
    case 'PREVIEW_NOT_FOUND':
      return {
        title: 'Prévia não encontrada',
        body: 'Confira o link. As prévias são apagadas alguns dias depois de expirar.',
      }
    case 'LIMIT':
      return {
        title: 'Muitas consultas seguidas',
        body: 'Espere alguns minutos e tente de novo.',
      }
    case 'UNAVAILABLE':
      return {
        title: 'Não deu para abrir agora',
        body: 'Tente de novo em alguns minutos.',
      }
    case 'CAPTCHA':
      return {
        title: 'A verificação de segurança falhou',
        body: 'Espere a caixa de verificação ficar marcada e envie de novo.',
      }
    case 'STORE_NOT_FOUND':
      return {
        title: 'Loja não encontrada',
        body: 'Confira o endereço. Se você recebeu este link de alguém, peça o link de novo.',
      }
    case 'STORE_UNAVAILABLE':
      return {
        title: 'Loja indisponível',
        body: 'Esta loja não está no ar agora. Fale com o dono da loja.',
      }
    default:
      return {
        title: 'A Steam não respondeu',
        body: 'A Steam não respondeu a tempo. Tente de novo em alguns minutos.',
      }
  }
}
