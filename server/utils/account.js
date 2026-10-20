// Conta do revendedor na Auth do Supabase (e-mail e senha). As respostas não dizem se um e-mail
// já tem conta: cadastro e recuperação de senha respondem igual nos dois casos.

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
  console.error('[conta] erro da Auth:', status, code ?? error?.message)
  return createError({ statusCode: 503, statusMessage: 'Conta indisponível', data: { code: 'UNAVAILABLE' } })
}
