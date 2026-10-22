<script setup>
// Painel do revendedor, em abas (?aba=): Loja (situação, verificação, inventário e conta), Marca,
// Itens e Preços. Antes de existir a loja, confere os dados do cadastro e cria. O aviso de
// vencimento aparece em todas as abas a partir de 5 dias antes.
const route = useRoute()
const host = useSiteUrl().replace(/^https?:\/\//, '')
const { data, error, refresh } = await useFetch('/api/painel', { key: 'painel' })

if (errorCode(error.value) === 'AUTH_REQUIRED') await navigateTo('/entrar')

const store = computed(() => data.value?.store ?? null)
const loadProblem = computed(() => (error.value ? accountMessage(error.value) : null))

function setStore(next) {
  data.value = { ...data.value, store: next }
}

const TABS = [
  { id: 'loja', label: 'Loja' },
  { id: 'marca', label: 'Marca' },
  { id: 'itens', label: 'Itens' },
  { id: 'precos', label: 'Preços' },
]
const tab = computed(() => (TABS.some((t) => t.id === route.query.aba) ? route.query.aba : 'loja'))
const tabLink = (id) => ({ query: id === 'loja' ? {} : { aba: id } })

// O aviso de vencimento substitui o bloco "Loja no ar" da aba Loja (os dois diriam a mesma data).
const renewalShown = computed(() => renewalState(store.value).show)

const displayName = computed(() => store.value?.brand?.name || store.value?.name || store.value?.slug)
const headImage = computed(() => store.value?.brand?.logo ?? store.value?.avatar ?? null)

// ---- Criar a loja: os dados do cadastro vêm preenchidos para conferir (o Supabase guarda os do
// primeiro cadastro feito com o e-mail, que pode não ter sido de quem confirmou).
const draft = data.value?.draft ?? {}
const storeForm = reactive({ steam: draft.steam ?? '', whatsapp: formatPhone(draft.whatsapp), slug: draft.slug ?? '' })
const { problem: createProblem, formEl: createFormEl, fail: createFail } = useFormProblem()
const creating = ref(false)

async function createStore() {
  createProblem.value = null
  const whatsapp = normalizePhone(storeForm.whatsapp)
  const code = whatsapp.length < 12 ? 'INVALID_PHONE' : slugProblem(storeForm.slug)
  if (code) return createFail({ data: { code } })

  creating.value = true
  try {
    const result = await $fetch('/api/painel/loja', { method: 'POST', body: { ...storeForm, whatsapp } })
    data.value = { ...data.value, store: result.store, draft: null }
  } catch (error) {
    if (errorCode(error) === 'AUTH_REQUIRED') return navigateTo('/entrar')
    createFail(error)
  } finally {
    creating.value = false
  }
}

async function logout() {
  await $fetch('/api/conta/sair', { method: 'POST' }).catch(() => {})
  await navigateTo('/entrar')
}

useSeoMeta({ title: 'Painel | Revenda', robots: 'noindex' })
</script>

<template>
  <main class="wrap painel">
    <header class="painel-top">
      <NuxtLink to="/" class="wordmark display">Revenda</NuxtLink>
      <div class="painel-top-actions">
        <NuxtLink v-if="data?.admin" class="btn" to="/admin">Admin</NuxtLink>
        <button v-if="data" class="btn" type="button" @click="logout">Sair</button>
      </div>
    </header>

    <!-- Banco fora do ar -->
    <section v-if="loadProblem && errorCode(error) !== 'AUTH_REQUIRED'" class="painel-body">
      <h1 class="display painel-title">Painel</h1>
      <FormProblem :problem="loadProblem" />
      <button class="btn btn--primary" type="button" @click="refresh()">Tentar de novo</button>
    </section>

    <!-- A loja ainda não existe: confere os dados do cadastro e cria -->
    <section v-else-if="data && !store" class="painel-body">
      <h1 class="display painel-title">Confira os dados da loja</h1>
      <p class="lead">Estes são os dados do cadastro. Corrija o que estiver errado antes de criar a loja.</p>
      <TrustNote />
      <form ref="createFormEl" class="painel-form" novalidate @submit.prevent="createStore">
        <StoreFields :form="storeForm" :problem="createProblem" />
        <FormProblem v-if="createProblem && !createProblem.field" :problem="createProblem" />
        <button class="btn btn--primary btn--large" type="submit" :disabled="creating">
          {{ creating ? 'Lendo o inventário…' : 'Criar a loja' }}
        </button>
      </form>
    </section>

    <template v-else-if="store">
      <div class="painel-head">
        <img v-if="headImage" class="avatar" :src="headImage" alt="" width="48" height="48" />
        <div class="painel-id">
          <h1 class="display painel-title">{{ displayName }}</h1>
          <p class="address">
            {{ host }}/{{ store.slug }}
            <NuxtLink v-if="store.open" class="address-link" :to="`/${store.slug}`">Abrir a loja</NuxtLink>
          </p>
        </div>
      </div>

      <PanelRenewal :store="store" :pix="data.pix" :host="host" :compact="tab !== 'loja'" />

      <nav class="tabs" aria-label="Partes do painel">
        <NuxtLink
          v-for="t in TABS"
          :key="t.id"
          class="tab"
          :to="tabLink(t.id)"
          :aria-current="tab === t.id ? 'page' : undefined"
          replace
        >
          {{ t.label }}
        </NuxtLink>
      </nav>

      <PanelStatus v-if="tab === 'loja'" :store="store" :email="data.email" :renewal="renewalShown" @update="setStore" />
      <PanelBrand v-else-if="tab === 'marca'" :store="store" :host="host" @update="setStore" />
      <PanelItems v-else-if="tab === 'itens'" :store="store" />
      <PanelPricing v-else :store="store" @update="setStore" />
    </template>
  </main>
</template>

<style scoped>
.painel {
  display: grid;
  gap: 1.75rem;
  padding-top: 1.25rem;
  padding-bottom: 3rem;
}

.painel-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.painel-top-actions {
  display: flex;
  gap: 0.5rem;
}

.painel-body,
.painel-form {
  display: grid;
  gap: 1.125rem;
  justify-items: start;
  max-width: 44rem;
}

.painel-form {
  justify-self: stretch;
  justify-items: stretch;
  max-width: 32rem;
}

.painel-form .btn {
  justify-self: start;
}

.painel-head {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
}

.painel-id {
  min-width: 0;
}

.avatar {
  flex: none;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-s);
  background: var(--surface);
  object-fit: contain;
}

.painel-title {
  font-size: clamp(2.25rem, 9vw, 3.5rem);
  overflow-wrap: anywhere;
}

.address {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 1rem;
  margin-top: 0.375rem;
  color: var(--muted);
  overflow-wrap: anywhere;
}

.address-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: var(--text);
  text-underline-offset: 3px;
}

.lead {
  color: var(--muted);
  font-size: var(--step-1);
  line-height: 1.45;
}


/* Abas como as do inventário do jogo: texto condensado, a ativa sublinhada na cor de destaque. */
.tabs {
  display: flex;
  gap: 0.25rem;
  margin-inline: calc(var(--gutter) * -1);
  padding-inline: var(--gutter);
  overflow-x: auto;
  border-bottom: 1px solid var(--line);
  scrollbar-width: none;
}

.tab {
  display: inline-flex;
  align-items: center;
  min-height: 48px;
  padding: 0 0.875rem;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  color: var(--muted);
  font-size: var(--step-1);
  font-stretch: var(--semi);
  font-weight: 640;
  text-decoration: none;
  white-space: nowrap;
}

.tab:first-child {
  padding-left: 0;
}

.tab:hover {
  color: var(--text);
}

/* A faixa das abas rola: o anel de foco fica por dentro para não ser cortado. */
.tab:focus-visible {
  outline-offset: -2px;
}

.tab[aria-current='page'] {
  border-bottom-color: var(--accent-edge);
  color: var(--text);
}

@media (min-width: 48rem) {
  .tabs {
    margin-inline: 0;
    padding-inline: 0;
  }
}
</style>
