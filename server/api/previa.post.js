// POST /api/previa  { url: <link do perfil, link de troca ou apelido>, whatsapp: "5548..." | "",
//                     turnstile: <token> }
// Resposta: { id }. O inventário é lido antes de gravar, para o erro (link errado, inventário
// privado) aparecer no formulário e não na prévia. A prévia guarda uma cópia do que foi lido.
// Quem cria recebe um cookie da prévia: só esse navegador vê os botões de WhatsApp nela. Assim
// ninguém monta uma "loja" com o inventário de outra pessoa e o próprio WhatsApp para enganar
// comprador.
export default defineEventHandler(async (event) => {
  rateLimit(event, 'criar-previa', 10, 60 * 60)
  rateLimit(event, 'criar-previa-dia', 30, 24 * 60 * 60)

  const body = await readBody(event).catch(() => null)
  const whatsapp = String(body?.whatsapp ?? '')
  if (whatsapp && !/^\d{12,15}$/.test(whatsapp)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'WhatsApp inválido',
      data: { code: 'INVALID_PHONE' },
    })
  }

  await verifyTurnstile(event, body?.turnstile)

  const { steamApiKey } = useRuntimeConfig(event)
  const steamid = await resolveSteamId(body?.url, steamApiKey)
  const store = await getStore(steamid)

  const id = await createPreview(store, whatsapp)
  setCookie(event, previewCookie(id), '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: getRequestProtocol(event, { xForwardedProto: true }) === 'https',
    maxAge: 24 * 60 * 60,
    path: '/',
  })
  return { id }
})
