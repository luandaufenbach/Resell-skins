<script setup>
// Formulário da prévia: link da Steam e WhatsApp. Gera /previa/<id>, que vale 24h.
const steamUrl = ref('')
const phone = ref('')
const pending = ref(false)
const problem = ref(null)
// Campo com problema ('url' ou 'phone'), marcado para leitor de tela e com a borda de alerta.
const problemField = ref(null)

const URL_ERRORS = ['INVALID_INPUT', 'NOT_FOUND', 'PRIVATE']

function fail(error) {
  const code = errorCode(error)
  problem.value = errorMessage(error)
  problemField.value = code === 'INVALID_PHONE' ? 'phone' : URL_ERRORS.includes(code) ? 'url' : null
}

async function generate() {
  problem.value = null
  problemField.value = null

  // Só o número, sem DDD, viraria um WhatsApp de outra pessoa.
  const digits = phone.value.replace(/\D/g, '')
  if (digits && digits.length < 10) {
    fail({ data: { code: 'INVALID_PHONE' } })
    return
  }

  pending.value = true
  try {
    const { id } = await $fetch('/api/previa', {
      method: 'POST',
      body: { url: steamUrl.value, whatsapp: normalizePhone(phone.value) },
    })
    await navigateTo(`/previa/${id}`)
  } catch (error) {
    fail(error)
  } finally {
    pending.value = false
  }
}

useSeoMeta({
  title: 'Veja como fica a sua loja | Vitrine',
  description: 'Cole o link do seu perfil da Steam e veja a sua loja de skins na hora, sem criar conta.',
})
</script>

<template>
  <main class="wrap previa">
    <NuxtLink to="/" class="wordmark display">Vitrine</NuxtLink>

    <div class="previa-body">
      <h1 class="display previa-title">Veja como fica a sua loja</h1>
      <p class="lead">
        Cole o link do seu perfil da Steam. Em alguns segundos aparecem as suas skins com foto, float,
        stickers e preço, num link que vale 24 horas. Não precisa criar conta.
      </p>

      <TrustNote />

      <form class="generate" @submit.prevent="generate">
        <label class="field">
          <span class="field-label">Link do perfil Steam</span>
          <input
            v-model="steamUrl"
            class="input"
            required
            inputmode="url"
            autocomplete="url"
            spellcheck="false"
            placeholder="steamcommunity.com/id/seunome"
            :aria-invalid="problemField === 'url' || undefined"
            :aria-describedby="problemField === 'url' ? 'erro-previa' : undefined"
          />
          <span class="field-hint">Também aceita o seu link de troca.</span>
        </label>

        <label class="field">
          <span class="field-label">WhatsApp para pedidos <span class="field-optional">(opcional)</span></span>
          <input
            v-model="phone"
            class="input"
            type="tel"
            inputmode="tel"
            autocomplete="tel"
            placeholder="(48) 99999-9999"
            :aria-invalid="problemField === 'phone' || undefined"
            :aria-describedby="problemField === 'phone' ? 'erro-previa' : undefined"
          />
          <span class="field-hint">
            Na prévia, o botão de pedir aparece só para você. O número é apagado quando a prévia expira.
          </span>
        </label>

        <div v-if="problem" id="erro-previa" class="form-problem" role="alert">
          <p class="form-problem-title">{{ problem.title }}</p>
          <p>{{ problem.body }}</p>
        </div>

        <button class="btn btn--primary btn--large" type="submit" :disabled="pending">
          {{ pending ? 'Lendo inventário…' : 'Ver minha loja' }}
        </button>
      </form>

      <p class="privacy">
        O inventário precisa estar público. Na Steam, abra Editar perfil, depois Configurações de
        privacidade, e deixe Inventário como Público.
      </p>
    </div>
  </main>
</template>

<style scoped>
.previa {
  padding-top: 1.25rem;
  padding-bottom: 3rem;
}

.previa-body {
  display: grid;
  gap: 1.25rem;
  max-width: 36rem;
  margin-top: 2.5rem;
}

@media (min-width: 48rem) {
  .previa-body {
    margin-top: 4rem;
  }
}

.previa-title {
  font-size: clamp(2.75rem, 10vw, 4.75rem);
}

.lead {
  color: var(--muted);
  font-size: var(--step-1);
  line-height: 1.45;
}

.generate {
  display: grid;
  gap: 1.125rem;
  margin-top: 0.5rem;
}

.generate .btn {
  justify-self: start;
  margin-top: 0.25rem;
}

.form-problem {
  padding: 0.875rem 1rem;
  border-left: 3px solid var(--alert);
  background: var(--surface);
  font-size: var(--step--1);
}

.form-problem-title {
  margin-bottom: 0.25rem;
  color: var(--alert);
  font-size: var(--step-0);
  font-weight: 600;
}

.privacy {
  color: var(--muted);
  font-size: var(--step--1);
}
</style>
