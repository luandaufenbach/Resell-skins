<script setup>
// Pede o link para criar uma senha nova. A resposta é a mesma com ou sem conta para o e-mail.
const email = ref('')
const pending = ref(false)
const problem = ref(null)
const sent = ref(false)

async function submit() {
  problem.value = null
  pending.value = true
  try {
    await $fetch('/api/conta/recuperar', { method: 'POST', body: { email: email.value } })
    sent.value = true
  } catch (error) {
    problem.value = accountMessage(error)
  } finally {
    pending.value = false
  }
}

useSeoMeta({ title: 'Esqueci a senha | Vitrine', robots: 'noindex' })
</script>

<template>
  <AccountPage v-if="sent" title="Confira seu e-mail">
    <p class="lead">
      Se houver uma conta com <strong>{{ email.trim() }}</strong>, chega um link para criar uma senha nova em
      alguns minutos. Não chegou? Veja a caixa de spam.
    </p>
    <div class="account-links">
      <NuxtLink to="/entrar">Voltar para entrar</NuxtLink>
    </div>
  </AccountPage>

  <AccountPage v-else title="Esqueci a senha">
    <p class="lead">Digite o e-mail da conta. Mandamos um link para você criar uma senha nova.</p>

    <form class="account-form" @submit.prevent="submit">
      <label class="field">
        <span class="field-label">E-mail da conta</span>
        <input v-model="email" class="input" type="email" required autocomplete="email" spellcheck="false" />
      </label>

      <FormProblem v-if="problem" :problem="problem" />

      <button class="btn btn--primary btn--large" type="submit" :disabled="pending">
        {{ pending ? 'Mandando…' : 'Mandar o link' }}
      </button>
    </form>

    <div class="account-links">
      <NuxtLink to="/entrar">Voltar para entrar</NuxtLink>
    </div>
  </AccountPage>
</template>
