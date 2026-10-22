<script setup>
// Administração, em abas (?aba=): Lojas (situação, vencimento, plano, uso e as ações de cada loja)
// e Pagamentos (por mês, com o total). Só abre para os e-mails de NUXT_ADMIN_EMAILS: o servidor
// responde 404 a qualquer outra conta, na página e na API (server/middleware/admin.js).
const route = useRoute()
const host = useSiteUrl().replace(/^https?:\/\//, '')

const { data, error, refresh, status } = await useFetch('/api/admin/lojas', { key: 'admin-lojas' })
// Navegação pelo próprio site (sem passar pelo servidor da página): a API decide.
if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Página não encontrada', fatal: true })
}

const month = ref(currentMonth())
const {
  data: payments,
  refresh: refreshPayments,
  status: paymentsStatus,
} = await useFetch('/api/admin/pagamentos', { key: 'admin-pagamentos', query: { mes: month } })

const stores = computed(() => data.value?.stores ?? [])
const config = computed(() => data.value?.config ?? null)
const loadProblem = computed(() => (error.value ? adminMessage(error.value) : null))

const TABS = [
  { id: 'lojas', label: 'Lojas' },
  { id: 'pagamentos', label: 'Pagamentos' },
]
const tab = computed(() => (route.query.aba === 'pagamentos' ? 'pagamentos' : 'lojas'))
const tabLink = (id) => ({ query: id === 'lojas' ? {} : { aba: id } })

// O resumo do topo é sempre do mês atual, mesmo quando a aba Pagamentos mostra outro mês.
const thisMonth = currentMonth()
const thisMonthTotal = ref(null)
watchEffect(() => {
  if (payments.value?.month === thisMonth) thisMonthTotal.value = payments.value.total
})
const openCount = computed(() => stores.value.filter((s) => s.open).length)
const foundersUsed = computed(() => stores.value.filter((s) => s.founder).length)

// ---- Loja aberta no detalhe
const selectedId = ref(null)
const selected = computed(() => stores.value.find((s) => s.id === selectedId.value) ?? null)

function updateStore(next) {
  if (!data.value) return
  data.value = { ...data.value, stores: data.value.stores.map((s) => (s.id === next.id ? next : s)) }
}

function onPaid(next) {
  updateStore(next)
  refreshPayments()
}

useSeoMeta({ title: 'Admin | Revenda', robots: 'noindex' })
</script>

<template>
  <main class="wrap admin">
    <header class="admin-top">
      <NuxtLink to="/" class="wordmark display">Revenda</NuxtLink>
      <NuxtLink class="btn" to="/painel">Painel</NuxtLink>
    </header>

    <div class="admin-head">
      <h1 class="display admin-title">Admin</h1>
      <p v-if="data" class="admin-summary">
        {{ stores.length === 1 ? '1 loja' : `${stores.length} lojas` }}, {{ openCount }} no ar.
        <template v-if="thisMonthTotal != null">
          Recebido em {{ monthLabel(thisMonth).split(' ')[0] }}: <strong>{{ formatBRL(thisMonthTotal) }}</strong>.
        </template>
      </p>
    </div>

    <!-- Banco fora do ar -->
    <section v-if="loadProblem" class="admin-body">
      <FormProblem :problem="loadProblem" />
      <button class="btn btn--primary" type="button" :disabled="status === 'pending'" @click="refresh()">
        Tentar de novo
      </button>
    </section>

    <template v-else-if="data">
      <nav class="tabs" aria-label="Partes do admin">
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

      <AdminStores v-if="tab === 'lojas'" :stores="stores" :config="config" :host="host" @open="selectedId = $event" />
      <AdminPayments
        v-else
        v-model:month="month"
        :data="payments"
        :pending="paymentsStatus === 'pending'"
        @open="selectedId = $event"
        @retry="refreshPayments()"
      />
    </template>

    <AdminStoreDetail
      :store="selected"
      :config="config"
      :host="host"
      :founders-used="foundersUsed"
      @close="selectedId = null"
      @update="updateStore"
      @paid="onPaid"
    />
  </main>
</template>

<style scoped>
.admin {
  display: grid;
  gap: 1.5rem;
  padding-top: 1.25rem;
  padding-bottom: 3rem;
}

.admin-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.admin-head {
  display: grid;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.admin-title {
  font-size: clamp(2.25rem, 9vw, 3.5rem);
}

.admin-summary {
  color: var(--muted);
  font-size: var(--step-1);
}

.admin-summary strong {
  color: var(--text);
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.admin-body {
  display: grid;
  gap: 1rem;
  justify-items: start;
  max-width: 44rem;
}

/* Abas iguais às do painel do revendedor. */
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
