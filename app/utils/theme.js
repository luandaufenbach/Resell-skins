// Tema da loja: um fundo (escuro ou claro) e uma cor de destaque opcional.
// As bases foram ajustadas à mão; a escura é o tema padrão "Arsenal". A cor de destaque
// substitui o branco giz dos botões, chips ativos, foco e marcador do float.
// Toda cor de texto e de borda passa por readableColor, que garante o contraste AA mesmo
// com a cor que o revendedor escolher.

const BASES = {
  escuro: {
    scheme: 'dark',
    bg: '#1d232c',
    stage: '#161b22',
    surface: '#262d38',
    surface2: '#2f3744',
    line: '#3a4453',
    text: '#e8ecf1',
    muted: '#97a3b6',
    placeholder: '#6f7b8e',
    stattrak: '#cf6a32',
    souvenir: '#ffd700',
    alert: '#ff9a8a',
    backdrop: 'rgb(12 15 20 / 0.72)',
    accent: '#eef2f6',
    accentInk: '#1d232c',
    accentInkSoft: '#5d6878',
    accentHover: '#ffffff',
  },
  claro: {
    scheme: 'light',
    bg: '#e6eaf0',
    // Mais escuro que o fundo, como no tema escuro: sticker branco e skin clara não somem.
    stage: '#d8dee6',
    surface: '#ffffff',
    surface2: '#eef1f5',
    line: '#b6c0cd',
    text: '#1d232c',
    muted: '#566173',
    placeholder: '#6b7586',
    stattrak: '#cf6a32',
    souvenir: '#ffd700',
    alert: '#c2402f',
    backdrop: 'rgb(29 35 44 / 0.5)',
    accent: '#1d232c',
    accentInk: '#f4f6f9',
    accentInkSoft: '#97a3b6',
    accentHover: '#2f3744',
  },
}

const DARK_INK = '#1d232c'
const LIGHT_INK = '#ffffff'

const themeCache = new Map()

/** Monta o tema. `cor` aceita "ff5500" ou "#ff5500"; `fundo` é "escuro" (padrão) ou "claro". */
export function buildTheme({ cor, fundo } = {}) {
  const mode = fundo === 'claro' ? 'claro' : 'escuro'
  const accent = normalizeHex(cor)
  const key = `${mode}|${accent}`
  if (!themeCache.has(key)) themeCache.set(key, createTheme(mode, accent))
  return themeCache.get(key)
}

function createTheme(mode, accent) {
  const t = { ...BASES[mode] }
  if (accent) Object.assign(t, accentTokens(accent))

  const grounds = [t.bg, t.surface, t.stage]
  t.text = readableColor(t.text, [...grounds, t.surface2])
  t.muted = readableColor(t.muted, grounds)
  t.placeholder = readableColor(t.placeholder, [t.stage])
  t.stattrak = readableColor(t.stattrak, [t.bg, t.surface])
  t.souvenir = readableColor(t.souvenir, [t.bg, t.surface])
  t.alert = readableColor(t.alert, grounds)
  // Foco, borda do chip ativo e marcador do float: 3:1 contra o que estiver em volta.
  t.accentEdge = readableColor(t.accent, grounds, 3)
  // Borda dos campos de texto: é ela que mostra onde o campo está, então 3:1 também.
  t.fieldLine = readableColor(t.line, [t.bg, t.stage], 3)
  // Texto na cor de destaque (ex.: o "−30%" do preço): 4,5:1.
  t.accentText = readableColor(t.accent, grounds)
  return t
}

/** Variáveis CSS do tema, para o atributo style do <html>. */
export function themeStyle(theme) {
  const vars = Object.entries(theme)
    .filter(([key]) => key !== 'scheme')
    .map(([key, value]) => `--${key.replace(/([A-Z0-9])/g, '-$1').toLowerCase()}:${value}`)
  return [...vars, `color-scheme:${theme.scheme}`].join(';')
}

// Texto sobre a cor de destaque: escuro ou branco, o que contrastar mais. Se nenhum chegar a
// 4,5:1 (tons médios), a própria cor é clareada ou escurecida só o necessário.
function accentTokens(color) {
  const ink = contrast(DARK_INK, color) >= contrast(LIGHT_INK, color) ? DARK_INK : LIGHT_INK
  const accent = readableColor(color, [ink])
  return {
    accent,
    accentInk: ink,
    accentInkSoft: readableColor(mix(ink, accent, 0.35), [accent]),
    accentHover: mix(accent, ink === DARK_INK ? '#ffffff' : '#000000', 0.15),
  }
}

export function normalizeHex(value) {
  const hex = String(value ?? '').trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{6}$/.test(hex)) return `#${hex}`
  if (/^[0-9a-f]{3}$/.test(hex)) return `#${[...hex].map((c) => c + c).join('')}`
  return null
}

const readableCache = new Map()

/**
 * Devolve a cor mais próxima da original com contraste mínimo `min` contra todos os fundos.
 * Mistura aos poucos com branco ou preto e fica com o caminho que mudar menos a cor.
 */
export function readableColor(color, backgrounds, min = 4.5) {
  const key = `${color}|${backgrounds.join(',')}|${min}`
  if (readableCache.has(key)) return readableCache.get(key)

  const worst = (c) => Math.min(...backgrounds.map((b) => contrast(c, b)))
  let result = color

  if (worst(color) < min) {
    let best = null
    for (const target of ['#ffffff', '#000000']) {
      for (let step = 1; step <= 100; step++) {
        const candidate = mix(color, target, step / 100)
        if (worst(candidate) >= min) {
          if (!best || step < best.step) best = { step, candidate }
          break
        }
      }
    }
    result = best?.candidate ?? (worst('#ffffff') >= worst('#000000') ? '#ffffff' : '#000000')
  }

  readableCache.set(key, result)
  return result
}

export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Mistura em sRGB, como o color-mix do CSS. `amount` é a fração de `b`.
function mix(a, b, amount) {
  const [x, y] = [toRgb(a), toRgb(b)]
  return toHex(x.map((v, i) => v + (y[i] - v) * amount))
}

function toRgb(hex) {
  const h = normalizeHex(hex)
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
}

function toHex(rgb) {
  return `#${rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`
}
