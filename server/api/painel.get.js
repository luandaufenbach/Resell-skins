// GET /api/painel
// Conta e loja de quem está logado. Sem loja ainda, `draft` traz Steam, WhatsApp e endereço do
// cadastro para o formulário de criar a loja. `pix` é a chave Pix do dono, para o aviso de
// vencimento: só sai quando o aviso aparece (loja verificada, a 5 dias ou menos do vencimento ou
// fora do ar).
const WARN = 5 * 24 * 60 * 60 * 1000

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const store = await ownStore(session)
  const panel = store ? panelStore(store) : null
  const renewal = panel?.verified && (!panel.open || Date.parse(panel.paidUntil) - Date.now() <= WARN)

  return {
    email: session.user.email,
    store: panel,
    draft: store ? null : storeDraft(session),
    pix: renewal ? await ownerPix() : null,
  }
})

async function ownerPix() {
  try {
    const { pix_dono: pix } = await readConfig(['pix_dono'])
    return typeof pix === 'string' && pix.trim() ? pix.trim() : null
  } catch (error) {
    console.error('[painel] configuração indisponível:', error.message)
    return null
  }
}
