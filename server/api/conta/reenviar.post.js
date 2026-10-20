// POST /api/conta/reenviar  { email }
// Manda de novo o e-mail de confirmação (link vencido ou e-mail perdido). Mesma resposta com ou
// sem conta para esse e-mail.
export default defineEventHandler(async (event) => {
  rateLimit(event, 'reenviar', 5, 60 * 60)

  const body = (await readBody(event).catch(() => null)) ?? {}
  const email = normalizeEmail(body.email)
  if (!email) throw invalid('INVALID_EMAIL')
  rateLimitKey(event, 'reenviar-email', email, 3, 60 * 60)

  try {
    await supabaseAs(null, '/auth/v1/resend', { method: 'POST', body: { type: 'signup', email } })
  } catch (error) {
    const { status } = supabaseError(error)
    if (status === 429) throw authError(error)
    console.error('[conta] reenviar confirmação:', status, error.message)
  }
  return { ok: true }
})
