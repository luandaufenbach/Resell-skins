<script setup>
// Loja do revendedor em dominio.com/<slug>. Lê só o banco (o visitante nunca dispara consulta à
// Steam). Loja não verificada ou vencida mostra "loja indisponível".
const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { data, error, refresh, status } = await useFetch(() => `/api/loja/${slug.value}`)

// Endereço antigo da loja: redireciona para o atual (vale 60 dias depois da troca).
if (data.value?.moved) {
  await navigateTo({ path: `/${data.value.moved}`, query: route.query }, { redirectCode: 301, replace: true })
}

const problem = computed(() => (error.value ? errorMessage(error.value) : null))
const retry = computed(() => !['STORE_NOT_FOUND', 'STORE_UNAVAILABLE'].includes(errorCode(error.value)))

if (import.meta.server && error.value) setResponseStatus(useRequestEvent(), error.value.statusCode)
useSeoMeta({ robots: () => (problem.value ? 'noindex' : undefined), title: () => problem.value?.title })
</script>

<template>
  <StoreProblem v-if="problem" :problem="problem">
    <button v-if="retry" class="btn btn--primary" type="button" :disabled="status === 'pending'" @click="refresh()">
      {{ status === 'pending' ? 'Abrindo…' : 'Tentar de novo' }}
    </button>
  </StoreProblem>
  <StoreCatalog v-else-if="data?.items" :store="data" :whatsapp="data.whatsapp" :slug="data.slug" />
</template>
