<script setup>
// Painel mínimo do revendedor: situação da loja, verificação do inventário, atualizar inventário
// e sair. O painel completo (marca, preços, itens) é da fase 5.
const host = useSiteUrl().replace(/^https?:\/\//, '')
const { data, error, refresh } = await useFetch('/api/painel', { key: 'painel' })
const { data: config } = await usePublicConfig()

if (errorCode(error.value) === 'AUTH_REQUIRED') await navigateTo('/entrar')

const store = computed(() => data.value?.store ?? null)
const loadProblem = computed(() => (error.value ? accountMessage(error.value) : null))

// Hora atual, para o botão de atualizar liberar sozinho quando passar o intervalo.
const now = ref(Date.now())
let clock
onMounted(() => (clock = setInterval(() => (now.value = Date.now()), 15_000)))
onBeforeUnmount(() => clearInterval(clock))

const ownerLink = computed(() => {
  const owner = config.value?.ownerWhatsapp
  if (!owner) return null
  const text = `Olá! Quero pôr minha loja da Vitrine no ar: ${host}/${store.value?.slug}`
  return `https://wa.me/${owner}?text=${encodeURIComponent(text)}`
})

// ---- Ações. Cada uma devolve a loja atualizada.
const busy = ref(null)
const problem = ref(null)

async function act(name, url, body) {
  problem.value = null
  busy.value = name
  try {
    const result = await $fetch(url, { method: 'POST', body })
    if (result.store) data.value = { ...data.value, store: result.store, problem: null }
    return result
  } catch (error) {
    if (errorCode(error) === 'AUTH_REQUIRED') return navigateTo('/entrar')
    problem.value = { action: name, ...accountMessage(error) }
  } finally {
    busy.value = null
  }
}

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

// ---- Verificação
const { copied, copy } = useCopy()
const codeExpired = computed(() => store.value?.codeExpiresAt && Date.parse(store.value.codeExpiresAt) <= now.value)
const editProfile = computed(() => `https://steamcommunity.com/profiles/${store.value?.steamid}/edit/info`)

// ---- Inventário
const update = ref(null)
const canRefreshAt = computed(() => (store.value?.nextRefreshAt ? Date.parse(store.value.nextRefreshAt) : 0))
const tooSoon = computed(() => canRefreshAt.value > now.value)

async function refreshInventory() {
  update.value = null
  const result = await act('atualizar', '/api/painel/atualizar')
  if (result?.result) update.value = result.result
}

const updateText = computed(() => {
  const r = update.value
  if (!r) return ''
  if (!r.entraram && !r.sairam) return 'Pronto. Nada mudou desde a última leitura.'
  const part = (n, one, many) => (n === 1 ? `1 item ${one}` : `${n} itens ${many}`)
  return `Pronto. ${[r.entraram && part(r.entraram, 'entrou', 'entraram'), r.sairam && part(r.sairam, 'saiu', 'saíram')]
    .filter(Boolean)
    .join(' e ')}.`
})

// ---- Loja no ar
const storeUrl = computed(() => (store.value ? `${useSiteUrl()}/${store.value.slug}` : ''))

async function logout() {
  await $fetch('/api/conta/sair', { method: 'POST' }).catch(() => {})
  await navigateTo('/entrar')
}

const problemFor = (action) => (problem.value?.action === action ? problem.value : null)

useSeoMeta({ title: 'Painel | Vitrine', robots: 'noindex' })
</script>

<template>
  <main class="wrap painel">
    <header class="painel-top">
      <NuxtLink to="/" class="wordmark display">Vitrine</NuxtLink>
      <button v-if="data" class="btn" type="button" @click="logout">Sair</button>
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
        <img v-if="store.avatar" class="avatar" :src="store.avatar" alt="" width="48" height="48" />
        <div>
          <h1 class="display painel-title">{{ store.name || store.slug }}</h1>
          <p class="address">{{ host }}/{{ store.slug }}</p>
        </div>
      </div>

      <!-- Verificação: a loja só fica pública depois dela -->
      <section v-if="!store.verified" class="painel-block" aria-labelledby="verificar">
        <h2 id="verificar" class="block-title">Verifique o seu inventário</h2>
        <p class="muted">
          A loja só aparece para os clientes depois desta etapa. Ela prova que o inventário é seu, sem pedir
          login da Steam.
        </p>

        <ol class="steps">
          <li>
            <p>Copie o código.</p>
            <div class="code">
              <span class="code-tag display" :class="{ 'is-expired': codeExpired }">{{ store.code }}</span>
              <button class="btn" type="button" :disabled="codeExpired" @click="copy(store.code)">
                {{ copied ? 'Código copiado' : 'Copiar código' }}
              </button>
            </div>
            <p class="muted small">
              <template v-if="codeExpired">Este código venceu.</template>
              <template v-else>Vale até {{ formatDateTime(store.codeExpiresAt) }}.</template>
              <button class="link-button" type="button" :disabled="busy === 'codigo'" @click="act('codigo', '/api/painel/codigo')">
                Gerar outro código
              </button>
            </p>
          </li>
          <li>
            <p>Cole no resumo ou no nome do seu perfil da Steam e salve.</p>
            <a class="btn" :href="editProfile" target="_blank" rel="noopener">
              <AppIcon name="external" />
              Editar meu perfil na Steam
            </a>
          </li>
          <li>
            <p>Volte aqui e verifique.</p>
            <button
              class="btn btn--primary"
              type="button"
              :disabled="busy === 'verificar' || codeExpired"
              @click="act('verificar', '/api/painel/verificar')"
            >
              {{ busy === 'verificar' ? 'Lendo seu perfil…' : 'Verificar' }}
            </button>
          </li>
        </ol>

        <FormProblem v-if="problemFor('verificar') || problemFor('codigo')" :problem="problemFor('verificar') || problemFor('codigo')" />
        <p class="muted small">Depois da verificação, você pode apagar o código do perfil.</p>
      </section>

      <!-- No ar -->
      <section v-else-if="store.open" class="painel-block status status--open" aria-labelledby="situacao">
        <h2 id="situacao" class="block-title">Loja no ar</h2>
        <p class="muted">
          {{ store.trial ? 'Teste grátis' : 'Paga' }} até {{ formatDate(store.paidUntil) }}.
        </p>
        <div class="actions">
          <NuxtLink class="btn btn--primary" :to="`/${store.slug}`">Abrir a loja</NuxtLink>
          <button class="btn" type="button" @click="copy(storeUrl)">
            <AppIcon name="link" />
            {{ copied ? 'Link copiado' : 'Copiar link da loja' }}
          </button>
        </div>
      </section>

      <!-- Fora do ar -->
      <section v-else class="painel-block status status--closed" aria-labelledby="situacao">
        <h2 id="situacao" class="block-title">Loja fora do ar</h2>
        <p v-if="store.trialUsed" class="muted">
          O teste grátis já foi usado com este inventário, este e-mail ou este WhatsApp. Para pôr a loja no ar,
          fale com a gente.
        </p>
        <p v-else class="muted">
          {{ store.trial ? 'O teste grátis' : 'O plano' }} venceu em {{ formatDate(store.paidUntil) }}. Quem abre o
          link vê "loja indisponível". Para voltar ao ar, fale com a gente.
        </p>
        <a v-if="ownerLink" class="btn btn--primary" :href="ownerLink" target="_blank" rel="noopener">
          <AppIcon name="chat" />
          Chamar no WhatsApp
        </a>
      </section>

      <!-- Inventário -->
      <section class="painel-block" aria-labelledby="inventario">
        <h2 id="inventario" class="block-title">Inventário</h2>
        <p class="muted">
          <template v-if="store.readAt">
            {{ store.items === 1 ? '1 item' : `${store.items} itens` }} na loja. Lido em
            {{ formatDateTime(store.readAt) }}.
          </template>
          <template v-else>O inventário ainda não foi lido.</template>
          A loja não lê a Steam sozinha: quando vender ou comprar, atualize aqui.
        </p>
        <div class="actions">
          <button
            class="btn"
            type="button"
            :disabled="busy === 'atualizar' || tooSoon"
            @click="refreshInventory"
          >
            {{ busy === 'atualizar' ? 'Lendo o inventário…' : 'Atualizar inventário' }}
          </button>
        </div>
        <p v-if="tooSoon && busy !== 'atualizar'" class="muted small">
          Dá para atualizar de novo às {{ formatDateTime(canRefreshAt).split(' às ')[1] }}.
        </p>
        <p v-if="updateText" class="done" role="status">{{ updateText }}</p>
        <FormProblem v-if="problemFor('atualizar')" :problem="problemFor('atualizar')" />
      </section>

      <!-- Conta -->
      <section class="painel-block" aria-labelledby="conta">
        <h2 id="conta" class="block-title">Conta</h2>
        <p class="muted">{{ data.email }}</p>
        <p class="muted">Pedidos da loja vão para o WhatsApp {{ formatPhone(store.whatsapp) }}.</p>
      </section>
    </template>
  </main>
</template>

<style scoped>
.painel {
  display: grid;
  gap: 2rem;
  padding-top: 1.25rem;
  padding-bottom: 3rem;
}

/* Alinhado à esquerda, como as outras telas, com linhas curtas no computador. */
.painel > :not(.painel-top) {
  max-width: 44rem;
}

.painel-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.painel-body,
.painel-form {
  display: grid;
  gap: 1.125rem;
  justify-items: start;
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
  margin-top: 1rem;
}

.avatar {
  flex: none;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-s);
}

.painel-title {
  font-size: clamp(2.25rem, 9vw, 3.5rem);
  overflow-wrap: anywhere;
}

.address {
  margin-top: 0.375rem;
  color: var(--muted);
  overflow-wrap: anywhere;
}

.lead {
  color: var(--muted);
  font-size: var(--step-1);
  line-height: 1.45;
}

.painel-block {
  display: grid;
  gap: 0.875rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--line);
}

.block-title {
  font-size: var(--step-2);
  font-stretch: var(--semi);
  font-weight: 680;
  line-height: 1.15;
}

.muted {
  color: var(--muted);
}

.small {
  font-size: var(--step--1);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.done {
  font-weight: 560;
}

/* Situação: a borda da esquerda diz se a loja está no ar. */
.status {
  padding: 1.25rem 1rem;
  border-top: 0;
  border-left: 3px solid var(--accent-edge);
  border-radius: 0 var(--radius-m) var(--radius-m) 0;
  background: var(--surface);
}

.status--closed {
  border-left-color: var(--alert);
}

/* ---- Passos da verificação. É uma sequência de verdade: os números ajudam. */
.steps {
  display: grid;
  gap: 1.5rem;
  margin: 0.5rem 0 0;
  padding: 0;
  list-style: none;
  counter-reset: passo;
}

.steps > li {
  display: grid;
  grid-template-columns: 2.25rem 1fr;
  gap: 0.625rem 0;
  align-items: start;
  counter-increment: passo;
}

.steps > li::before {
  content: counter(passo);
  grid-row: span 3;
  font-size: var(--step-3);
  font-stretch: var(--narrow);
  font-weight: 760;
  line-height: 0.9;
}

.steps > li > * {
  grid-column: 2;
  justify-self: start;
}

/* O código parece uma etiqueta de nome do jogo: grande, condensado, fácil de conferir no perfil. */
.code {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.code-tag {
  padding: 0.5rem 0.875rem 0.375rem;
  border: 1px dashed var(--field-line);
  border-radius: var(--radius-s);
  background: var(--stage);
  font-size: clamp(2.25rem, 11vw, 3rem);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  user-select: all;
}

.code-tag.is-expired {
  color: var(--muted);
  text-decoration: line-through;
}

.link-button {
  min-height: 44px;
  margin-left: 0.5rem;
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
