// POST /api/conta/nova-senha  { token_hash, senha }
// Link do e-mail de nova senha: troca o link por uma sessão, grava a senha e entra na conta.
export default defineEventHandler(async (event) => {
  rateLimit(event, 'nova-senha', 10, 60 * 60)

  const body = (await readBody(event).catch(() => null)) ?? {}
  const password = String(body.senha ?? '')
  // Antes de usar o link, que vale uma vez só.
  if (!isValidPassword(password)) throw invalid('WEAK_PASSWORD')

  const session = await verifyEmailLink('recovery', body.token_hash)
  if (!session) throw invalid('LINK_EXPIRED')

  try {
    await supabaseAs(session.access_token, '/auth/v1/user', { method: 'PUT', body: { password } })
  } catch (error) {
    // Mesma senha de antes: a pessoa provou que é dona do e-mail, então entra assim mesmo.
    if (supabaseError(error).code !== 'same_password') throw authError(error)
  }

  setSession(event, session)
  return { ok: true }
})
