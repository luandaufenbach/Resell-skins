<script setup>
// Aviso de vencimento: aparece a partir de 5 dias antes (no teste grátis e no plano pago) e
// continua quando a loja sai do ar. Na aba Loja, completo: valor do plano da loja, chave Pix do dono
// para copiar e o WhatsApp dele para mandar o comprovante. Nas outras abas, uma linha que leva até lá.
// Loja bloqueada pelo admin: diz que foi suspensa e leva ao WhatsApp do dono, sem pedir o Pix.
const props = defineProps({
  store: { type: Object, required: true },
  pix: { type: String, default: null },
  host: { type: String, required: true },
  compact: { type: Boolean, default: false },
})

const { data: config } = await usePublicConfig()
const { copied, copy } = useCopy()

const now = ref(Date.now())
let clock
onMounted(() => (clock = setInterval(() => (now.value = Date.now()), 60_000)))
onBeforeUnmount(() => clearInterval(clock))

const state = computed(() => renewalState(props.store, now.value))
const ends = computed(() => state.value.ends)
const daysLeft = computed(() => state.value.daysLeft)
const closed = computed(() => state.value.closed)
const show = computed(() => state.value.show)
const blocked = computed(() => Boolean(props.store.blocked))

const PLAN_LABEL = { mensal: 'plano mensal', trimestral: 'plano trimestral' }
const value = computed(() => props.store.plan?.value ?? null)
const planText = computed(() =>
  value.value ? `${formatPlanPrice(value.value)} (${PLAN_LABEL[props.store.plan.id] ?? 'plano'})` : null,
)

const title = computed(() => {
  if (blocked.value) return 'Sua loja foi suspensa'
  if (closed.value) return 'Sua loja está fora do ar'
  const what = props.store.trial ? 'O teste grátis termina' : 'O plano vence'
  if (daysLeft.value <= 0) return `${what} hoje`
  if (daysLeft.value === 1) return `${what} amanhã`
  return `${what} em ${daysLeft.value} dias`
})

const lead = computed(() => {
  const when = ends.value ? formatDate(ends.value) : ''
  if (blocked.value) return 'Quem abre o link vê "loja indisponível". Fale com a gente no WhatsApp para saber o motivo e voltar ao ar.'
  if (closed.value) {
    if (props.store.trialUsed) return 'O teste grátis já foi usado com este inventário, este e-mail ou este WhatsApp. Quem abre o link vê "loja indisponível".'
    return `Venceu em ${when}. Quem abre o link vê "loja indisponível" até o pagamento.`
  }
  return `A loja fica no ar até ${when}. Depois disso, quem abre o link vê "loja indisponível".`
})

const ownerLink = computed(() => {
  const owner = config.value?.ownerWhatsapp
  if (!owner) return null
  const paid = value.value ? ` de ${formatPlanPrice(value.value)}` : ''
  const text = `Olá! Fiz o Pix${paid} da minha loja na Revenda: ${props.host}/${props.store.slug}. Segue o comprovante.`
  return `https://wa.me/${owner}?text=${encodeURIComponent(text)}`
})

const askLink = computed(() => {
  const owner = config.value?.ownerWhatsapp
  if (!owner) return null
  const text = blocked.value
    ? `Olá! A minha loja na Revenda foi suspensa: ${props.host}/${props.store.slug}`
    : `Olá! Quero pagar a minha loja na Revenda: ${props.host}/${props.store.slug}`
  return `https://wa.me/${owner}?text=${encodeURIComponent(text)}`
})
</script>

<template>
  <p v-if="show && compact" class="renewal-line" :class="{ 'is-closed': closed }">
    <strong>{{ title }}.</strong>
    <NuxtLink to="/painel" class="renewal-link">{{ blocked ? 'Ver o que fazer' : 'Ver como pagar' }}</NuxtLink>
  </p>
  <section v-else-if="show" class="renewal" :class="{ 'is-closed': closed }" aria-labelledby="vencimento">
    <h2 id="vencimento" class="renewal-title">{{ title }}</h2>
    <p class="muted">{{ lead }}</p>

    <template v-if="blocked">
      <a v-if="askLink" class="btn btn--primary" :href="askLink" target="_blank" rel="noopener">
        <AppIcon name="chat" />
        Chamar no WhatsApp
      </a>
    </template>

    <template v-else-if="pix">
      <p>
        Para {{ closed ? 'voltar ao ar' : 'continuar no ar' }}, faça um Pix<template v-if="planText">
          de <strong>{{ planText }}</strong></template> para a chave abaixo e mande o comprovante no WhatsApp.
      </p>
      <div class="pix">
        <span class="pix-label">Chave Pix</span>
        <span class="pix-key">{{ pix }}</span>
        <button class="btn" type="button" @click="copy(pix)">{{ copied ? 'Chave copiada' : 'Copiar chave' }}</button>
      </div>
      <a v-if="ownerLink" class="btn btn--primary" :href="ownerLink" target="_blank" rel="noopener">
        <AppIcon name="chat" />
        Mandar o comprovante
      </a>
    </template>

    <template v-else>
      <p>
        Para {{ closed ? 'voltar ao ar' : 'continuar no ar' }}, fale com a gente no WhatsApp.<template v-if="planText">
          Valor: <strong>{{ planText }}</strong>.</template>
      </p>
      <a v-if="askLink" class="btn btn--primary" :href="askLink" target="_blank" rel="noopener">
        <AppIcon name="chat" />
        Chamar no WhatsApp
      </a>
    </template>
  </section>
</template>

<style scoped>
.renewal {
  display: grid;
  gap: 0.75rem;
  justify-items: start;
  padding: 1.25rem 1rem;
  border-left: 3px solid var(--accent-edge);
  border-radius: 0 var(--radius-m) var(--radius-m) 0;
  background: var(--surface);
}

/* Computador: o texto à esquerda e a chave Pix com o botão à direita. */
@media (min-width: 64rem) {
  .renewal:has(.pix) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 26rem);
    column-gap: 2.5rem;
  }

  .renewal:has(.pix) > :not(.pix, .btn) {
    grid-column: 1;
  }

  .renewal:has(.pix) > .pix {
    grid-column: 2;
    grid-row: 1 / span 2;
    align-self: start;
  }

  .renewal:has(.pix) > .btn {
    grid-column: 2;
    grid-row: 3;
  }
}

.renewal.is-closed,
.renewal-line.is-closed {
  border-left-color: var(--alert);
}

.renewal-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 1rem;
  padding: 0.25rem 1rem;
  border-left: 3px solid var(--accent-edge);
  background: var(--surface);
}

.renewal-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  text-underline-offset: 3px;
}

.renewal-title {
  font-size: var(--step-2);
  font-stretch: var(--semi);
  font-weight: 680;
  line-height: 1.15;
}

.muted {
  color: var(--muted);
}

strong {
  font-weight: 650;
  white-space: nowrap;
}

/* A chave em destaque, fácil de conferir antes de colar no banco. */
.pix {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.75rem;
  width: 100%;
  padding: 0.75rem 0.875rem;
  border: 1px dashed var(--field-line);
  border-radius: var(--radius-s);
  background: var(--stage);
}

.pix-label {
  width: 100%;
  color: var(--muted);
  font-size: var(--step--1);
}

.pix-key {
  flex: 1 1 12rem;
  min-width: 0;
  font-size: var(--step-1);
  font-stretch: var(--semi);
  font-weight: 640;
  overflow-wrap: anywhere;
  user-select: all;
}
</style>
