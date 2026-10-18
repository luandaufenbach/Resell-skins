<script setup>
// Prévia da loja gerada em /previa: vale 24h e fica fora do Google. Os botões de WhatsApp só
// aparecem para quem criou a prévia (a API manda o número só para esse navegador).
const route = useRoute()
const id = computed(() => String(route.params.id))

const { data, error, refresh, status } = await useFetch(() => `/api/previa/${id.value}`)
const { data: config } = await usePublicConfig()

const problem = computed(() => (error.value ? errorMessage(error.value) : null))
const gone = computed(() => ['EXPIRED', 'PREVIEW_NOT_FOUND'].includes(errorCode(error.value)))

// Prévia vencida ou apagada responde com o status certo (410 ou 404), não com 200.
if (import.meta.server && error.value) setResponseStatus(useRequestEvent(), error.value.statusCode)

const origin = useSiteUrl()
const createLink = computed(() =>
  config.value?.ownerWhatsapp ? createStoreLink(config.value.ownerWhatsapp, `${origin}/previa/${id.value}`) : null,
)

// Título e imagem de compartilhamento genéricos: sem o nome do perfil, o link não passa por loja.
const shareText = 'Prévia gerada a partir de um inventário público da Steam. Não é uma loja verificada.'
useSeoMeta({
  robots: 'noindex, nofollow',
  title: () => problem.value?.title ?? 'Prévia de loja | Vitrine',
  description: shareText,
  ogTitle: 'Prévia de loja | Vitrine',
  ogDescription: shareText,
  ogImage: `${origin}/og.png`,
})
</script>

<template>
  <StoreProblem v-if="problem" :problem="problem">
    <template v-if="gone">
      <NuxtLink to="/previa" class="btn btn--primary">Gerar outra prévia</NuxtLink>
      <a v-if="createLink" class="btn" :href="createLink" target="_blank" rel="noopener">
        <AppIcon name="chat" />
        Criar minha loja
      </a>
    </template>
    <template v-else>
      <button class="btn btn--primary" type="button" :disabled="status === 'pending'" @click="refresh()">
        {{ status === 'pending' ? 'Consultando…' : 'Tentar de novo' }}
      </button>
      <NuxtLink to="/previa" class="btn">Usar outro link</NuxtLink>
    </template>
  </StoreProblem>

  <div v-else-if="data">
    <StoreCatalog :store="data" :whatsapp="data.whatsapp" preview />
    <PreviewBar :expires-at="data.expiresAt" :create-link="createLink" />
  </div>
</template>
