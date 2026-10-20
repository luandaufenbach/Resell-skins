// POST /api/conta/entrar  { email, senha }
// Limite por IP (toda tentativa) e por e-mail (só as falhas): quem tenta senhas numa conta é
// barrado mesmo trocando de IP, e o dono que acerta a senha não perde tentativa.
// E-mail inexistente e senha errada dão o mesmo erro.
const FAILS = 5
const WINDOW = 15 * 60

export default defineEventHandler(async (event) => {
  rateLimit(event, 'entrar', 10, WINDOW)

  const body = (await readBody(event).catch(() => null)) ?? {}
  const email = normalizeEmail(body.email)
  const password = String(body.senha ?? '')
  if (!email || !password) throw invalid('LOGIN_FAILED')
  assertBelowLimit(event, 'entrar-email', email, FAILS, WINDOW)

  let session
  try {
    session = await supabaseAs(null, '/auth/v1/token', {
      method: 'POST',
      query: { grant_type: 'password' },
      body: { email, password },
    })
  } catch (error) {
    const { status, code } = supabaseError(error)
    // Só aparece com a senha certa, então não revela se o e-mail tem conta.
    if (code === 'email_not_confirmed') throw invalid('EMAIL_NOT_CONFIRMED')
    if (status === 400 || code === 'invalid_credentials') {
      rateLimitKey(event, 'entrar-email', email, Infinity, WINDOW)
      throw invalid('LOGIN_FAILED')
    }
    throw authError(error)
  }

  setSession(event, session)
  return { ok: true }
})
