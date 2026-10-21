// Teto de tamanho do corpo nas gravações da API, antes de qualquer rota ler: o readBody junta o
// corpo inteiro na memória, e alguns POSTs de 100 MB derrubariam o servidor de 512 MB.
// O Node não deixa ler além do Content-Length declarado; corpo sem ele (chunked) é recusado,
// porque o navegador sempre manda o tamanho (fetch, sendBeacon, formulário).
const JSON_MAX = 32 * 1024

export default defineEventHandler((event) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(event.method)) return
  const path = event.path.split('?')[0]
  if (!path.startsWith('/api/')) return

  const max = path === '/api/painel/imagem' ? MAX_UPLOAD : JSON_MAX
  const length = getRequestHeader(event, 'content-length')
  if (length == null) {
    if (getRequestHeader(event, 'transfer-encoding')) {
      throw createError({ statusCode: 411, statusMessage: 'Tamanho obrigatório', data: { code: 'INVALID_FIELD' } })
    }
    return
  }
  if (!/^\d+$/.test(length) || Number(length) > max) {
    const code = path === '/api/painel/imagem' ? 'IMAGE_TOO_LARGE' : 'INVALID_FIELD'
    throw createError({ statusCode: 413, statusMessage: 'Corpo grande demais', data: { code } })
  }
})
