<script setup>
// Depois do cadastro: "Confira seu e-mail". Com a aba à vista, pergunta ao servidor a cada 5
// segundos se o e-mail foi confirmado. Confirmando em outro aparelho (o celular, por exemplo), vira
// "E-mail confirmado" e pede a senha criada lá, para continuar por aqui. Entrar sozinho, sem a
// senha, daria a conta a quem começou um cadastro com o e-mail de outra pessoa.
const props = defineProps({
  email: { type: String, required: true },
  confirmed: { type: Boolean, default: false },
})
const emit = defineEmits(['restart'])

// O e-mail veio do cadastro e não muda aqui: só a senha pode estar errada.
const WRONG_PASSWORD = {
  title: 'A senha não confere',
  body: 'Use a que você criou ao confirmar o e-mail, ou crie outra em "Esqueci a senha".',
}

const isConfirmed = ref(props.confirmed)
const password = ref('')
const pending = ref(false)
const problem = ref(null)
const code = ref(null)
const leaving = ref(false)
const formEl = ref(null)

const title = computed(() => (isConfirmed.value ? 'E-mail confirmado' : 'Confira seu e-mail'))
useSeoMeta({ title: computed(() => `${title.value} | Revenda`) })

let timer = null

async function check() {
  if (isConfirmed.value || document.hidden) return
  // Confirmou neste mesmo navegador, em outra aba: a conta já está aberta.
  if (/(?:^|;\s*)vitrine_conta=/.test(document.cookie)) return navigateTo('/painel')
  try {
    const status = await $fetch('/api/conta/cadastro')
    if (status.confirmed) isConfirmed.value = true
  } catch {
    // Servidor ocupado ou fora do ar: tenta de novo na próxima volta.
  }
}

function loop() {
  timer = setTimeout(async () => {
    await check()
    if (!isConfirmed.value) loop()
  }, 5000)
}

// Quem confirmou no celular e voltou para esta aba vê a mudança na hora.
function onVisible() {
  if (!document.hidden) check()
}

watch(isConfirmed, async (value) => {
  if (!value) return
  await nextTick()
  formEl.value?.querySelector('input[type="password"]')?.focus()
})

onMounted(() => {
  document.addEventListener('visibilitychange', onVisible)
  if (!isConfirmed.value) loop()
})

onBeforeUnmount(() => {
  clearTimeout(timer)
  document.removeEventListener('visibilitychange', onVisible)
})

async function login() {
  problem.value = null
  code.value = null
  pending.value = true
  try {
    await $fetch('/api/conta/entrar', { method: 'POST', body: { email: props.email, senha: password.value } })
    await navigateTo('/painel')
  } catch (error) {
    code.value = errorCode(error)
    problem.value = code.value === 'LOGIN_FAILED' ? WRONG_PASSWORD : accountMessage(error)
  } finally {
    pending.value = false
  }
}

async function restart() {
  leaving.value = true
  try {
    await $fetch('/api/conta/cadastro', { method: 'DELETE' })
  } catch {
    // Sem resposta, o cadastro antigo volta só se a página for recarregada.
  } finally {
    leaving.value = false
  }
  emit('restart')
}
</script>

<template>
  <AccountPage v-if="isConfirmed" :title="title">
    <p id="confirmado-texto" class="lead">
      A conta <strong class="email">{{ email }}</strong> está confirmada. Entre com a senha que você acabou de
      criar para continuar por aqui.
    </p>

    <form ref="formEl" class="account-form" @submit.prevent="login">
      <!-- Para o gerenciador de senhas saber de qual conta é a senha. -->
      <input type="email" :value="email" autocomplete="username" readonly hidden />

      <label class="field">
        <span class="field-label">Senha da Revenda</span>
        <PasswordInput
          v-model="password"
          required
          autocomplete="current-password"
          :aria-invalid="code === 'LOGIN_FAILED' ? 'true' : undefined"
          aria-describedby="confirmado-texto senha-dica"
        />
        <span id="senha-dica" class="field-hint">A que você criou ao confirmar o e-mail. Não é a senha da Steam.</span>
      </label>

      <FormProblem v-if="problem" :problem="problem" />

      <button class="btn btn--primary btn--large" type="submit" :disabled="pending">
        {{ pending ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>

    <div class="account-links">
      <NuxtLink to="/esqueci-senha">Esqueci a senha</NuxtLink>
      <button class="link-button" type="button" :disabled="leaving" @click="restart">Usar outro e-mail</button>
    </div>
  </AccountPage>

  <AccountPage v-else :title="title">
    <p class="lead">
      Mandamos um link para <strong class="email">{{ email }}</strong>. Abra o link para confirmar o e-mail e
      criar a senha da sua conta.
    </p>
    <p class="waiting">Pode abrir em outro aparelho, como o celular: esta tela se atualiza sozinha quando você confirmar.</p>

    <ResendConfirmation :email="email" />

    <div class="account-links">
      <NuxtLink to="/entrar">Já confirmei: entrar</NuxtLink>
      <button class="link-button" type="button" :disabled="leaving" @click="restart">Usar outro e-mail</button>
    </div>
  </AccountPage>
</template>

<style scoped>
/* E-mail comprido quebra em qualquer ponto em vez de passar da tela do celular. */
.email {
  overflow-wrap: anywhere;
}

.waiting {
  color: var(--muted);
}

.link-button {
  min-height: 44px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--text);
  font-size: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.link-button:disabled {
  color: var(--muted);
  cursor: default;
}
</style>
