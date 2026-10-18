// GET /api/demo
// Loja de exemplo (dados fictícios, preços reais da tabela), no mesmo formato de /api/previa/:id.
// Não consulta a Steam.
export default defineEventHandler((event) => {
  rateLimit(event, 'ler', 60, 60)
  return getPricedStore('demo')
})
