// Resolve a sessão na requisição que veio do navegador, antes da página renderizar: se o token de
// acesso venceu, a renovação grava o cookie novo nesta resposta. As chamadas internas da página
// herdam a sessão já resolvida (veja server/utils/session.js). Sem sessão válida, os cookies que
// sobraram saem, para /entrar não mandar de volta ao painel.
export default defineEventHandler(async (event) => {
  if (event.node.req.__unenv__) return

  const path = event.path.split('?')[0]
  // Toda gravação (POST, DELETE) de conta e painel tem que vir do próprio site.
  const writes = !['GET', 'HEAD'].includes(event.method)
  if (writes && /^\/api\/(conta|painel)(\/|$)/.test(path)) assertSameOrigin(event)
  if (!/^\/(api\/)?painel(\/|$)/.test(path)) return

  // Banco fora do ar: a própria rota tenta de novo e mostra o erro.
  const session = await resolveSession(event).catch(() => undefined)
  if (session === null) clearStaleSession(event)
})
