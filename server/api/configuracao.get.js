// GET /api/configuracao
// Valores públicos da página inicial, da tabela de configuração: planos e WhatsApp do dono. Só
// estas chaves saem do banco. Se o banco falhar, os campos vêm nulos e a página esconde o que
// depende deles.
const getPublicConfig = defineCachedFunction(
  async () => {
    const config = await readConfig(['planos', 'whatsapp_dono'])
    const money = (value) => (Number(value) > 0 ? Number(value) : null)

    return {
      plans: { monthly: money(config.planos?.mensal), quarterly: money(config.planos?.trimestral) },
      ownerWhatsapp: /^\d{12,15}$/.test(config.whatsapp_dono) ? config.whatsapp_dono : '',
    }
  },
  { name: 'public-config', maxAge: 60 * 5, getKey: () => 'v1' },
)

export default defineEventHandler(async () => {
  try {
    return await getPublicConfig()
  } catch (error) {
    console.error('[configuração] banco indisponível:', error.message)
    return { plans: { monthly: null, quarterly: null }, ownerWhatsapp: '' }
  }
})
