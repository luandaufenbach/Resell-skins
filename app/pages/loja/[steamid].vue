<script setup>
const route = useRoute()
const router = useRouter()
const steamid = computed(() => String(route.params.steamid))

const { data, error, refresh, status } = await useFetch(() => `/api/inventory/${steamid.value}`)

const items = computed(() => data.value?.items ?? [])
const profile = computed(() => data.value?.profile ?? null)
const storeName = computed(() => profile.value?.name ?? 'Catálogo de skins')
const whatsapp = computed(() => normalizePhone(route.query.w))
const problem = computed(() => (error.value ? steamErrorMessage(error.value) : null))

// ---- Resumo do inventário
const totals = computed(() => {
  let units = 0
  let tradable = 0
  for (const item of items.value) {
    units += item.quantity
    if (item.tradable) tradable += item.quantity
  }
  return { units, tradable }
})

const summary = computed(() => {
  const { units, tradable } = totals.value
  if (!units) return ''
  const itens = units === 1 ? '1 item' : `${units} itens`
  if (tradable === units) return `${itens} no inventário, todos disponíveis para troca.`
  return `${itens} no inventário, ${tradable} disponíveis para troca agora.`
})

// ---- Filtros (a categoria fica na URL para o revendedor poder compartilhar "só facas")
const counts = computed(() => {
  const map = { tudo: items.value.length }
  for (const item of items.value) map[item.category] = (map[item.category] ?? 0) + 1
  return map
})
const chips = computed(() =>
  [{ id: 'tudo', label: 'Tudo' }, ...CATEGORIES].filter((c) => counts.value[c.id]),
)

const category = computed({
  get: () => {
    const c = String(route.query.c ?? 'tudo')
    return counts.value[c] ? c : 'tudo'
  },
  set: (c) => router.replace({ query: { ...route.query, c: c === 'tudo' ? undefined : c } }),
})

const search = ref('')
const sort = ref('raridade')
const index = computed(() => new Map(items.value.map((item) => [item.id, searchText(item)])))

const filtered = computed(() => {
  const term = normalizeText(search.value.trim())
  let list = items.value.filter(
    (item) =>
      (category.value === 'tudo' || item.category === category.value) &&
      (!term || index.value.get(item.id).includes(term)),
  )

  if (sort.value === 'desgaste') {
    const wearRank = (item) =>
      item.float ?? (item.wear ? WEAR_SCALE.findIndex((w) => w.id === item.wear) / 5 + 0.001 : 2)
    list = [...list].sort((a, b) => wearRank(a) - wearRank(b))
  } else if (sort.value === 'nome') {
    list = [...list].sort((a, b) => `${a.weapon} ${a.skin}`.localeCompare(`${b.weapon} ${b.skin}`))
  }
  return list
})

// Mostra aos poucos para não montar milhares de cards de uma vez.
const PAGE_SIZE = 60
const limit = ref(PAGE_SIZE)
const visible = computed(() => filtered.value.slice(0, limit.value))
watch([category, search, sort], () => (limit.value = PAGE_SIZE))

function clearFilters() {
  search.value = ''
  category.value = 'tudo'
}

// ---- Item aberto (?i=assetid), assim o link de uma skin específica pode ser compartilhado
const selected = computed(() => items.value.find((item) => item.id === route.query.i) ?? null)
let openedHere = false

function openItem(item) {
  openedHere = true
  router.push({ query: { ...route.query, i: item.id } })
}

function closeItem() {
  if (!route.query.i) return
  if (openedHere) {
    openedHere = false
    router.back()
  } else {
    router.replace({ query: { ...route.query, i: undefined } })
  }
}

// ---- Link da loja e horário da leitura
const { copied, copy } = useCopy()
function copyStoreLink() {
  const url = new URL(window.location.href)
  url.searchParams.delete('i')
  copy(url.toString())
}

const readAt = computed(() =>
  data.value?.fetchedAt
    ? new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      }).format(data.value.fetchedAt)
    : '',
)

// ---- Prévia do link no WhatsApp
const shareImage = computed(() => {
  const item = selected.value ?? items.value.find((i) => i.image)
  return item ? steamImage(item.image, '512fx384f') : undefined
})

useSeoMeta({
  title: () =>
    selected.value
      ? `${selected.value.marketName} | ${storeName.value}`
      : data.value
        ? `Skins de ${storeName.value}`
        : 'Catálogo de skins',
  description: () => summary.value,
  ogTitle: () => (selected.value ? selected.value.marketName : `Skins de ${storeName.value}`),
  ogDescription: () => summary.value,
  ogImage: shareImage,
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <div class="store">
    <!-- Erro ao ler o inventário -->
    <main v-if="problem" class="wrap problem">
      <NuxtLink to="/" class="back">Voltar</NuxtLink>
      <h1 class="display problem-title">{{ problem.title }}</h1>
      <p class="problem-body">{{ problem.body }}</p>
      <div class="problem-actions">
        <button class="btn btn--primary" type="button" :disabled="status === 'pending'" @click="refresh()">
          {{ status === 'pending' ? 'Consultando…' : 'Tentar de novo' }}
        </button>
        <NuxtLink to="/" class="btn">Usar outro link</NuxtLink>
      </div>
    </main>

    <template v-else-if="data">
      <header class="wrap store-head">
        <div class="owner">
          <img v-if="profile?.avatar" class="avatar" :src="profile.avatar" alt="" width="40" height="40" />
          <span v-else class="avatar avatar--blank" aria-hidden="true">{{ storeName.charAt(0) }}</span>
          <a v-if="profile?.url" :href="profile.url" target="_blank" rel="noopener" class="owner-link">
            Perfil na Steam
          </a>
          <span v-if="data.demo" class="owner-note">Catálogo de exemplo com dados fictícios</span>
        </div>

        <h1 class="display store-name">{{ storeName }}</h1>
        <p class="store-summary">{{ summary }}</p>

        <div class="store-actions">
          <a
            v-if="whatsapp"
            class="btn btn--primary"
            :href="whatsappLink(whatsapp)"
            target="_blank"
            rel="noopener"
          >
            <AppIcon name="chat" />
            Chamar no WhatsApp
          </a>
          <button class="btn" type="button" @click="copyStoreLink">
            <AppIcon name="link" />
            {{ copied ? 'Link copiado' : 'Copiar link da loja' }}
          </button>
        </div>
      </header>

      <div v-if="items.length" class="toolbar">
        <div class="wrap toolbar-inner">
          <label class="search">
            <AppIcon name="search" />
            <span class="visually-hidden">Buscar</span>
            <input v-model="search" type="search" placeholder="Buscar skin ou sticker" enterkeyhint="search" />
          </label>

          <label class="sort">
            <span class="visually-hidden">Ordenar por</span>
            <select v-model="sort">
              <option value="raridade">Raridade</option>
              <option value="desgaste">Menor float</option>
              <option value="nome">Nome</option>
            </select>
          </label>

          <nav class="chips" aria-label="Categorias">
            <button
              v-for="chip in chips"
              :key="chip.id"
              type="button"
              class="chip"
              :aria-pressed="category === chip.id"
              @click="category = chip.id"
            >
              {{ chip.label }}
              <span class="chip-count">{{ counts[chip.id] }}</span>
            </button>
          </nav>
        </div>
      </div>

      <main class="wrap catalog">
        <h2 class="visually-hidden">Itens</h2>

        <div v-if="!items.length" class="empty">
          <p class="empty-title">Nenhum item de CS2 neste inventário</p>
          <p>Quando houver skins no inventário, elas aparecem aqui.</p>
        </div>

        <div v-else-if="!filtered.length" class="empty">
          <p class="empty-title">
            Nada encontrado{{ search ? ` para “${search}”` : '' }}
          </p>
          <button class="btn" type="button" @click="clearFilters">Limpar busca e filtros</button>
        </div>

        <ul v-else class="grid">
          <li v-for="item in visible" :key="item.id">
            <SkinCard :item="item" @open="openItem" />
          </li>
        </ul>

        <div v-if="filtered.length > visible.length" class="more">
          <button class="btn" type="button" @click="limit += PAGE_SIZE">
            Mostrar mais {{ Math.min(PAGE_SIZE, filtered.length - visible.length) }}
          </button>
        </div>
      </main>

      <footer class="wrap store-foot">
        <p>Inventário lido às {{ readAt }}. Itens vendidos podem levar alguns minutos para sumir daqui.</p>
        <NuxtLink to="/">Crie um catálogo do seu inventário</NuxtLink>
      </footer>

      <SkinDetail :item="selected" :whatsapp="whatsapp" @close="closeItem" />
    </template>
  </div>
</template>

<style scoped>
.store {
  min-height: 100dvh;
}

/* ---- Cabeçalho */
.store-head {
  display: grid;
  gap: 0.875rem;
  padding-top: 1.25rem;
  padding-bottom: 1.5rem;
}

.owner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  color: var(--muted);
  font-size: var(--step--1);
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-s);
  object-fit: cover;
}

.avatar--blank {
  display: grid;
  place-items: center;
  background: var(--surface-2);
  color: var(--text);
  font-size: var(--step-1);
  font-stretch: var(--narrow);
  font-weight: 700;
}

.owner-link {
  text-underline-offset: 3px;
}

.store-name {
  font-size: clamp(3rem, 13vw, 7.5rem);
  overflow-wrap: anywhere;
}

.store-summary {
  color: var(--muted);
}

.store-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

@media (min-width: 48rem) {
  .store-head {
    grid-template-columns: 1fr auto;
    column-gap: 2rem;
    padding-top: 2rem;
    padding-bottom: 2rem;
  }

  .owner,
  .store-name,
  .store-summary {
    grid-column: 1 / -1;
  }

  .store-actions {
    grid-column: 2;
    grid-row: 3;
    align-self: end;
    margin-top: 0;
  }

  .store-summary {
    grid-column: 1;
    grid-row: 3;
    align-self: end;
  }
}

/* ---- Barra de filtros (fica presa no topo ao rolar) */
.toolbar {
  position: sticky;
  top: 0;
  z-index: 5;
  border-block: 1px solid var(--line);
  background: color-mix(in srgb, var(--bg) 94%, transparent);
  backdrop-filter: blur(8px);
}

.toolbar-inner {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.625rem;
  padding-block: 0.75rem;
}

.search {
  position: relative;
  display: flex;
  align-items: center;
}

.search svg {
  position: absolute;
  left: 0.75rem;
  width: 18px;
  height: 18px;
  color: var(--muted);
  pointer-events: none;
}

.search input,
.sort select {
  width: 100%;
  min-height: 42px;
  border: 1px solid var(--line);
  border-radius: var(--radius-m);
  background: var(--stage);
}

.search input {
  padding: 0 0.75rem 0 2.5rem;
}

.search input::placeholder {
  color: #6f7b8e;
}

.sort select {
  padding: 0 0.75rem;
}

.chips {
  grid-column: 1 / -1;
  display: flex;
  gap: 0.375rem;
  margin-inline: calc(var(--gutter) * -1);
  padding-inline: var(--gutter);
  overflow-x: auto;
  scrollbar-width: none;
}

.chips::-webkit-scrollbar {
  display: none;
}

.chip {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 0.375rem;
  min-height: 36px;
  padding: 0 0.75rem;
  border: 1px solid var(--line);
  border-radius: var(--radius-s);
  background: transparent;
  color: var(--text);
  font-stretch: var(--semi);
  font-weight: 560;
  cursor: pointer;
}

.chip:hover {
  background: var(--surface);
}

.chip[aria-pressed='true'] {
  border-color: var(--chalk);
  background: var(--chalk);
  color: var(--chalk-ink);
}

.chip-count {
  color: var(--muted);
  font-size: var(--step--1);
  font-variant-numeric: tabular-nums;
}

.chip[aria-pressed='true'] .chip-count {
  color: #5d6878;
}

/* No computador: categorias à esquerda, busca e ordem à direita, tudo numa linha. */
@media (min-width: 48rem) {
  .toolbar-inner {
    grid-template-columns: minmax(0, 1fr) minmax(14rem, 20rem) auto;
    align-items: center;
    gap: 1rem;
  }

  .chips {
    grid-column: 1;
    grid-row: 1;
    margin: 0;
    padding: 0;
  }

  .search {
    grid-column: 2;
    grid-row: 1;
  }

  .sort {
    grid-column: 3;
    grid-row: 1;
  }
}

/* ---- Grade */
.catalog {
  padding-top: 1.25rem;
  padding-bottom: 3rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem 0.75rem;
}

@media (min-width: 40rem) {
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 2rem 1.25rem;
  }
}

.more {
  display: flex;
  justify-content: center;
  margin-top: 2.5rem;
}

.empty {
  display: grid;
  justify-items: start;
  gap: 0.75rem;
  padding: 3rem 0;
  color: var(--muted);
}

.empty-title {
  color: var(--text);
  font-size: var(--step-2);
  font-stretch: var(--semi);
  font-weight: 640;
}

/* ---- Rodapé */
.store-foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.75rem 2rem;
  padding-top: 1.5rem;
  padding-bottom: 2.5rem;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: var(--step--1);
}

.store-foot a {
  color: var(--text);
  text-underline-offset: 3px;
}

/* ---- Erro */
.problem {
  display: grid;
  justify-items: start;
  gap: 1.25rem;
  padding-top: 2.5rem;
  padding-bottom: 4rem;
}

@media (min-width: 48rem) {
  .problem {
    padding-top: 5rem;
  }
}

.back {
  color: var(--muted);
  text-underline-offset: 3px;
}

.problem-title {
  font-size: clamp(2.5rem, 9vw, 4.5rem);
}

.problem-body {
  max-width: 36rem;
  color: var(--muted);
  font-size: var(--step-1);
}

.problem-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
