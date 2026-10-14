<script setup>
const props = defineProps({ error: { type: Object, required: true } })
const notFound = computed(() => props.error?.statusCode === 404)

useSeoMeta({ title: () => (notFound.value ? 'Página não encontrada' : 'Algo deu errado') })
</script>

<template>
  <main class="wrap page-error">
    <h1 class="display">{{ notFound ? 'Página não encontrada' : 'Algo deu errado' }}</h1>
    <p>
      {{
        notFound
          ? 'Confira o endereço ou gere o catálogo de novo a partir do link da Steam.'
          : 'Recarregue a página. Se continuar, tente de novo em alguns minutos.'
      }}
    </p>
    <button class="btn btn--primary" type="button" @click="clearError({ redirect: '/' })">Ir para o início</button>
  </main>
</template>

<style scoped>
.page-error {
  display: grid;
  justify-items: start;
  gap: 1.25rem;
  padding-top: 5rem;
  padding-bottom: 4rem;
}

h1 {
  font-size: clamp(2.5rem, 9vw, 4.5rem);
}

p {
  max-width: 36rem;
  color: var(--muted);
  font-size: var(--step-1);
}
</style>
