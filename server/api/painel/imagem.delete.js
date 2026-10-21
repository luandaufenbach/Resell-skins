// DELETE /api/painel/imagem?tipo=logo|banner
// Tira a logo ou o banner da loja e apaga o arquivo.
export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const kind = String(getQuery(event).tipo ?? '')
  if (!isImageKind(kind)) throw invalid('INVALID_FIELD')
  rateLimitKey(event, 'imagem', session.user.id, 20, 60 * 60)

  const store = await ownStore(session)
  if (!store) throw invalid('NO_STORE')

  if (store[kind]) {
    await updateStore(store.id, { [kind]: null })
    await removeImages([store[kind]])
  }
  return { store: panelStore(await ownStore(session)) }
})
