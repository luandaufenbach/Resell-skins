// GET /api/painel
// Conta e loja de quem está logado. Sem loja ainda, `draft` traz Steam, WhatsApp e endereço do
// cadastro para o formulário de criar a loja.
export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const store = await ownStore(session)

  return {
    email: session.user.email,
    store: store ? panelStore(store) : null,
    draft: store ? null : storeDraft(session),
  }
})
