// POST /api/painel/imagem?tipo=logo|banner  (corpo: o arquivo, até 8 MB)
// Logo ou banner da loja. O servidor reconverte a imagem para WebP (server/utils/images.js),
// grava no Storage e apaga a anterior. Banner novo volta o ponto de foco para o centro.
// Só loja verificada: loja que nunca foi verificada é apagada em 7 dias, e as imagens dela ficariam
// para trás no bucket público. Um envio por vez por conta (e dois no servidor).
// Erros: NOT_IMAGE (400), LOGO_SMALL/BANNER_SMALL (400), NOT_VERIFIED (403), UPLOAD_BUSY (429),
// IMAGE_TOO_LARGE (413).
export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const kind = String(getQuery(event).tipo ?? '')
  if (!isImageKind(kind)) throw invalid('INVALID_FIELD')
  rateLimitKey(event, 'imagem', session.user.id, 20, 60 * 60)

  const release = claimUpload(session.user.id)
  try {
    const store = await ownStore(session)
    if (!store) throw invalid('NO_STORE')
    if (!store.verificada_em) {
      throw createError({ statusCode: 403, statusMessage: 'Loja não verificada', data: { code: 'NOT_VERIFIED' } })
    }

    const image = await processImage(kind, await readUpload(event))
    const path = `${store.id}/${image.name}`
    const previous = store[kind]

    if (path !== previous) {
      try {
        await uploadImage(path, image.data)
      } catch (error) {
        // Mesmo arquivo de antes (o nome é o hash do conteúdo): já está lá.
        if (error?.data?.error !== 'Duplicate') throw unavailable('imagens', error)
      }
      await updateStore(store.id, kind === 'banner' ? { banner: path, banner_x: 50, banner_y: 50 } : { logo: path })
      await removeImages([previous])
    }
    return { store: panelStore(await ownStore(session)) }
  } finally {
    release()
  }
})
