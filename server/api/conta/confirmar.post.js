// POST /api/conta/confirmar  { token_hash, senha }
// Link do e-mail de confirmação. A página pede um clique antes de chamar esta rota: leitores de
// e-mail que abrem os links sozinhos gastariam o link. Quem abriu o link prova que é dono do
// e-mail e cria a senha aqui; a loja é criada depois, no painel.
export default defineEventHandler(async (event) => {
  rateLimit(event, 'confirmar', 20, 60 * 60)

  const body = (await readBody(event).catch(() => null)) ?? {}
  const password = String(body.senha ?? '')
  // Antes de usar o link, que vale uma vez só.
  if (!isValidPassword(password)) throw invalid('WEAK_PASSWORD')

  const session = await verifyEmailLink('email', body.token_hash)
  if (!session) throw invalid('LINK_EXPIRED')

  try {
    await supabaseAs(session.access_token, '/auth/v1/user', { method: 'PUT', body: { password } })
  } catch (error) {
    throw authError(error)
  }

  setSession(event, session)
  return { ok: true }
})
