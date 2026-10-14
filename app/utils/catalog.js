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

/** "(48) 99999-9999" -> "5548999999999" */
export function normalizePhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.length <= 11 ? `55${digits}` : digits
}

export function whatsappLink(phone, item, pageUrl) {
  const text = item
    ? `Olá! Tenho interesse em ${item.marketName}${
        item.float != null ? ` (float ${formatFloat(item.float)})` : ''
      }.${pageUrl ? `\n${pageUrl}` : ''}`
    : 'Olá! Vi seu catálogo de skins.'
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}

export function searchText(item) {
  return normalizeText(
    [item.marketName, item.type, item.nameTag, ...item.stickers.map((s) => s.name)]
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

/** Mensagens para os erros devolvidos pela API (campo data.code). */
export function steamErrorMessage(error) {
  const code = error?.data?.data?.code ?? error?.data?.code
  switch (code) {
    case 'PRIVATE':
      return {
        title: 'Este inventário está privado',
        body: 'Para aparecer aqui, ele precisa estar público. Na Steam, abra Editar perfil, depois Configurações de privacidade, e deixe Inventário como Público. A mudança pode levar alguns minutos para valer.',
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
    default:
      return {
        title: 'A Steam não respondeu',
        body: 'Pode ser instabilidade do lado deles. Tente de novo em instantes.',
      }
  }
}
