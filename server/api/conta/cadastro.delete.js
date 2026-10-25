// DELETE /api/conta/cadastro
// "Usar outro e-mail": esquece o cadastro em andamento neste navegador e volta ao formulário.
export default defineEventHandler((event) => {
  clearPendingSignup(event)
  return { ok: true }
})
