<script setup>
// Loja de exemplo: dados fictícios, preços reais da tabela. Não consulta a Steam.
// Na fase 4 passa a ser /demo.
const { data, error, refresh, status } = await useFetch('/api/demo')
const problem = computed(() => (error.value ? errorMessage(error.value) : null))
</script>

<template>
  <StoreProblem v-if="problem" :problem="problem">
    <button class="btn btn--primary" type="button" :disabled="status === 'pending'" @click="refresh()">
      {{ status === 'pending' ? 'Abrindo…' : 'Tentar de novo' }}
    </button>
  </StoreProblem>
  <StoreCatalog v-else-if="data" :store="data" />
</template>
