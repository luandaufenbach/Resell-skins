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
    // Banco (Supabase). A chave secreta ignora o RLS: só o servidor usa.
    // NUXT_SUPABASE_URL e NUXT_SUPABASE_SECRET_KEY no .env.
    supabaseUrl: '',
    supabaseSecretKey: '',
  },
})
