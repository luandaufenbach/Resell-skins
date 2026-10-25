// POST /api/conta/recuperar  { email }
// Manda o link de nova senha. A resposta é a mesma com ou sem conta para esse e-mail.
export default defineEventHandler(async (event) => {
  rateLimit(event, 'recuperar', 5, 60 * 60)

  const body = (await readBody(event).catch(() => null)) ?? {}
  const email = normalizeEmail(body.email)
  if (!email) throw invalid('INVALID_EMAIL')
  rateLimitKey(event, 'recuperar-email', email, 3, 60 * 60)

  // A resposta não espera a Auth, que só demora ou dá 429 quando o e-mail tem conta. Qualquer erro
  // fica só no log; o limite por e-mail acima segura as repetições.
  event.waitUntil(
    supabaseAs(null, '/auth/v1/recover', { method: 'POST', body: { email } }).catch((error) => {
      const { status, code } = supabaseError(error)
      console.error('[conta] recuperar senha:', status, code ?? error.message)
    }),
  )
  return { ok: true }
})
