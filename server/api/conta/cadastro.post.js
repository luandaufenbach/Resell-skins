// POST /api/conta/cadastro  { steam, whatsapp, slug, email, turnstile }
// Confere os dados da loja e cria a conta; a Auth manda o e-mail de confirmação. A senha é criada
// na confirmação, por quem abriu o link: o Supabase não troca a senha nem os dados quando alguém
// cadastra de novo um e-mail ainda não confirmado, e assim quem se cadastrasse antes com o e-mail
// de outra pessoa ficaria com a conta. Steam, WhatsApp e endereço ficam nos dados da conta só como
// sugestão para o painel, que pede para conferir antes de criar a loja.
// Se o e-mail já tem conta, a resposta é a mesma e nenhum e-mail sai.
// O navegador guarda o cadastro em andamento (GET /api/conta/cadastro), para a tela de espera saber
// quando o e-mail foi confirmado, mesmo que em outro aparelho.
export default defineEventHandler(async (event) => {
  rateLimit(event, 'cadastro', 5, 60 * 60)
  rateLimit(event, 'cadastro-dia', 20, 24 * 60 * 60)

  const body = (await readBody(event).catch(() => null)) ?? {}
  // O que dá para conferir sem gastar o Turnstile (que vale uma vez só) vem antes.
  const { whatsapp, slug } = storeFields(body)
  const email = normalizeEmail(body.email)
  if (!email) throw invalid('INVALID_EMAIL')

  await verifyTurnstile(event, body.turnstile)
  const { steamid } = await storeInventory(event, body.steam, slug)

  let result
  try {
    result = await supabaseAs(null, '/auth/v1/signup', {
      method: 'POST',
      // Senha provisória que ninguém conhece: a de verdade é criada no /confirmar.
      body: { email, password: crypto.randomUUID(), data: { steamid, whatsapp, slug } },
    })
  } catch (error) {
    throw authError(error)
  }

  // Sem sessão, a Auth devolve a conta direto. Se o e-mail já tinha conta confirmada, o id é
  // inventado e nunca aparece como confirmado: a tela de espera se comporta igual.
  const id = (result?.user ?? result)?.id
  if (typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)) setPendingSignup(event, { id, email })
  return { ok: true }
})
