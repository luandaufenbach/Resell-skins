// Cloudflare Turnstile: confirma no servidor que quem mandou o formulário passou pelo desafio.
// Cada token vale uma vez só (a Cloudflare recusa o segundo uso).

export async function verifyTurnstile(event, token) {
  const { turnstileSecretKey } = useRuntimeConfig(event)
  if (!turnstileSecretKey) {
    console.error('[turnstile] NUXT_TURNSTILE_SECRET_KEY ausente')
    throw createError({ statusCode: 503, statusMessage: 'Verificação indisponível', data: { code: 'UNAVAILABLE' } })
  }
  if (typeof token !== 'string' || !token || token.length > 2048) throw failed()

  const result = await $fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: { secret: turnstileSecretKey, response: token, remoteip: clientIp(event) ?? undefined },
    timeout: 8000,
  }).catch((error) => {
    console.error('[turnstile] sem resposta:', error.message)
    return null
  })
  if (!result?.success) throw failed()
}

function failed() {
  return createError({
    statusCode: 400,
    statusMessage: 'Verificação de segurança',
    data: { code: 'CAPTCHA' },
  })
}
