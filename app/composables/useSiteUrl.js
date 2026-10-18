// Endereço do site para links absolutos (imagem de compartilhamento, link da prévia na mensagem
// do WhatsApp). Vem de NUXT_PUBLIC_SITE_URL; sem ela, do endereço da própria requisição, que
// atrás de um proxy pode sair com http ou com o nome interno do servidor.
export function useSiteUrl() {
  const { siteUrl } = useRuntimeConfig().public
  return siteUrl ? siteUrl.replace(/\/+$/, '') : useRequestURL().origin
}
