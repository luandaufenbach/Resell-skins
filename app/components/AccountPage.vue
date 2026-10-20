<script setup>
// Moldura das telas de conta (cadastro, entrar, senha, confirmação): o nome do produto, o título
// e o formulário alinhados à esquerda. No computador, a vitrine de exemplo ocupa o lado direito,
// com o endereço `slug` em cima (o cadastro passa o que está sendo digitado). No celular, fica só
// o formulário.
defineProps({
  title: { type: String, required: true },
  slug: { type: String, default: '' },
})
</script>

<template>
  <main class="wrap account">
    <NuxtLink to="/" class="wordmark display">Vitrine</NuxtLink>
    <div class="account-layout">
      <div class="account-body">
        <h1 class="display account-title">{{ title }}</h1>
        <slot />
      </div>
      <aside class="account-aside" aria-label="Exemplo de loja">
        <StoreWindow :slug="slug" />
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

.account-aside {
  display: none;
}

@media (min-width: 48rem) {
  .account-layout {
    margin-top: 4rem;
  }
}

@media (min-width: 64rem) {
  .account-layout {
    grid-template-columns: minmax(0, 32rem) minmax(0, 1fr);
    gap: 4rem;
  }

  /* Acompanha a rolagem do formulário longo do cadastro, sem deixar a coluna vazia embaixo. */
  .account-aside {
    display: block;
    position: sticky;
    top: 1.5rem;
    align-self: start;
    max-width: 44rem;
    padding-top: 0.5rem;
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
