<script setup>
// Loja inteira (cabeçalho, filtros, grade e ficha do item), usada na demo, na prévia e na loja do
// revendedor. `store` é a resposta de /api/demo, /api/previa/:id ou /api/loja/:slug.
const props = defineProps({
  store: { type: Object, required: true },
  whatsapp: { type: String, default: '' },
  // Prévia: sem botões de copiar link e sem título e imagem de compartilhamento da loja. Ela não
  // é uma loja verificada e não deve circular como se fosse.
  preview: { type: Boolean, default: false },
  // Loja do revendedor: conta visitas, skins abertas e cliques no WhatsApp.
  slug: { type: String, default: '' },
})

function track(tipo, item = null) {
  if (props.slug) sendStoreEvent(props.slug, tipo, item)
}

// Na loja de exemplo o botão de WhatsApp abre a escolha de contato, com a mensagem pronta.
const showWhatsapp = computed(() => Boolean(props.whatsapp || props.store.demo))

const route = useRoute()
const router = useRouter()

const items = computed(() => props.store.items ?? [])
const profile = computed(() => props.store.profile ?? null)
const storeName = computed(() => profile.value?.name ?? 'Catálogo de skins')

// ---- Tema: a loja do revendedor usa a cor e o fundo escolhidos no painel; a demo e a prévia
// aceitam ?cor=ff5500&fundo=claro na URL.
const { options: themeOptions } = useTheme()
const pickTheme = () => props.store.brand?.theme ?? { cor: route.query.cor, fundo: route.query.fundo }
themeOptions.value = pickTheme()
watch(() => [props.store.brand?.theme, route.query.cor, route.query.fundo], () => (themeOptions.value = pickTheme()))
// A página seguinte monta antes de esta sair: só volta ao padrão se ela não for outra loja.
onBeforeUnmount(() => {
  if (!isStorePath(router.currentRoute.value.path)) themeOptions.value = {}
})

// ---- Resumo do inventário
const totals = computed(() => {
  let units = 0
  let tradable = 0
  for (const item of items.value) {
    units += item.quantity
    // Vendido continua na loja até sair do inventário, mas não está disponível.
    if (isTradableNow(item) && item.status !== 'vendido') tradable += item.quantity
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

// Desconto padrão da loja sobre a Steam (na demo e na prévia, o da configuração). Alguns itens
// podem ter preço manual: a frase fala do padrão.
const priceNote = computed(() => {
  const percent =
    props.store.discount != null
      ? Math.round(props.store.discount * 100)
      : savingsPercent(items.value.find((item) => item.price)?.price)
  return percent > 0 ? `Preços ${percent}% abaixo da Steam.` : ''
})

// ---- Filtros. Categoria e arma ficam na URL para o revendedor poder compartilhar "só Karambits".
const present = computed(() => new Set(items.value.map((item) => item.category)))
const chips = computed(() => [
  { id: 'tudo', label: 'Tudo' },
  ...CATEGORIES.filter((c) => present.value.has(c.id)),
])

const category = computed({
  get: () => {
    const c = String(route.query.c ?? 'tudo')
    return present.value.has(c) ? c : 'tudo'
  },
  set: (c) => router.replace({ query: { ...route.query, c: c === 'tudo' ? undefined : c, a: undefined } }),
})

// Segundo nível: as armas (ou os tipos, em Agentes e Outros) da categoria escolhida.
const groups = computed(() => {
  if (category.value === 'tudo') return []
  const names = new Set(items.value.filter((item) => item.category === category.value).map(itemGroup))
  return [...names].sort((a, b) => a.localeCompare(b))
})
const groupsLabel = computed(() => (['agentes', 'outros'].includes(category.value) ? 'Tipos' : 'Armas'))

const group = computed({
  get: () => {
    const a = String(route.query.a ?? '')
    return groups.value.includes(a) ? a : null
  },
  set: (a) => router.replace({ query: { ...route.query, a: a ?? undefined } }),
})

const wears = ref([])
const stattrakOnly = ref(false)
const search = ref('')
const sort = ref('raridade')
const filtersOpen = ref(false)

const wearChips = computed(() => WEAR_SCALE.filter((w) => items.value.some((item) => item.wear === w.id)))
const hasStattrak = computed(() => items.value.some((item) => item.stattrak))
const activeFilters = computed(() => wears.value.length + (stattrakOnly.value ? 1 : 0))

function toggleWear(id) {
  wears.value = wears.value.includes(id) ? wears.value.filter((w) => w !== id) : [...wears.value, id]
}

const index = computed(() => new Map(items.value.map((item) => [item.id, searchText(item)])))
const term = computed(() => normalizeText(search.value.trim()))

// Cada filtro é uma regra. A contagem de um chip aplica todas as outras regras, então mostra
// quantos itens aparecem ao tocar nele.
const RULES = Object.entries({
  category: (item) => category.value === 'tudo' || item.category === category.value,
  group: (item) => !group.value || itemGroup(item) === group.value,
  wear: (item) => !wears.value.length || wears.value.includes(item.wear),
  stattrak: (item) => !stattrakOnly.value || item.stattrak,
  search: (item) => !term.value || index.value.get(item.id).includes(term.value),
})

function passes(item, skip = []) {
  return RULES.every(([name, rule]) => skip.includes(name) || rule(item))
}

const categoryCounts = computed(() => {
  const map = { tudo: 0 }
  for (const item of items.value) {
    if (!passes(item, ['category', 'group'])) continue
    map.tudo++
    map[item.category] = (map[item.category] ?? 0) + 1
  }
  return map
})

const groupCounts = computed(() => {
  const map = {}
  for (const item of items.value) {
    if (!passes(item, ['group'])) continue
    const name = itemGroup(item)
    map[name] = (map[name] ?? 0) + 1
  }
  return map
})

// Desgaste e StatTrak não mostram contagem, mas desligam quando não trariam nenhum item.
const wearAvailable = computed(() => {
  const set = new Set()
  for (const item of items.value) if (item.wear && passes(item, ['wear'])) set.add(item.wear)
  return set
})
const stattrakAvailable = computed(() => items.value.some((item) => item.stattrak && passes(item, ['stattrak'])))

// O painel do celular fecha quando a pessoa rola a página, para a barra fixa não cobrir os itens.
let openedAt = 0
function closeOnScroll() {
  if (Math.abs(window.scrollY - openedAt) > 48) filtersOpen.value = false
}
watch(filtersOpen, (open) => {
  openedAt = window.scrollY
  window[open ? 'addEventListener' : 'removeEventListener']('scroll', closeOnScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', closeOnScroll))

// Quem abre um link com ?c= e ?a= precisa ver o chip ativo, que pode estar fora da tela.
const toolbar = ref(null)
function revealActiveChips() {
  for (const chip of toolbar.value?.querySelectorAll('.chips .chip[aria-pressed="true"]') ?? []) {
    const row = chip.parentElement
    const [c, r] = [chip.getBoundingClientRect(), row.getBoundingClientRect()]
    row.scrollLeft += c.left - r.left - (r.width - c.width) / 2
  }
}
onMounted(revealActiveChips)
watch(category, () => nextTick(revealActiveChips))

const filtered = computed(() => {
  let list = items.value.filter((item) => passes(item))

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
watch([category, group, wears, stattrakOnly, search, sort], () => (limit.value = PAGE_SIZE))

function clearFilters() {
  search.value = ''
  wears.value = []
  stattrakOnly.value = false
  router.replace({ query: { ...route.query, c: undefined, a: undefined } })
}

// ---- Item aberto (?i=assetid), assim o link de uma skin específica pode ser compartilhado
const selected = computed(() => items.value.find((item) => item.id === route.query.i) ?? null)

onMounted(() => {
  track('visita')
  if (selected.value) track('item', selected.value.id)
})
watch(selected, (item) => item && track('item', item.id))
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

// A loja e a prévia mostram o inventário da última leitura, não o de agora.
const readAt = computed(() => (props.store.fetchedAt ? formatDateTime(props.store.fetchedAt) : ''))

// ---- Prévia do link no WhatsApp
const shareImage = computed(() => {
  const item = selected.value ?? items.value.find((i) => i.image)
  return item ? steamImage(item.image, '512fx384f') : undefined
})

if (!props.preview) useSeoMeta({
  title: () => (selected.value ? `${selected.value.marketName} | ${storeName.value}` : `Skins de ${storeName.value}`),
  description: () => summary.value,
  ogTitle: () => (selected.value ? selected.value.marketName : `Skins de ${storeName.value}`),
  ogDescription: () => summary.value,
  ogImage: shareImage,
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <div class="store">
    <StoreHeader
      :name="storeName"
      :avatar="profile?.avatar"
      :profile-url="profile?.url"
      :brand="store.brand"
      :summary="[summary, priceNote].filter(Boolean).join(' ')"
    >
      <template v-if="store.demo" #note>
        <span class="owner-note">Catálogo de exemplo com dados fictícios</span>
      </template>
      <template v-if="showWhatsapp || !preview">
        <a
          v-if="showWhatsapp"
          class="btn btn--primary"
          :href="whatsappLink(whatsapp)"
          target="_blank"
          rel="noopener"
          @click="track('whatsapp')"
        >
          <AppIcon name="chat" />
          Chamar no WhatsApp
        </a>
        <button
          v-if="!preview"
          class="btn copy-link"
          :class="{ 'is-copied': copied }"
          type="button"
          :aria-label="copied ? 'Link copiado' : 'Copiar link da loja'"
          @click="copyStoreLink"
        >
          <AppIcon name="link" />
          <span class="copy-text" aria-hidden="true">{{ copied ? 'Link copiado' : 'Copiar link da loja' }}</span>
        </button>
      </template>
    </StoreHeader>

    <div v-if="items.length" ref="toolbar" class="toolbar">
      <!-- A ordem no HTML segue a do computador (para o Tab); no celular o CSS reordena. -->
      <div class="wrap toolbar-inner">
        <nav class="chips" aria-label="Categorias">
          <button
            v-for="chip in chips"
            :key="chip.id"
            type="button"
            class="chip"
            :aria-pressed="category === chip.id"
            :disabled="!categoryCounts[chip.id] && category !== chip.id"
            @click="category = chip.id"
          >
            {{ chip.label }}
            <span class="chip-count">{{ categoryCounts[chip.id] ?? 0 }}</span>
          </button>
        </nav>

        <label class="search">
          <AppIcon name="search" />
          <span class="visually-hidden">Buscar</span>
          <input v-model="search" type="search" placeholder="Buscar skin ou sticker" enterkeyhint="search" />
        </label>

        <!-- No celular, ordem, desgaste e StatTrak ficam atrás deste botão para a barra fixa não crescer. -->
        <button
          class="btn filters-toggle"
          type="button"
          :aria-expanded="filtersOpen"
          aria-controls="filtros"
          @click="filtersOpen = !filtersOpen"
        >
          <AppIcon name="filter" />
          Filtros
          <span v-if="activeFilters" class="filters-count">{{ activeFilters }}</span>
        </button>

        <div id="filtros" class="extras" :class="{ 'is-open': filtersOpen }">
          <label class="sort">
            <span class="extras-label">Ordenar por</span>
            <select v-model="sort">
              <option value="raridade">Raridade</option>
              <option value="desgaste">Menor float</option>
              <option value="nome">Nome</option>
            </select>
          </label>

          <div v-if="wearChips.length || hasStattrak" class="facets">
            <span v-if="wearChips.length" id="desgaste-label" class="extras-label">Desgaste</span>
            <div v-if="wearChips.length" class="wears" role="group" aria-labelledby="desgaste-label">
              <button
                v-for="w in wearChips"
                :key="w.id"
                type="button"
                class="chip chip--wear"
                :title="w.label"
                :aria-pressed="wears.includes(w.id)"
                :disabled="!wearAvailable.has(w.id) && !wears.includes(w.id)"
                @click="toggleWear(w.id)"
              >
                {{ w.id }}<span class="visually-hidden"> ({{ w.label }})</span>
              </button>
            </div>
            <button
              v-if="hasStattrak"
              type="button"
              class="chip"
              :aria-pressed="stattrakOnly"
              :disabled="!stattrakAvailable && !stattrakOnly"
              @click="stattrakOnly = !stattrakOnly"
            >
              StatTrak™
            </button>
          </div>
        </div>

        <div v-if="groups.length > 1" class="chips chips--sub" role="group" :aria-label="groupsLabel">
          <button type="button" class="chip" :aria-pressed="!group" @click="group = null">
            {{ groupsLabel === 'Tipos' ? 'Todos' : 'Todas' }}
            <span class="chip-count">{{ categoryCounts[category] ?? 0 }}</span>
          </button>
          <button
            v-for="name in groups"
            :key="name"
            type="button"
            class="chip"
            :aria-pressed="group === name"
            :disabled="!groupCounts[name] && group !== name"
            @click="group = group === name ? null : name"
          >
            {{ name }}
            <span class="chip-count">{{ groupCounts[name] ?? 0 }}</span>
          </button>
        </div>
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
      <p v-if="readAt">Inventário lido em {{ readAt }}.</p>
      <NuxtLink to="/">Loja feita com a Revenda</NuxtLink>
    </footer>

    <SkinDetail
      :item="selected"
      :whatsapp="whatsapp"
      :demo="store.demo"
      :copy-link="!preview"
      @close="closeItem"
      @whatsapp="track('whatsapp', selected?.id)"
    />
  </div>
</template>

<style scoped>
.store {
  min-height: 100dvh;
}

/* No celular estreito, "Copiar link" vira só o ícone, ao lado do WhatsApp, para o topo não crescer. */
@container (max-width: 26rem) {
  .copy-link {
    width: 44px;
    padding: 0;
  }

  .copy-text {
    display: none;
  }

  /* Depois de copiar, o texto aparece por 2 segundos para confirmar. */
  .copy-link.is-copied {
    width: auto;
    padding: 0 1.1rem;
  }

  .is-copied .copy-text {
    display: inline;
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
  grid-template-columns: minmax(0, 1fr) auto;
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
  border: 1px solid var(--field-line);
  border-radius: var(--radius-m);
  background: var(--stage);
}

.search input {
  padding: 0 0.75rem 0 2.5rem;
}

.search input::placeholder {
  color: var(--placeholder);
}

.sort select {
  padding: 0 0.75rem;
}

.filters-toggle {
  min-height: 42px;
  padding-inline: 0.875rem;
}

.filters-toggle[aria-expanded='true'] {
  border-color: var(--accent-edge);
}

.filters-count {
  display: inline-grid;
  place-items: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.25rem;
  border-radius: var(--radius-s);
  background: var(--accent);
  color: var(--accent-ink);
  font-size: var(--step--1);
  font-variant-numeric: tabular-nums;
}

/* Painel do botão Filtros, no celular. */
.extras {
  display: none;
  grid-column: 1 / -1;
  gap: 0.875rem;
  padding-bottom: 0.25rem;
}

.extras.is-open {
  display: grid;
}

.extras-label {
  color: var(--muted);
  font-size: var(--step--1);
}

.sort {
  display: grid;
  gap: 0.25rem;
}

.facets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem 0.75rem;
}

.wears {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
}

.facets .extras-label {
  flex-basis: 100%;
}

.chip--wear {
  justify-content: center;
  min-width: 2.75rem;
  padding-inline: 0.5rem;
}

/* No celular as linhas de chips rolam de lado e vêm depois da busca e do painel. */
.chips {
  grid-column: 1 / -1;
  order: 1;
  display: flex;
  gap: 0.375rem;
  margin: -4px calc(var(--gutter) * -1);
  padding: 4px var(--gutter);
  overflow-x: auto;
  scrollbar-width: none;
}

.chips--sub {
  order: 2;
}

.chips::-webkit-scrollbar {
  display: none;
}

/*
  No computador: categorias, busca e ordem na primeira linha; armas, desgaste e StatTrak na
  segunda. O painel some e os itens dele entram direto na grade.
*/
@media (min-width: 48rem) {
  .toolbar-inner {
    grid-template-columns: minmax(0, 1fr) minmax(14rem, 20rem) auto;
    align-items: center;
    gap: 0 1rem;
  }

  /* No computador os chips quebram linha em vez de rolar: todos ficam ao alcance do mouse. */
  .chips {
    grid-column: 1;
    grid-row: 1;
    flex-wrap: wrap;
    margin: 0;
    padding: 0;
    overflow: visible;
  }

  .search {
    grid-column: 2;
    grid-row: 1;
  }

  .filters-toggle {
    display: none;
  }

  .extras,
  .extras.is-open {
    display: contents;
  }

  .sort {
    grid-column: 3;
    grid-row: 1;
  }

  .sort .extras-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .chips--sub {
    grid-column: 1;
    grid-row: 2;
    margin-top: 0.625rem;
  }

  .facets {
    grid-column: 2 / -1;
    grid-row: 2;
    justify-content: flex-end;
    align-items: center;
    margin-top: 0.625rem;
  }

  .facets .extras-label {
    flex-basis: auto;
    margin-right: -0.25rem;
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
  display: inline-block;
  padding-block: 0.125rem;
  color: var(--text);
  text-underline-offset: 3px;
}

</style>
