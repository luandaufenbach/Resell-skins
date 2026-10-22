// Funções da tela de administração (importadas automaticamente pelo Nuxt).

const DAY = 24 * 60 * 60 * 1000
// Cobrar a partir de 5 dias antes do vencimento, como o aviso do painel do revendedor.
const CHARGE_DAYS = 5

export const STATUS_LABEL = {
  pendente: 'Não verificada',
  bloqueada: 'Bloqueada',
  vencida: 'Vencida',
  teste: 'Teste grátis',
  paga: 'Paga',
}

export const PLAN_LABEL = { mensal: 'Mensal', trimestral: 'Trimestral' }

/** Loja para cobrar: verificada, sem bloqueio, vencida ou a 5 dias ou menos do vencimento. */
export function isDue(store) {
  return store.verified && !store.blockedAt && store.daysLeft != null && store.daysLeft <= CHARGE_DAYS
}

/**
 * O número grande da linha: quantos dias faltam (ou quantos passaram) até o vencimento.
 * { figure, unit, tone } com tone 'ok', 'soon' ou 'late'.
 */
export function dueFigure(store) {
  if (!store.verified) return { figure: '—', unit: 'sem verificar', tone: 'none' }
  const days = store.daysLeft
  if (days == null) return { figure: '—', unit: 'sem data', tone: 'none' }
  if (days >= 1) {
    return { figure: String(days), unit: days === 1 ? 'dia' : 'dias', tone: days <= CHARGE_DAYS ? 'soon' : 'ok' }
  }
  if (days === 0) return { figure: 'hoje', unit: 'venceu', tone: 'late' }
  return { figure: String(-days), unit: days === -1 ? 'dia vencida' : 'dias vencida', tone: 'late' }
}

/** "Teste grátis até 24/10", "Paga até 03/12", "Vencida em 18/10", "Não verificada". */
export function dueText(store) {
  if (!store.verified) return STATUS_LABEL.pendente
  const when = store.paidUntil ? formatDate(store.paidUntil) : ''
  if (store.status === 'bloqueada') return `Bloqueada, vence em ${when}`
  if (store.status === 'vencida') return store.trialUsed ? 'Sem teste: já tinha usado' : `Vencida em ${when}`
  return `${STATUS_LABEL[store.status]} até ${when}`
}

/** Valor do plano para a loja, pela configuração (com o desconto de fundador). Igual ao banco. */
export function planValue(plan, founder, config) {
  const base = config?.plans?.[plan]
  if (!base) return null
  const discount = founder ? (config.founders?.discount ?? 0) : 0
  return Math.round(base * (1 - discount) * 100) / 100
}

/**
 * Valor esperado de um pagamento de `months` meses: o valor da loja quando o período é o do plano
 * dela; senão, o do plano do período na configuração (é o que o banco grava na troca de plano).
 */
export function expectedValue(store, months, config) {
  const plan = months === 3 ? 'trimestral' : 'mensal'
  if (plan === store.plan.id && store.plan.value) return store.plan.value
  return planValue(plan, store.founder, config)
}

/** Novo vencimento depois de um pagamento: a partir do vencimento ou de hoje, o que for maior. */
export function nextDue(store, months, now = Date.now()) {
  const ends = store.paidUntil ? Date.parse(store.paidUntil) : 0
  const base = new Date(Math.max(ends, now))
  // Mesma conta do banco (UTC): 31/01 + 1 mês = 28/02.
  const day = base.getUTCDate()
  base.setUTCDate(1)
  base.setUTCMonth(base.getUTCMonth() + months)
  const last = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate()
  base.setUTCDate(Math.min(day, last))
  return base
}

/** "24/10/2026", no horário de Brasília. */
export function formatFullDate(value) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value))
}

/** "outubro de 2026" para "2026-10". */
export function monthLabel(month) {
  const [year, number] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, number - 1, 15)),
  )
}

/** Mês vizinho de "2026-10": shiftMonth("2026-10", -1) = "2026-09". */
export function shiftMonth(month, delta) {
  const [year, number] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, number - 1 + delta, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Mês atual no horário de Brasília, "2026-10". */
export function currentMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', timeZone: 'America/Sao_Paulo' })
    .formatToParts(now)
    .filter((part) => part.type !== 'literal')
  return `${parts[0].value}-${parts[1].value}`
}

/**
 * Mensagem de cobrança para o WhatsApp do revendedor: quando vence (ou venceu), o valor do plano,
 * a chave Pix do dono e o pedido do comprovante.
 */
export function chargeMessage(store, config, host) {
  const address = `${host}/${store.slug}`
  const when = store.paidUntil ? formatDate(store.paidUntil) : ''
  const late = store.daysLeft != null && store.daysLeft <= 0
  const what = store.status === 'teste' ? 'O teste grátis da sua loja na Revenda' : 'A sua loja na Revenda'
  const opening = late
    ? `Olá! A sua loja na Revenda (${address}) está fora do ar desde ${when}.`
    : `Olá! ${what} (${address}) ${store.status === 'teste' ? 'termina' : 'vence'} em ${when}.`
  const plan = store.plan.value
    ? `${formatPlanPrice(store.plan.value)} (plano ${PLAN_LABEL[store.plan.id]?.toLowerCase() ?? store.plan.id})`
    : null
  const goal = late ? 'Para voltar ao ar' : 'Para continuar no ar'
  const pay = config?.pix
    ? `${goal}, é só fazer um Pix${plan ? ` de ${plan}` : ''} para a chave ${config.pix} e mandar o comprovante aqui.`
    : `${goal}, o valor é ${plan ?? 'o do seu plano'}. Me chama aqui que eu passo a chave Pix.`
  return `${opening} ${pay}`
}

/** Link do WhatsApp do revendedor com a mensagem de cobrança. */
export function chargeLink(store, config, host) {
  return `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(chargeMessage(store, config, host))}`
}

const MESSAGES = {
  PAYMENT_VALUE: { field: 'valor', title: 'Confira o valor', body: 'Use o valor recebido em reais, maior que zero, como 49,00.' },
  NOTE_TOO_LONG: { title: 'Texto longo demais', body: 'A observação da loja vai até 1000 caracteres, e a do pagamento até 300.' },
  FOUNDERS_FULL: { title: 'As vagas de fundador acabaram', body: 'Tire o preço de fundador de outra loja ou aumente as vagas na configuração.' },
  NOT_VERIFIED: { title: 'Verifique a loja antes', body: 'Loja não verificada não fica no ar, mesmo paga. Verifique e registre de novo.' },
  STEAM_TAKEN: { title: 'Este inventário já tem uma loja verificada', body: 'Cada SteamID abre uma loja só. Confira a outra loja antes.' },
  STORE_NOT_FOUND: { title: 'Esta loja não existe mais', body: 'Ela pode ter sido apagada. Recarregue a lista.' },
  STORE_CHANGED: {
    title: 'A loja mudou enquanto você via',
    body: 'O SteamID não é mais o da tela. Recarregue a página e confira antes de verificar.',
  },
  LIMIT: { title: 'Muitas ações seguidas', body: 'Espere alguns minutos e tente de novo.' },
  INVALID_FIELD: { title: 'Confira os dados', body: 'Algum campo veio num formato que não serve. Recarregue a página e tente de novo.' },
  SESSION: { title: 'Sua sessão terminou', body: 'Entre de novo na sua conta para continuar.' },
  UNAVAILABLE: { title: 'Não deu para concluir agora', body: 'Tente de novo em alguns minutos.' },
}

/** { title, body, field } para um erro da API do admin. 404 sem código: a sessão de admin acabou. */
export function adminMessage(error) {
  const code = errorCode(error)
  if (MESSAGES[code]) return { code, ...MESSAGES[code] }
  const status = error?.statusCode ?? error?.status ?? error?.response?.status
  if (status === 404) return { code: 'SESSION', ...MESSAGES.SESSION }
  return { code: 'UNAVAILABLE', ...MESSAGES.UNAVAILABLE }
}
