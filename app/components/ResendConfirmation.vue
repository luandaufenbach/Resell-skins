<script setup>
// Pede outro e-mail de confirmação. Sem `email`, mostra o campo para a pessoa digitar.
const props = defineProps({
  email: { type: String, default: '' },
  hint: { type: String, default: 'Não chegou? Veja a caixa de spam ou peça outro link.' },
})

const typed = ref('')
const pending = ref(false)
const sent = ref(false)
const problem = ref(null)

async function resend() {
  problem.value = null
  pending.value = true
  try {
    await $fetch('/api/conta/reenviar', { method: 'POST', body: { email: props.email || typed.value } })
    sent.value = true
  } catch (error) {
    problem.value = accountMessage(error)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="resend">
    <p v-if="sent" class="resend-done" role="status">
      Pronto. Se o e-mail ainda não foi confirmado, um link novo chega em alguns minutos.
    </p>
    <template v-else>
      <p class="resend-hint">{{ hint }}</p>
      <form class="resend-form" @submit.prevent="resend">
        <label v-if="!email" class="field">
          <span class="field-label">E-mail do cadastro</span>
          <input v-model="typed" class="input" type="email" required autocomplete="email" spellcheck="false" />
        </label>
        <button class="btn" type="submit" :disabled="pending">
          {{ pending ? 'Mandando…' : 'Mandar o link de novo' }}
        </button>
      </form>
      <FormProblem v-if="problem" :problem="problem" />
    </template>
  </div>
</template>

<style scoped>
.resend,
.resend-form {
  display: grid;
  gap: 0.875rem;
}

.resend-form .btn {
  justify-self: start;
}

.resend-hint,
.resend-done {
  color: var(--muted);
}
</style>
