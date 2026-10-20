// GET /api/conta/previa/:id
// Dados para o cadastro vir preenchido a partir da prévia: link da Steam, WhatsApp e uma sugestão
// de endereço. Só para quem criou a prévia (cookie dela), como os botões de WhatsApp da prévia.
export default defineEventHandler(async (event) => {
  rateLimit(event, 'ler', 60, 60)

  const id = getRouterParam(event, 'id')
  const owner = isPreviewId(id) && getCookie(event, previewCookie(id)) === '1'
  const preview = owner ? await findPreview(id) : null
  if (!preview?.steamid || Date.parse(preview.expiresAt) <= Date.now()) {
    throw createError({ statusCode: 404, statusMessage: 'Prévia não encontrada', data: { code: 'PREVIEW_NOT_FOUND' } })
  }

  return {
    steam: `https://steamcommunity.com/profiles/${preview.steamid}`,
    whatsapp: preview.whatsapp,
    slug: slugify(preview.profile?.name),
  }
})
