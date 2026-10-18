// Guarda o IP do visitante no contexto, para as chamadas internas da página (que não têm IP
// próprio) contarem no limite dele. A página da prévia conta aqui; as rotas da API contam no
// próprio handler (veja server/utils/limit.js).
export default defineEventHandler((event) => {
  if (event.node.req.__unenv__) return

  event.context.clientIp = clientIp(event)
  // Sem barra no fim: /previa/abc/ é a mesma página que /previa/abc.
  const path = event.path.split('?')[0].replace(/\/+$/, '')
  if (/^\/previa\/[^/]+$/.test(path)) rateLimit(event, 'ler', 60, 60)
})
