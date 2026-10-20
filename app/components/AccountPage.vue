<script setup>
// Moldura das telas de conta (cadastro, entrar, senha, confirmação): o nome do produto, o título
// e o formulário alinhados à esquerda, como a tela da prévia. O slot `aside` vai ao lado do
// formulário no computador e abaixo dele no celular.
defineProps({
  title: { type: String, required: true },
})
</script>

<template>
  <main class="wrap account">
    <NuxtLink to="/" class="wordmark display">Vitrine</NuxtLink>
    <div class="account-layout" :class="{ 'has-aside': $slots.aside }">
      <div class="account-body">
        <h1 class="display account-title">{{ title }}</h1>
        <slot />
      </div>
      <aside v-if="$slots.aside" class="account-aside">
        <slot name="aside" />
      </aside>
    </div>
  </main>
</template>

<style scoped>
.account {
  padding-top: 1.25rem;
  padding-bottom: 3rem;
}

.account-layout {
  display: grid;
  gap: 3rem;
  margin-top: 2.5rem;
}

.account-body {
  display: grid;
  gap: 1.25rem;
  align-content: start;
  max-width: 32rem;
}

.account-title {
  font-size: clamp(2.5rem, 9vw, 4.25rem);
}

@media (min-width: 48rem) {
  .account-layout {
    margin-top: 4rem;
  }
}

@media (min-width: 64rem) {
  .account-layout.has-aside {
    grid-template-columns: minmax(0, 32rem) minmax(0, 24rem);
    gap: 6rem;
  }

  /* Alinha o texto ao lado com o primeiro campo, não com o título. */
  .account-aside {
    padding-top: 6.5rem;
  }
}

/* Peças comuns das telas de conta. */
.account :deep(.lead) {
  color: var(--muted);
  font-size: var(--step-1);
  line-height: 1.45;
}

.account :deep(.account-form) {
  display: grid;
  gap: 1.125rem;
}

.account :deep(.account-form > .btn) {
  justify-self: start;
  margin-top: 0.25rem;
}

.account :deep(.account-links) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1.5rem;
}

.account :deep(.account-links a) {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: var(--text);
  text-underline-offset: 3px;
}
</style>
