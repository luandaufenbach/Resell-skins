// Preço do revendedor: preço Steam menos o desconto da loja, arredondado sempre para baixo, para a
// economia mostrada nunca ficar menor que a prometida. Usado no servidor (loja, prévia e demo) e no
// painel (exemplo ao vivo e lista de itens).

export const DEFAULT_DISCOUNT = 0.3
export const MAX_DISCOUNT = 0.8

export const ROUNDINGS = [
  { id: 'centavos', label: 'Sem arredondar' },
  { id: 'inteiro', label: 'Real inteiro' },
  { id: 'noventa', label: 'Final ,90' },
  { id: 'cinco', label: 'Múltiplo de 5' },
]

// Arredondamento que tiraria mais que isto do preço não vale: R$ 3,47 não vira R$ 3, e R$ 12,40 em
// "múltiplo de 5" vira R$ 12 (real inteiro) em vez de R$ 10.
const MAX_CUT = 0.1
const CHAIN = { centavos: [], inteiro: ['inteiro'], noventa: ['noventa'], cinco: ['cinco', 'inteiro'] }

// Em centavos, para não somar erro de ponto flutuante.
const STEP = {
  inteiro: (c) => Math.floor(c / 100) * 100,
  noventa: (c) => Math.floor((c - 90) / 100) * 100 + 90,
  cinco: (c) => Math.floor(c / 500) * 500,
}

export function isRounding(value) {
  return ROUNDINGS.some((r) => r.id === value)
}

/** Valor arredondado para baixo no modo da loja (centavos, inteiro, noventa ou cinco). */
export function roundPrice(value, rounding = 'centavos') {
  const cents = Math.floor(value * 100 + 1e-6)
  for (const mode of CHAIN[rounding] ?? []) {
    const rounded = STEP[mode](cents)
    if (rounded > 0 && (cents - rounded) / cents <= MAX_CUT) return rounded / 100
  }
  return cents / 100
}

/** Preço padrão do revendedor para um preço Steam. */
export function sellerPrice(steam, discount = DEFAULT_DISCOUNT, rounding = 'centavos') {
  return roundPrice(steam * (1 - discount), rounding)
}
