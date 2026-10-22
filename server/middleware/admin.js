// Toda página /admin e rota /api/admin passa por aqui antes de qualquer outra coisa: sem sessão de
// admin, 404. Cada rota da API confere de novo (requireAdmin, que também confere a origem das
// gravações), para uma rota nova não depender só deste arquivo. Vale também nas chamadas internas
// da página, que herdam a sessão do navegador.
// Painel e admin também não abrem dentro de um iframe de outro site (um botão escondido por cima
// levaria o revendedor ou o admin a clicar sem ver) nem entram no Google. Os cabeçalhos vão aqui,
// e não nas routeRules, porque as regras diferenciam maiúsculas e as páginas não (/Painel abre).
const PRIVATE_HEADERS = {
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'",
  'X-Robots-Tag': 'noindex',
}

export default defineEventHandler(async (event) => {
  const path = normalizePath(event.path)
  if (/^\/(admin|painel)(\/|$)/.test(path)) setResponseHeaders(event, PRIVATE_HEADERS)
  if (/^\/(api\/)?admin(\/|$)/.test(path)) {
    // Lista de lojas com e-mail e WhatsApp: nada disso fica guardado no navegador nem em proxy.
    setResponseHeader(event, 'Cache-Control', 'no-store')
    await requireAdmin(event)
  }
})

// O roteador das páginas não diferencia maiúsculas (/Admin abre a mesma página) e resolve "." e ".."
// (/x/../admin também abre). O endereço pode vir ainda com letras codificadas (/%61dmin, /%2e/admin)
// ou barras repetidas. Devolve o caminho em minúsculas.
function normalizePath(raw) {
  let path = String(raw ?? '').split('?')[0]
  try {
    path = decodeURIComponent(path)
  } catch {
    // Codificação quebrada: confere como veio.
  }
  path = path.replace(/\\/g, '/').replace(/\/{2,}/g, '/')
  try {
    path = new URL(path, 'http://x').pathname
  } catch {
    // Caminho que nem vira URL: confere como está.
  }
  return path.toLowerCase()
}
