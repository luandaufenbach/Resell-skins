// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },

  css: ['@fontsource-variable/saira/wdth.css', '~/assets/css/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  runtimeConfig: {
    // Opcional. Com uma chave da Steam Web API, links /id/apelido são resolvidos
    // pela API oficial. Sem ela, usamos o XML público do perfil.
    // Defina no arquivo .env como NUXT_STEAM_API_KEY=...
    steamApiKey: '',
    // Banco (Supabase). A chave secreta ignora o RLS: só o servidor usa. A publishable também
    // fica só no servidor: login e painel passam por ele.
    // NUXT_SUPABASE_URL, NUXT_SUPABASE_SECRET_KEY e NUXT_SUPABASE_PUBLISHABLE_KEY no .env.
    supabaseUrl: '',
    supabaseSecretKey: '',
    supabasePublishableKey: '',
    // Chave secreta do Cloudflare Turnstile (cadastro e prévia). NUXT_TURNSTILE_SECRET_KEY.
    turnstileSecretKey: '',
    // Cabeçalho com o IP do visitante, quando o site roda atrás de um proxy (a hospedagem).
    // Usado no limite de consultas por IP. NUXT_IP_HEADER no .env.
    ipHeader: '',
    // E-mails de quem abre o /admin, separados por vírgula. Conferido no servidor em toda página
    // /admin e rota /api/admin. NUXT_ADMIN_EMAILS no .env.
    adminEmails: '',
    public: {
      // Endereço do site, para links absolutos (ex.: https://dominio.com). NUXT_PUBLIC_SITE_URL no .env.
      siteUrl: '',
      // Chave do site do Turnstile (vai para o navegador). NUXT_PUBLIC_TURNSTILE_SITE_KEY.
      turnstileSiteKey: '',
    },
  },

  $development: {
    runtimeConfig: {
      // Em desenvolvimento o Nuxt fica atrás de um proxy próprio, que informa o IP neste cabeçalho.
      ipHeader: 'x-forwarded-for',
      // Chaves de teste públicas da Cloudflare, que sempre passam. As de verdade ficam só na hospedagem.
      turnstileSecretKey: '1x0000000000000000000000000000000AA',
      public: { turnstileSiteKey: '1x00000000000000000000AA' },
    },
  },

  nitro: {
    // Cache em memória (inventários, lojas e prévias com preço) com teto: o que sai primeiro é o
    // que ficou mais tempo sem uso. O servidor da Render grátis tem 512 MB.
    storage: { cache: { driver: 'lru-cache', max: 2000, maxSize: 64 * 1024 * 1024 } },
  },

  // Prévias, telas de conta e respostas da API ficam fora do Google.
  routeRules: {
    '/previa/*': { headers: { 'X-Robots-Tag': 'noindex' } },
    '/api/**': { headers: { 'X-Robots-Tag': 'noindex' } },
    // A página pode trazer o e-mail do cadastro em andamento: nada de cache.
    '/cadastro': { headers: { 'X-Robots-Tag': 'noindex', 'Cache-Control': 'no-store' } },
    '/entrar': { headers: { 'X-Robots-Tag': 'noindex' } },
    '/esqueci-senha': { headers: { 'X-Robots-Tag': 'noindex' } },
    '/nova-senha': { headers: { 'X-Robots-Tag': 'noindex' } },
    '/confirmar': { headers: { 'X-Robots-Tag': 'noindex' } },
    // Painel e admin também ganham cabeçalhos contra iframe, com qualquer maiúscula, no
    // server/middleware/admin.js.
    '/painel': { headers: { 'X-Robots-Tag': 'noindex' } },
    '/admin': { headers: { 'X-Robots-Tag': 'noindex', 'Cache-Control': 'no-store' } },
    '/admin/**': { headers: { 'X-Robots-Tag': 'noindex', 'Cache-Control': 'no-store' } },
    '/api/admin/**': { headers: { 'Cache-Control': 'no-store' } },
  },
})
