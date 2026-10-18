// GET /api/previa/:id
// Resposta: a loja com preços (cache de 10 min, como getPricedStore) mais
// { whatsapp, owner, expiresAt }. O WhatsApp só vem para quem criou a prévia (cookie dela);
// para os outros vem vazio e `owner` é falso.
// Prévia vencida: 410 (EXPIRED). Inexistente ou já apagada: 404 (PREVIEW_NOT_FOUND).
export default defineEventHandler(async (event) => {
  rateLimit(event, 'ler', 60, 60)

  const id = getRouterParam(event, 'id')
  const preview = isPreviewId(id) ? await findPreview(id) : null

  if (!preview) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Prévia não encontrada',
      data: { code: 'PREVIEW_NOT_FOUND' },
    })
  }
  if (Date.parse(preview.expiresAt) <= Date.now() || !preview.steamid) {
    throw createError({
      statusCode: 410,
      statusMessage: 'Prévia expirada',
      data: { code: 'EXPIRED' },
    })
  }

  const owner = getCookie(event, previewCookie(id)) === '1'
  const store = await getPricedStore(preview.steamid)
  return { ...store, whatsapp: owner ? preview.whatsapp : '', owner, expiresAt: preview.expiresAt }
})
