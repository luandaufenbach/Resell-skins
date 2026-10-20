// Sessão do revendedor. Login, cadastro e senha passam pelo nosso servidor, que guarda os tokens
// do Supabase em cookies httpOnly: o navegador nunca vê token nem chave. O token de acesso vale
// 1 hora; quando vence, o de renovação (que vale uma vez só) troca por um par novo.

const ACCESS = 'vitrine_acesso'
const REFRESH = 'vitrine_sessao'
// Só diz que há uma conta aberta neste navegador, sem nada secreto: a página inicial mostra
// "Painel" e /entrar e /cadastro levam direto ao painel. Quem confere a sessão é o servidor.
const MARKER = 'vitrine_conta'
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30

function cookieOptions(event, maxAge) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: getRequestProtocol(event, { xForwardedProto: true }) === 'https',
    path: '/',
    maxAge,
  }
}

/** Grava a sessão devolvida pela Auth (login, confirmação do e-mail, nova senha, renovação). */
export function setSession(event, session) {
  setCookie(event, ACCESS, session.access_token, cookieOptions(event, session.expires_in || 3600))
  setCookie(event, REFRESH, session.refresh_token, cookieOptions(event, REFRESH_MAX_AGE))
  setCookie(event, MARKER, '1', { ...cookieOptions(event, REFRESH_MAX_AGE), httpOnly: false })
  event.context.session = { user: session.user, token: session.access_token }
}

export function endSession(event) {
  deleteCookie(event, ACCESS, cookieOptions(event))
  deleteCookie(event, REFRESH, cookieOptions(event))
  deleteCookie(event, MARKER, { ...cookieOptions(event), httpOnly: false })
  event.context.session = null
}

/** Sem sessão válida, apaga os cookies que sobraram (inclusive o aviso de conta aberta). */
export function clearStaleSession(event) {
  if (getCookie(event, MARKER) || getCookie(event, ACCESS) || getCookie(event, REFRESH)) endSession(event)
}

/**
 * { user, token } da sessão, com o usuário validado na Auth do Supabase (ler o token não basta).
 * null sem sessão. Renova a sessão quando o token de acesso venceu.
 * Na página renderizada no servidor, a chamada interna à API recebe o contexto da requisição
 * original em req.__unenv__ (como no limite por IP): a sessão é resolvida uma vez, na requisição
 * do navegador, a única que consegue devolver o cookie renovado (server/middleware/sessao.js).
 */
export async function resolveSession(event) {
  if (event.context.session !== undefined) return event.context.session
  const parent = event.node.req.__unenv__
  if (parent?.session !== undefined) return (event.context.session = parent.session)
  const internal = Boolean(parent)

  const token = getCookie(event, ACCESS)
  const user = token ? await fetchUser(token) : null
  if (user) return (event.context.session = { user, token })

  // Renovar numa chamada interna gastaria o token de renovação sem o navegador receber o novo.
  const refreshToken = getCookie(event, REFRESH)
  if (!refreshToken || internal) return (event.context.session = null)

  const session = await refresh(refreshToken)
  if (!session) {
    endSession(event)
    return null
  }
  setSession(event, session)
  return event.context.session
}

/**
 * Sessão obrigatória: 401 sem ela. Exige o e-mail confirmado aqui também, para não depender só da
 * opção "Confirm email" do painel do Supabase.
 */
export async function requireSession(event) {
  const session = await resolveSession(event)
  if (!session || !session.user.email_confirmed_at) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Entre na sua conta',
      data: { code: 'AUTH_REQUIRED' },
    })
  }
  return session
}

/**
 * POST vindo de outro site: recusado. O cookie com sameSite=lax já não vai junto, mas o login
 * não depende de cookie, e alguém poderia logar o visitante numa conta preparada.
 */
export function assertSameOrigin(event) {
  const origin = getRequestHeader(event, 'origin')
  if (!origin) return
  let host = null
  try {
    host = new URL(origin).host
  } catch {
    host = null
  }
  if (host !== getRequestHost(event, { xForwardedHost: true })) {
    throw createError({ statusCode: 403, statusMessage: 'Origem não permitida', data: { code: 'FORBIDDEN' } })
  }
}

async function fetchUser(token) {
  try {
    return await supabaseAs(token, '/auth/v1/user')
  } catch (error) {
    const { status } = supabaseError(error)
    if (status === 401 || status === 403) return null
    throw unavailable('sessão', error)
  }
}

async function refresh(refreshToken) {
  try {
    return await supabaseAs(null, '/auth/v1/token', {
      method: 'POST',
      query: { grant_type: 'refresh_token' },
      body: { refresh_token: refreshToken },
    })
  } catch (error) {
    const { status } = supabaseError(error)
    if (status >= 400 && status < 500) return null
    throw unavailable('sessão', error)
  }
}
