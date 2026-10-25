// POST /api/conta/reenviar  { email }
// Manda de novo o e-mail de confirmação (link vencido ou e-mail perdido). Mesma resposta com ou
// sem conta para esse e-mail.
export default defineEventHandler(async (event) => {
  rateLimit(event, 'reenviar', 5, 60 * 60)

  const body = (await readBody(event).catch(() => null)) ?? {}
  const email = normalizeEmail(body.email)
  if (!email) throw invalid('INVALID_EMAIL')
  rateLimitKey(event, 'reenviar-email', email, 3, 60 * 60)

  // A resposta não espera a Auth, que só demora ou dá 429 quando há conta não confirmada. Qualquer
  // erro fica só no log; o limite por e-mail acima segura as repetições.
  event.waitUntil(
    supabaseAs(null, '/auth/v1/resend', { method: 'POST', body: { type: 'signup', email } }).catch((error) => {
      const { status, code } = supabaseError(error)
      console.error('[conta] reenviar confirmação:', status, code ?? error.message)
    }),
  )
  return { ok: true }
})
