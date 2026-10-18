<script setup>
const props = defineProps({ error: { type: Object, required: true } })
const notFound = computed(() => props.error?.statusCode === 404)
const tooMany = computed(() => props.error?.statusCode === 429)
useThemeHead()

const title = computed(() =>
  notFound.value ? 'Página não encontrada' : tooMany.value ? 'Muitas consultas seguidas' : 'Algo deu errado',
)
const body = computed(() =>
  notFound.value
    ? 'Confira o endereço. Se você recebeu este link de alguém, peça o link novo.'
    : tooMany.value
      ? 'Espere alguns minutos e recarregue a página.'
      : 'Recarregue a página. Se continuar, tente de novo em alguns minutos.',
)

useSeoMeta({ title, robots: 'noindex' })
</script>

<template>
  <main class="wrap page-error">
    <NuxtLink to="/" class="wordmark display">Vitrine</NuxtLink>
    <h1 class="display">{{ title }}</h1>
    <p>{{ body }}</p>
    <button class="btn btn--primary" type="button" @click="clearError({ redirect: '/' })">Ir para o início</button>
  </main>
  <SiteFooter />
</template>

<style scoped>
.page-error {
  display: grid;
  justify-items: start;
  gap: 1.25rem;
  padding-top: 1.25rem;
  padding-bottom: 4rem;
}

h1 {
  margin-top: 1.5rem;
  font-size: clamp(2.5rem, 9vw, 4.5rem);
}

@media (min-width: 48rem) {
  h1 {
    margin-top: 3.5rem;
  }
}

p {
  max-width: 36rem;
  color: var(--muted);
  font-size: var(--step-1);
}
</style>
