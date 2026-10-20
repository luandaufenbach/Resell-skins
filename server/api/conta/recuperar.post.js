// POST /api/conta/recuperar  { email }
// Manda o link de nova senha. A resposta é a mesma com ou sem conta para esse e-mail.
export default defineEventHandler(async (event) => {
  rateLimit(event, 'recuperar', 5, 60 * 60)

  const body = (await readBody(event).catch(() => null)) ?? {}
  const email = normalizeEmail(body.email)
  if (!email) throw invalid('INVALID_EMAIL')
  rateLimitKey(event, 'recuperar-email', email, 3, 60 * 60)

  try {
    await supabaseAs(null, '/auth/v1/recover', { method: 'POST', body: { email } })
  } catch (error) {
    const { status } = supabaseError(error)
    if (status === 429) throw authError(error)
    // Qualquer outro erro some da resposta: a tela diria se o e-mail existe.
    console.error('[conta] recuperar senha:', status, error.message)
  }
  return { ok: true }
})
