// GET /api/conta/cadastro
// Cadastro em andamento neste navegador (cookie gravado no POST): { email, confirmed }. Sem cadastro
// em andamento, { email: null, confirmed: false }. A tela "Confira seu e-mail" pergunta de tempos
// em tempos e, quando o e-mail foi confirmado (no celular, por exemplo), pede a senha criada lá.
// Só responde sobre a conta que este navegador cadastrou: não serve para descobrir se um e-mail
// tem conta.
// Risco aceito: quem cadastrou o e-mail de outra pessoa fica sabendo quando ela confirma. Não dá
// acesso a nada; para evitar, o link do e-mail teria de levar algo deste navegador.
const CONFIRMED_MAX_AGE = 60 * 60

export default defineEventHandler(async (event) => {
  // A tela pergunta a cada 5 segundos enquanto está à vista.
  rateLimit(event, 'cadastro-andamento', 300, 15 * 60)
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const pending = pendingSignup(event)
  if (!pending) return { email: null, confirmed: false }
  // Um cookie só não serve para consultar a Auth sem parar, trocando de IP.
  rateLimitKey(event, 'cadastro-andamento-conta', pending.id, 240, 15 * 60)

  let user = null
  try {
    user = await supabase(`/auth/v1/admin/users/${pending.id}`, { retry: 0 })
  } catch (error) {
    // Id inventado pela Auth (o e-mail já tinha conta) ou conta apagada: continua esperando.
    // Qualquer outro erro (chave errada, Auth fora do ar) aparece no log.
    if (supabaseError(error).status !== 404) throw unavailable('cadastro', error)
  }
  const confirmed = Boolean(user?.email_confirmed_at) && user.email?.toLowerCase() === pending.email

  // Confirmado, o cookie passa a valer só mais 1 hora: num computador compartilhado, quem chegar
  // depois não fica vendo o e-mail da pessoa até o dia seguinte.
  if (confirmed && pending.ate - Date.now() > CONFIRMED_MAX_AGE * 1000) {
    setPendingSignup(event, pending, CONFIRMED_MAX_AGE)
  }
  return { email: pending.email, confirmed }
})
