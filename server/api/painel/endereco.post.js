// POST /api/painel/endereco  { slug }
// Troca o endereço da loja. Com a loja verificada, o antigo redireciona para o novo por 60 dias e
// ninguém pega nesse tempo; no máximo 5 endereços antigos valendo por loja (o banco confere).
export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  // Tentativas (inclusive com endereço ocupado) e trocas que deram certo contam separado.
  rateLimitKey(event, 'endereco-tentativa', session.user.id, 30, 60 * 60)
  assertBelowLimit(event, 'endereco', session.user.id, 5, 24 * 60 * 60)

  const store = await ownStore(session)
  if (!store) throw invalid('NO_STORE')

  const body = await readJson(event)
  const slug = String(body.slug ?? '').trim().toLowerCase()
  const code = slugProblem(slug)
  if (code) throw invalid(code)
  if (slug === store.slug) return { store: panelStore(store) }

  await changeSlug(store.id, slug)
  rateLimitKey(event, 'endereco', session.user.id, 5, 24 * 60 * 60)
  return { store: panelStore(await ownStore(session)) }
})
