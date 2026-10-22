<script setup>
// Cadastro do revendedor: Steam, WhatsApp, endereço da loja e e-mail. Vindo da prévia
// (?previa=<id>, só no navegador que criou a prévia), Steam, WhatsApp e endereço já vêm
// preenchidos. A senha é criada no link do e-mail, e a loja no painel, depois de conferir os dados.
const route = useRoute()
const { data: config } = await usePublicConfig()

// Quem já entrou vai direto para o painel.
if (useCookie('vitrine_conta').value) await navigateTo('/painel', { replace: true })

const form = reactive({ steam: '', whatsapp: '', slug: '', email: '' })
const token = ref('')
const turnstile = ref(null)
const pending = ref(false)
const sentTo = ref('')
const { problem, formEl, fail } = useFormProblem()

const previewId = String(route.query.previa ?? '')
if (/^[A-Za-z0-9]{10}$/.test(previewId)) {
  const { data } = await useFetch(`/api/conta/previa/${previewId}`, { key: `cadastro-${previewId}` })
  if (data.value) {
    form.steam = data.value.steam
    form.whatsapp = formatPhone(data.value.whatsapp)
    form.slug = data.value.slug
  }
}

const monthly = computed(() => config.value?.plans?.monthly)

async function submit() {
  problem.value = null
  const whatsapp = normalizePhone(form.whatsapp)
  const code = whatsapp.length < 12 ? 'INVALID_PHONE' : (slugProblem(form.slug) ?? (!token.value ? 'CAPTCHA' : null))
  if (code) return fail({ data: { code } })

  pending.value = true
  try {
    await $fetch('/api/conta/cadastro', {
      method: 'POST',
      body: { ...form, whatsapp, turnstile: token.value },
    })
    sentTo.value = form.email.trim()
  } catch (error) {
    fail(error)
    turnstile.value?.reset()
  } finally {
    pending.value = false
  }
}

useSeoMeta({
  title: 'Criar minha loja | Revenda',
  description: 'Crie a sua loja de skins a partir do seu inventário público da Steam.',
  robots: 'noindex',
})
</script>

<template>
  <AccountPage v-if="sentTo" title="Confira seu e-mail">
    <p class="lead">
      Mandamos um link para <strong>{{ sentTo }}</strong>. Abra o link para confirmar o e-mail e criar a senha
      da sua conta.
    </p>
    <ResendConfirmation :email="sentTo" />
  </AccountPage>

  <AccountPage v-else title="Criar minha loja" :slug="form.slug">
    <p class="lead">Sua loja fica pronta em poucos minutos, com as skins do seu inventário.</p>

    <TrustNote />

    <form ref="formEl" class="account-form" novalidate @submit.prevent="submit">
      <StoreFields :form="form" :problem="problem" />

      <label class="field">
        <span class="field-label">E-mail</span>
        <input
          v-model="form.email"
          class="input"
          type="email"
          required
          autocomplete="email"
          spellcheck="false"
          placeholder="nome@gmail.com"
          :aria-invalid="problem?.field === 'email' ? 'true' : undefined"
          :aria-describedby="problem?.field === 'email' ? 'erro-email' : 'email-dica'"
        />
        <span id="email-dica" class="field-hint">
          Mandamos um link para confirmar. Nele você cria a senha do painel. O e-mail não aparece na loja.
        </span>
      </label>
      <FormProblem v-if="problem?.field === 'email'" id="erro-email" :problem="problem" />

      <TurnstileWidget ref="turnstile" v-model="token" />

      <FormProblem v-if="problem && !problem.field" :problem="problem" />

      <button class="btn btn--primary btn--large" type="submit" :disabled="pending">
        {{ pending ? 'Conferindo o inventário…' : 'Criar minha loja' }}
      </button>
    </form>

    <div class="account-links">
      <NuxtLink to="/entrar">Já tenho conta</NuxtLink>
      <NuxtLink to="/previa">Ver uma prévia antes</NuxtLink>
    </div>

    <section class="next-block" aria-labelledby="depois-do-cadastro">
      <h2 id="depois-do-cadastro" class="next-title">Depois do cadastro</h2>
      <ol class="next">
        <li>Abra o link que mandamos para o seu e-mail e crie a sua senha.</li>
        <li>Confira os dados da loja e cole um código no seu perfil da Steam. Isso prova que o inventário é seu, sem login.</li>
        <li>
          A loja entra no ar com 7 dias grátis.
          <template v-if="monthly">Depois, {{ formatPlanPrice(monthly) }} por mês pelo Pix, sem fidelidade.</template>
        </li>
      </ol>
    </section>
  </AccountPage>
</template>

<style scoped>
.next-block {
  margin-top: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--line);
}

.next-title {
  font-size: var(--step-1);
  font-weight: 620;
}

/* É uma sequência de verdade: os números ajudam. */
.next {
  display: grid;
  gap: 0.875rem;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
  counter-reset: passo;
}

.next li {
  display: grid;
  grid-template-columns: 2rem 1fr;
  color: var(--muted);
  counter-increment: passo;
}

.next li::before {
  content: counter(passo);
  color: var(--text);
  font-size: var(--step-2);
  font-stretch: var(--narrow);
  font-weight: 760;
  line-height: 1;
}
</style>
