// Funções do painel do revendedor (importadas automaticamente pelo Nuxt).

/** "1.234,56", "1234.56" ou "R$ 1234" -> 1234.56. Vazio -> null; inválido -> NaN. */
export function parseMoney(value) {
  let text = String(value ?? '').replace(/R\$|\s/g, '')
  if (!text) return null
  // Com vírgula, ela é a dos centavos e os pontos são de milhar.
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, '')
  return /^\d+(\.\d{1,2})?$/.test(text) ? Number(text) : NaN
}

/** 1234.5 -> "1.234,50", para preencher um campo de valor. */
export function moneyInput(value) {
  if (value == null) return ''
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

/**
 * Até 3 cores marcantes da logo, para sugerir a cor de destaque. Lê a imagem num canvas pequeno e
 * agrupa os pixels por tom, ignorando transparência, cinzas, quase preto e quase branco.
 */
export async function logoColors(url) {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  // Endereço próprio: a mesma imagem já carregada na página (sem CORS) viria do cache e o canvas
  // não poderia ler os pixels.
  await new Promise((resolve, reject) => {
    image.onload = resolve
    image.onerror = reject
    image.src = `${url}?cores`
  })

  const size = 48
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d', { willReadFrequently: true })
  context.drawImage(image, 0, 0, size, size)
  const { data } = context.getImageData(0, 0, size, size)

  const groups = new Map()
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
    if (a < 200) continue
    const max = Math.max(r, g, b) / 255
    const min = Math.min(r, g, b) / 255
    const light = (max + min) / 2
    const saturation = max === min ? 0 : (max - min) / (1 - Math.abs(2 * light - 1))
    if (saturation < 0.3 || light < 0.12 || light > 0.9) continue

    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5)
    const group = groups.get(key) ?? { count: 0, r: 0, g: 0, b: 0 }
    group.count++
    group.r += r
    group.g += g
    group.b += b
    groups.set(key, group)
  }

  const picks = []
  for (const group of [...groups.values()].sort((a, b) => b.count - a.count)) {
    if (group.count < 6) break
    const color = [group.r, group.g, group.b].map((v) => Math.round(v / group.count))
    if (picks.some((p) => Math.hypot(p[0] - color[0], p[1] - color[1], p[2] - color[2]) < 80)) continue
    picks.push(color)
    if (picks.length === 3) break
  }
  return picks.map((rgb) => rgb.map((v) => v.toString(16).padStart(2, '0')).join(''))
}

const DAY = 24 * 60 * 60 * 1000
const WARN_DAYS = 5

/**
 * Situação do vencimento: { show, closed, daysLeft }. O aviso aparece a partir de 5 dias antes
 * (no teste grátis e no plano pago) e continua quando a loja sai do ar.
 */
export function renewalState(store, now = Date.now()) {
  const ends = store?.paidUntil ? Date.parse(store.paidUntil) : null
  const daysLeft = ends ? Math.ceil((ends - now) / DAY) : null
  const closed = Boolean(store?.verified && !store.open)
  const show = Boolean(store?.verified) && (closed || (daysLeft != null && daysLeft <= WARN_DAYS))
  return { show, closed, daysLeft, ends }
}
