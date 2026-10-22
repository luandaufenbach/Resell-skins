<script setup>
// Entrar no painel com e-mail e senha.
// Quem já entrou vai direto para o painel.
if (useCookie('vitrine_conta').value) await navigateTo('/painel', { replace: true })

const form = reactive({ email: '', senha: '' })
const pending = ref(false)
const problem = ref(null)
const code = ref(null)

async function submit() {
  problem.value = null
  code.value = null
  pending.value = true
  try {
    await $fetch('/api/conta/entrar', { method: 'POST', body: form })
    await navigateTo('/painel')
  } catch (error) {
    code.value = errorCode(error)
    problem.value = accountMessage(error)
  } finally {
    pending.value = false
  }
}

const invalid = computed(() => (code.value === 'LOGIN_FAILED' ? 'true' : undefined))

useSeoMeta({ title: 'Entrar | Revenda', robots: 'noindex' })
</script>

<template>
  <AccountPage title="Entrar">
    <form class="account-form" @submit.prevent="submit">
      <label class="field">
        <span class="field-label">E-mail</span>
        <input
          v-model="form.email"
          class="input"
          type="email"
          required
          autocomplete="email"
          spellcheck="false"
          :aria-invalid="invalid"
        />
      </label>

      <label class="field">
        <span class="field-label">Senha da Revenda</span>
        <PasswordInput
          v-model="form.senha"
          required
          autocomplete="current-password"
          :aria-invalid="invalid"
          aria-describedby="senha-dica"
        />
        <span id="senha-dica" class="field-hint">A que você criou no cadastro. Não é a senha da Steam.</span>
      </label>

      <FormProblem v-if="problem" :problem="problem" />
      <ResendConfirmation v-if="code === 'EMAIL_NOT_CONFIRMED'" :email="form.email" hint="Perdeu o e-mail? Peça outro link." />

      <button class="btn btn--primary btn--large" type="submit" :disabled="pending">
        {{ pending ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>

    <div class="account-links">
      <NuxtLink to="/esqueci-senha">Esqueci a senha</NuxtLink>
      <NuxtLink to="/cadastro">Criar minha loja</NuxtLink>
    </div>
  </AccountPage>
</template>
