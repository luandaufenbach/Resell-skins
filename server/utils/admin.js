// Administração (/admin). Admin é quem entra com um e-mail da lista NUXT_ADMIN_EMAILS: não há
// tabela de admins no banco. Quem não está na lista recebe 404 em toda página /admin e rota
// /api/admin, para não revelar que a tela existe.

const DAY = 24 * 60 * 60 * 1000
const STORE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** E-mail da lista de admins (sem diferença de maiúsculas e espaços). */
export function isAdminEmail(email) {
  const target = String(email ?? '').trim().toLowerCase()
  if (!target) return false
  const { adminEmails } = useRuntimeConfig()
  return String(adminEmails ?? '')
    .split(/[\s,;]+/)
    .some((item) => item.trim().toLowerCase() === target)
}

/**
 * Sessão de admin: conta com o e-mail confirmado e na lista. Senão, 404. Gravação (POST) só vinda
 * do próprio site e com limite por admin: uma sessão roubada não lança centenas de pagamentos ou
 * bloqueios de uma vez.
 */
export async function requireAdmin(event) {
  const session = await resolveSession(event)
  if (!session?.user?.email_confirmed_at || !isAdminEmail(session.user.email)) {
    throw createError({ statusCode: 404, statusMessage: 'Página não encontrada' })
  }
  // O middleware e a rota chamam esta função na mesma requisição: a gravação conta uma vez só.
  if (!['GET', 'HEAD'].includes(event.method) && !event.context.adminWrite) {
    event.context.adminWrite = true
    assertSameOrigin(event)
    rateLimitKey(event, 'admin-gravar', session.user.id, 60, 10 * 60)
  }
  return session
}

/**
 * Registra o que o admin fez (tabela registro_admin). Se o registro falhar, a ação já feita vale
 * assim mesmo: o erro vai para o log.
 */
export async function logAdmin(session, storeId, action, detail = null) {
  try {
    await supabase('/rest/v1/registro_admin', {
      method: 'POST',
      body: { admin: session.user.email, loja_id: storeId, acao: action, detalhe: detail },
      headers: { Prefer: 'return=minimal' },
      retry: 0,
    })
  } catch (error) {
    console.error('[admin] registro da ação falhou:', action, error?.message)
  }
}

/** Id de loja (uuid), conferido antes de ir ao banco. */
export function isStoreId(value) {
  return STORE_ID.test(String(value ?? ''))
}

/** Id da loja na rota /api/admin/lojas/<id>/.... */
export function storeIdParam(event) {
  const id = String(getRouterParam(event, 'id') ?? '')
  if (!isStoreId(id)) throw invalid('INVALID_FIELD')
  return id
}

/** Lojas como o admin vê (public.admin_lojas). Com `id`, só aquela; 404 STORE_NOT_FOUND se não existe. */
export async function adminStores(id = null) {
  let rows
  try {
    rows = await supabase('/rest/v1/rpc/admin_lojas', { method: 'POST', body: { p_loja: id } })
  } catch (error) {
    throw unavailable('admin', error)
  }
  if (id && !rows.length) {
    throw createError({ statusCode: 404, statusMessage: 'Loja não encontrada', data: { code: 'STORE_NOT_FOUND' } })
  }
  return rows.map(adminStore)
}

/**
 * Situação da loja para a lista: pendente (não verificada), bloqueada, vencida, teste ou paga.
 * Teste é a loja no ar sem nenhum pagamento registrado.
 */
function adminStore(row) {
  const now = Date.now()
  const verified = Boolean(row.verificada_em)
  const ends = row.pago_ate ? Date.parse(row.pago_ate) : null
  const paid = Number(row.pagamentos) > 0
  const status = !verified
    ? 'pendente'
    : row.bloqueada_em
      ? 'bloqueada'
      : !(ends > now)
        ? 'vencida'
        : paid
          ? 'paga'
          : 'teste'

  return {
    id: row.id,
    slug: row.slug,
    name: storeName(row),
    image: imageUrl(row.logo) ?? row.avatar ?? null,
    email: row.email ?? null,
    whatsapp: row.whatsapp,
    steamid: row.steamid,
    status,
    open: status === 'paga' || status === 'teste',
    verified,
    verifiedAt: row.verificada_em,
    verifiedBy: row.verificada_por,
    paidUntil: row.pago_ate,
    daysLeft: ends ? Math.ceil((ends - now) / DAY) : null,
    blockedAt: row.bloqueada_em,
    // Verificada sem teste: o SteamID, o e-mail ou o WhatsApp já tinha usado um (verificar_loja grava
    // pago_ate igual à hora da verificação).
    trialUsed: verified && !paid && ends <= Date.parse(row.verificada_em),
    plan: { id: row.plano, value: row.valor == null ? null : Number(row.valor) },
    readAt: row.inventario_em,
    createdAt: row.criada_em,
    items: Number(row.itens),
    visits: Number(row.visitas),
    clicks: Number(row.cliques),
    payments: Number(row.pagamentos),
    lastPaymentAt: row.ultimo_pagamento,
    note: row.observacao ?? '',
  }
}

/**
 * Nome da loja para o admin: o da marca ou, sem ele, o do perfil Steam, que vem como o revendedor
 * escreveu. Sem os caracteres que invertem a direção do texto, uma linha não se passa por outra loja.
 */
export function storeName(row) {
  return (row?.nome_loja ?? row?.nome)?.replace(/[\p{Cc}\p{Cf}]/gu, '') || null
}

/** Planos, chave Pix e WhatsApp do dono, para a tela e a mensagem de cobrança. */
export async function adminConfig() {
  let config
  try {
    config = await readConfig(['planos', 'pix_dono', 'whatsapp_dono'])
  } catch (error) {
    throw unavailable('admin', error)
  }
  const money = (value) => (Number(value) > 0 ? Number(value) : null)
  return {
    plans: { mensal: money(config.planos?.mensal), trimestral: money(config.planos?.trimestral) },
    pix: typeof config.pix_dono === 'string' && config.pix_dono.trim() ? config.pix_dono.trim() : null,
    ownerWhatsapp: /^\d{12,15}$/.test(config.whatsapp_dono) ? config.whatsapp_dono : null,
  }
}

/** Erro de uma função do banco chamada pelo admin: o hint vira o código que a tela explica. */
export function adminDbError(error) {
  const { code } = supabaseError(error)
  const hint = error?.data?.hint
  if (code === 'P0001' && hint === 'NOT_VERIFIED') throw invalid('NOT_VERIFIED')
  if (code === 'P0002') {
    throw createError({ statusCode: 404, statusMessage: 'Loja não encontrada', data: { code: 'STORE_NOT_FOUND' } })
  }
  if (code === '22023' || code === '23514') throw invalid('INVALID_FIELD')
  throw unavailable('admin', error)
}

/**
 * Texto livre do admin (observação): mantém as quebras de linha e tira os outros caracteres de
 * controle e de formatação (os que invertem a direção do texto, por exemplo). Vazio vira null.
 */
export function adminText(value, max) {
  if (value != null && typeof value !== 'string') throw invalid('INVALID_FIELD')
  const text = String(value ?? '')
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/[\p{Cf}\p{Zl}\p{Zp}]|(?!\n)\p{Cc}/gu, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if ([...text].length > max) throw invalid('NOTE_TOO_LONG')
  return text || null
}
