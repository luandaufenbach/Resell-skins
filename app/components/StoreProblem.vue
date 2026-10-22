<script setup>
// Tela de quando a loja não abre (inventário privado, prévia expirada...): o que houve e o que
// fazer. As ações vêm no slot.
defineProps({
  problem: { type: Object, required: true },
})
</script>

<template>
  <main class="wrap problem">
    <NuxtLink to="/" class="wordmark display">Revenda</NuxtLink>
    <h1 class="display problem-title">{{ problem.title }}</h1>
    <p class="problem-body">{{ problem.body }}</p>
    <div class="problem-actions">
      <slot />
    </div>
  </main>
</template>

<style scoped>
.problem {
  display: grid;
  justify-items: start;
  gap: 1.25rem;
  padding-top: 1.25rem;
  padding-bottom: 4rem;
}

.problem-title {
  margin-top: 1.5rem;
  font-size: clamp(2.5rem, 9vw, 4.5rem);
}

@media (min-width: 48rem) {
  .problem-title {
    margin-top: 3.5rem;
  }
}

.problem-body {
  max-width: 36rem;
  color: var(--muted);
  font-size: var(--step-1);
}

.problem-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
