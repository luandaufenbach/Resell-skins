<script setup>
// Erro de um formulário: o que houve e como resolver. `problem` é { title, body }.
defineProps({
  problem: { type: Object, required: true },
})
</script>

<template>
  <div class="form-problem" role="alert">
    <p class="form-problem-title">{{ problem.title }}</p>
    <p>{{ problem.body }}</p>
    <slot />
  </div>
</template>

<style scoped>
.form-problem {
  display: grid;
  gap: 0.25rem;
  padding: 0.875rem 1rem;
  border-left: 3px solid var(--alert);
  background: var(--surface);
  font-size: var(--step--1);
}

.form-problem-title {
  color: var(--alert);
  font-size: var(--step-0);
  font-weight: 600;
}

.form-problem :slotted(.btn) {
  justify-self: start;
  margin-top: 0.5rem;
}
</style>
