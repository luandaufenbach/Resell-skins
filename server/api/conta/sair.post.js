// POST /api/conta/sair
// Encerra a sessão na Auth (o token de renovação deixa de valer) e apaga os cookies.
export default defineEventHandler(async (event) => {
  const session = await resolveSession(event).catch(() => null)
  if (session) {
    await supabaseAs(session.token, '/auth/v1/logout', { method: 'POST', query: { scope: 'local' } }).catch(
      (error) => console.error('[conta] sair:', error.message),
    )
  }
  endSession(event)
  return { ok: true }
})
