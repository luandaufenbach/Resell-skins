<script setup>
// Link do e-mail de confirmação (?token_hash=...): confirma o e-mail e cria a senha. Pede o envio
// do formulário em vez de confirmar ao abrir: leitores de e-mail que abrem os links sozinhos
// gastariam o link, que vale uma vez só. Depois, o painel pede para conferir os dados da loja.
const route = useRoute()
const tokenHash = computed(() => String(route.query.token_hash ?? ''))

const password = ref('')
const pending = ref(false)
const code = ref(null)
const { problem, formEl, fail } = useFormProblem()

async function confirm() {
  problem.value = null
  code.value = null
  if (password.value.length < 8) return fail({ data: { code: 'WEAK_PASSWORD' } })

  pending.value = true
  try {
    await $fetch('/api/conta/confirmar', {
      method: 'POST',
      body: { token_hash: tokenHash.value, senha: password.value },
    })
    await navigateTo('/painel')
  } catch (error) {
    code.value = errorCode(error)
    fail(error)
  } finally {
    pending.value = false
  }
}

useSeoMeta({ title: 'Confirmar e-mail | Revenda', robots: 'noindex' })
</script>

<template>
  <AccountPage :title="!tokenHash ? 'Link incompleto' : code === 'LINK_EXPIRED' ? 'Link vencido' : 'Crie a sua senha'">
    <template v-if="tokenHash && code !== 'LINK_EXPIRED'">
      <p class="lead">Falta um passo para confirmar o e-mail. É com esta senha que você entra no painel.</p>
      <form ref="formEl" class="account-form" novalidate @submit.prevent="confirm">
        <label class="field">
          <span class="field-label">Senha da Revenda</span>
          <PasswordInput
            v-model="password"
            required
            minlength="8"
            autocomplete="new-password"
            :aria-invalid="problem?.field === 'senha' ? 'true' : undefined"
            aria-describedby="senha-dica"
          />
          <span id="senha-dica" class="field-hint">Pelo menos 8 caracteres, diferente da senha da Steam.</span>
        </label>
        <FormProblem v-if="problem" :problem="problem" />
        <button class="btn btn--primary btn--large" type="submit" :disabled="pending">
          {{ pending ? 'Confirmando…' : 'Confirmar e-mail' }}
        </button>
      </form>
      <p class="other-device">
        Começou o cadastro em outro aparelho? Depois de confirmar, a tela de lá se atualiza sozinha e pede esta
        senha.
      </p>
    </template>

    <template v-else>
      <FormProblem v-if="problem" :problem="problem" />
      <p v-else class="lead">Abra o link do e-mail inteiro, sem cortar o final.</p>
      <ResendConfirmation hint="Peça um link novo com o e-mail do cadastro." />
      <div class="account-links">
        <NuxtLink to="/entrar">Já confirmei: entrar</NuxtLink>
      </div>
    </template>
  </AccountPage>
</template>

<style scoped>
.other-device {
  color: var(--muted);
}
</style>
