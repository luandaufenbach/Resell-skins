// Conta do revendedor na Auth do Supabase (e-mail e senha). As respostas não dizem se um e-mail
// já tem conta: cadastro, recuperação de senha e reenvio da confirmação respondem igual nos dois
// casos, inclusive no tempo. A Auth só manda e-mail (e só aí demora ou dá 429, pelo intervalo
// mínimo entre e-mails) quando há conta, ou, no cadastro, quando não há conta confirmada.

/**
 * Espera `promise` e no mínimo `ms` milissegundos, dê certo ou dê erro: a resposta sai no mesmo
 * tempo com ou sem envio de e-mail.
 */
export async function atLeast(ms, promise) {
  const started = Date.now()
  try {
    return await promise
  } finally {
    const elapsed = Date.now() - started
    if (elapsed < ms) await new Promise((resolve) => setTimeout(resolve, ms - elapsed))
    // Passou do mínimo: o tempo volta a denunciar. Fica no log para ajustar o valor.
    else console.warn(`[conta] a Auth levou ${elapsed} ms, acima do mínimo de ${ms} ms`)
  }
}

/** E-mail em minúsculas e sem espaços, ou null se não parece um e-mail. */
export function normalizeEmail(value) {
  const email = String(value ?? '').trim().toLowerCase()
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

// Mínimo 8. A Auth guarda a senha com bcrypt, que só usa os primeiros 72 bytes.
export function isValidPassword(value) {
  const size = new TextEncoder().encode(String(value ?? '')).length
  return String(value ?? '').length >= 8 && size <= 72
}

export function invalid(code) {
  return createError({ statusCode: 400, statusMessage: 'Dados inválidos', data: { code } })
}

/** Troca o link do e-mail (confirmação ou nova senha) por uma sessão. null se venceu ou já foi usado. */
export async function verifyEmailLink(type, tokenHash) {
  if (typeof tokenHash !== 'string' || !/^[\w-]{10,200}$/.test(tokenHash)) return null
  try {
    return await supabaseAs(null, '/auth/v1/verify', { method: 'POST', body: { type, token_hash: tokenHash } })
  } catch (error) {
    const { status } = supabaseError(error)
    if (status >= 400 && status < 500 && status !== 429) return null
    throw authError(error)
  }
}

/** Erros da Auth que a tela sabe explicar; o resto vira "tente de novo em alguns minutos". */
export function authError(error) {
  const { status, code } = supabaseError(error)
  if (status === 429 || code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') {
    return createError({ statusCode: 429, statusMessage: 'Muitas tentativas', data: { code: 'LIMIT' } })
  }
  if (code === 'weak_password') return invalid('WEAK_PASSWORD')
  if (code === 'email_address_invalid' || code === 'validation_failed') return invalid('INVALID_EMAIL')
  console.error('[conta] erro da Auth:', status, code ?? error?.message, error?.data?.msg ?? '')
  // O SMTP recusou o envio (endereço inexistente, ou o Resend sem domínio só entrega para o dono
  // da conta). A Auth desfaz o cadastro.
  if (/sending/i.test(error?.data?.msg ?? '') || code === 'email_address_not_authorized') {
    return createError({ statusCode: 502, statusMessage: 'E-mail não enviado', data: { code: 'EMAIL_FAILED' } })
  }
  return createError({ statusCode: 503, statusMessage: 'Conta indisponível', data: { code: 'UNAVAILABLE' } })
}
