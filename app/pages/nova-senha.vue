<script setup>
// Senha nova, pelo link do e-mail (?token_hash=...). Salva a senha e entra no painel.
const route = useRoute()
const tokenHash = computed(() => String(route.query.token_hash ?? ''))

const password = ref('')
const pending = ref(false)
const problem = ref(null)
const code = ref(null)

async function submit() {
  problem.value = null
  code.value = null
  if (password.value.length < 8) {
    problem.value = accountMessage({ data: { code: 'WEAK_PASSWORD' } })
    return
  }
  pending.value = true
  try {
    await $fetch('/api/conta/nova-senha', {
      method: 'POST',
      body: { token_hash: tokenHash.value, senha: password.value },
    })
    await navigateTo('/painel')
  } catch (error) {
    code.value = errorCode(error)
    problem.value = accountMessage(error)
  } finally {
    pending.value = false
  }
}

useSeoMeta({ title: 'Senha nova | Vitrine', robots: 'noindex' })
</script>

<template>
  <AccountPage v-if="!tokenHash" title="Link incompleto">
    <p class="lead">Abra o link do e-mail inteiro, sem cortar o final. Se não funcionar, peça outro.</p>
    <div class="account-links">
      <NuxtLink to="/esqueci-senha">Pedir outro link</NuxtLink>
    </div>
  </AccountPage>

  <AccountPage v-else title="Senha nova">
    <form class="account-form" novalidate @submit.prevent="submit">
      <label class="field">
        <span class="field-label">Senha nova</span>
        <PasswordInput
          v-model="password"
          required
          minlength="8"
          autocomplete="new-password"
          :aria-invalid="code === 'WEAK_PASSWORD' ? 'true' : undefined"
          aria-describedby="senha-dica"
        />
        <span id="senha-dica" class="field-hint">Pelo menos 8 caracteres. Não use a senha da Steam.</span>
      </label>

      <FormProblem v-if="problem" :problem="problem">
        <NuxtLink v-if="code === 'LINK_EXPIRED'" to="/esqueci-senha" class="btn">Pedir outro link</NuxtLink>
      </FormProblem>

      <button class="btn btn--primary btn--large" type="submit" :disabled="pending">
        {{ pending ? 'Salvando…' : 'Salvar e entrar' }}
      </button>
    </form>
  </AccountPage>
</template>
