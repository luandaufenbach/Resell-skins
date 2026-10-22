// GET /api/admin/lojas
// Todas as lojas com situação, vencimento, plano e valor, fundador, verificação, última leitura do
// inventário, itens, visitas e cliques no WhatsApp em 30 dias. `config` traz os planos, as vagas de
// fundador e a chave Pix do dono, para a tela e a mensagem de cobrança.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const [stores, config] = await Promise.all([adminStores(), adminConfig()])
  return { stores, config }
})
