<script setup>
// Aba "Itens" do painel: todos os itens do inventário (inclusive os ocultos), com busca e filtros.
// O olho mostra ou oculta na hora; tocar no item abre a edição de preço, custo e situação.
const props = defineProps({
  store: { type: Object, required: true },
})

const { data, status, error, refresh, patchItem } = usePanelItems()
const items = computed(() => data.value?.items ?? [])
const loading = computed(() => status.value === 'pending' || status.value === 'idle')

// Se a loja mudou (outra aba salvou o desconto ou o inventário foi lido de novo), a lista também.
watch(
  () => [props.store.pricing.discount, props.store.pricing.rounding, props.store.readAt],
  () => refresh(),
)

const FILTERS = [
  { id: 'todos', label: 'Todos', test: () => true },
  { id: 'ocultos', label: 'Ocultos', test: (item) => item.hidden },
  { id: 'manual', label: 'Preço manual', test: (item) => item.price != null || item.ask },
  { id: 'reservados', label: 'Reservados', test: (item) => item.status === 'reservado' },
  { id: 'vendidos', label: 'Vendidos', test: (item) => item.status === 'vendido' },
]
const filter = ref('todos')
const search = ref('')
const term = computed(() => normalizeText(search.value.trim()))
const matches = (item) =>
  !term.value || normalizeText([item.marketName, item.localName].filter(Boolean).join(' ')).includes(term.value)

const counts = computed(() =>
  Object.fromEntries(FILTERS.map((f) => [f.id, items.value.filter((item) => matches(item) && f.test(item)).length])),
)
const filtered = computed(() => {
  const test = FILTERS.find((f) => f.id === filter.value).test
  return items.value.filter((item) => matches(item) && test(item))
})

const PAGE_SIZE = 60
const limit = ref(PAGE_SIZE)
const visible = computed(() => filtered.value.slice(0, limit.value))
watch([filter, search], () => (limit.value = PAGE_SIZE))

// ---- Mostrar ou ocultar na hora
const toggling = ref(new Set())
const toggleProblem = ref(null)

async function toggleHidden(item) {
  toggleProblem.value = null
  toggling.value.add(item.id)
  try {
    const result = await $fetch(`/api/painel/itens/${item.id}`, { method: 'POST', body: { hidden: !item.hidden } })
    patchItem(item.id, result.item)
  } catch (error) {
    if (errorCode(error) === 'AUTH_REQUIRED') return navigateTo('/entrar')
    toggleProblem.value = accountMessage(error)
  } finally {
    toggling.value.delete(item.id)
  }
}

// ---- Edição
const editing = ref(null)
function onSaved(id, settings) {
  patchItem(id, settings)
}

const STATUS_LABEL = { reservado: 'Reservado', vendido: 'Vendido' }

function shownPrice(item) {
  if (item.ask) return 'Sob consulta'
  if (item.price != null) return formatBRL(item.price)
  return item.standard != null ? formatBRL(item.standard) : 'Sob consulta'
}

function priceSource(item) {
  if (item.ask || item.price != null) return 'Manual'
  return item.standard != null ? 'Padrão' : 'Sem preço Steam'
}

function rowKind(item) {
  return [item.star && '★', item.stattrak && 'StatTrak™', itemSubtitle(item)].filter(Boolean).join(' ')
}

// "FN 0,0213" e a quantidade, quando é mais de um.
function rowMeta(item) {
  const wear = item.wear ? [item.wear, item.float != null && formatFloat(item.float)].filter(Boolean).join(' ') : ''
  return [wear, item.quantity > 1 && `${item.quantity}×`].filter(Boolean).join('  ')
}

function rarityStyle(item) {
  return { '--rarity': item.rarity.color }
}
</script>

<template>
  <div class="items">
    <div class="items-intro">
      <h2 class="block-title">Itens</h2>
      <p class="muted">
        O preço padrão é o da Steam menos {{ store.pricing.discount }}%. Troque o preço de um item, marque como
        reservado ou vendido, ou oculte o que não quer vender.
      </p>
    </div>

    <div class="items-tools">
      <label class="search">
        <AppIcon name="search" />
        <span class="visually-hidden">Buscar item</span>
        <input v-model="search" type="search" placeholder="Buscar skin" enterkeyhint="search" />
      </label>
      <div class="chips" role="group" aria-label="Mostrar">
        <button
          v-for="f in FILTERS"
          :key="f.id"
          type="button"
          class="chip"
          :aria-pressed="filter === f.id"
          @click="filter = f.id"
        >
          {{ f.label }}
          <span v-if="items.length" class="chip-count">{{ counts[f.id] }}</span>
        </button>
      </div>
    </div>

    <FormProblem v-if="toggleProblem" :problem="toggleProblem" />

    <p v-if="loading && !items.length" class="muted" role="status">Carregando os itens…</p>
    <FormProblem v-else-if="error" :problem="accountMessage(error)">
      <button class="btn" type="button" @click="refresh()">Tentar de novo</button>
    </FormProblem>
    <div v-else-if="!items.length" class="empty">
      <p class="empty-title">Nenhum item no inventário</p>
      <p class="muted">Quando houver skins no inventário, atualize na aba Loja e elas aparecem aqui.</p>
    </div>
    <p v-else-if="!filtered.length" class="muted">
      {{ filter === 'todos' ? 'Nenhum item encontrado' : 'Nenhum item com esse filtro' }}{{ search ? ` para “${search}”` : '' }}.
    </p>

    <ul v-else class="rows">
      <li v-for="item in visible" :key="item.id" class="row" :class="{ 'is-hidden': item.hidden }" :style="rarityStyle(item)">
        <button class="row-main" type="button" :aria-label="`Editar ${item.marketName}`" @click="editing = item">
          <span class="thumb">
            <img v-if="item.image" :src="steamImage(item.image, '128fx96f')" alt="" width="96" height="72" loading="lazy" />
          </span>
          <span class="row-name">
            <span class="row-kind">{{ rowKind(item) }}</span>
            <span class="row-title">{{ itemTitle(item) }}</span>
            <span v-if="rowMeta(item)" class="row-meta">{{ rowMeta(item) }}</span>
          </span>
          <span class="row-price">
            <span class="row-seller">{{ shownPrice(item) }}</span>
            <span class="row-source">{{ priceSource(item) }}</span>
            <span v-if="(item.ask || item.price != null) && item.standard != null" class="row-source">
              padrão {{ formatBRL(item.standard) }}
            </span>
          </span>
          <span v-if="item.hidden || item.status || item.cost != null" class="row-tags">
            <span v-if="item.hidden" class="tag">Oculto</span>
            <span v-if="item.status" class="tag" :class="`tag--${item.status}`">{{ STATUS_LABEL[item.status] }}</span>
            <span v-if="item.cost != null" class="tag tag--cost">Custo {{ formatBRL(item.cost) }}</span>
          </span>
        </button>
        <button
          class="eye"
          type="button"
          :aria-pressed="!item.hidden"
          :aria-label="`${item.hidden ? 'Mostrar' : 'Ocultar'} ${item.marketName} na loja`"
          :title="item.hidden ? 'Mostrar na loja' : 'Ocultar da loja'"
          :disabled="toggling.has(item.id)"
          @click="toggleHidden(item)"
        >
          <AppIcon :name="item.hidden ? 'eye-off' : 'eye'" />
        </button>
      </li>
    </ul>

    <div v-if="filtered.length > visible.length" class="more">
      <button class="btn" type="button" @click="limit += PAGE_SIZE">
        Mostrar mais {{ Math.min(PAGE_SIZE, filtered.length - visible.length) }}
      </button>
    </div>

    <ItemEditor :item="editing" :pricing="store.pricing" @close="editing = null" @saved="onSaved" />
  </div>
</template>

<style scoped>
.items {
  display: grid;
  gap: 1.25rem;
  max-width: 64rem;
}

.items-intro {
  display: grid;
  gap: 0.5rem;
  max-width: 44rem;
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

.items-tools {
  display: grid;
  gap: 0.75rem;
}

.search {
  position: relative;
  display: flex;
  align-items: center;
  max-width: 28rem;
}

.search svg {
  position: absolute;
  left: 0.75rem;
  width: 18px;
  height: 18px;
  color: var(--muted);
  pointer-events: none;
}

.search input {
  width: 100%;
  min-height: 44px;
  padding: 0 0.75rem 0 2.5rem;
  border: 1px solid var(--field-line);
  border-radius: var(--radius-m);
  background: var(--stage);
}

.search input::placeholder {
  color: var(--placeholder);
}

.search input:focus-visible {
  outline-offset: 0;
  border-color: var(--accent-edge);
}

/* A folga em cima e embaixo deixa o anel de foco aparecer inteiro na faixa que rola. */
.chips {
  display: flex;
  gap: 0.375rem;
  margin: -4px calc(var(--gutter) * -1);
  padding: 4px var(--gutter);
  overflow-x: auto;
  scrollbar-width: none;
}

.chips .chip {
  min-height: 40px;
}

/* ---- Linhas: como a lista do inventário do jogo, a skin à esquerda na cor da raridade. */
.rows {
  display: grid;
  border-top: 1px solid var(--line);
}

.row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  border-bottom: 1px solid var(--line);
}

.row-main {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  grid-template-areas:
    'thumb name price'
    'thumb tags tags';
  gap: 0.25rem 0.75rem;
  align-items: center;
  min-height: 72px;
  padding: 0.625rem 0;
  border: 0;
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.row-main:hover .row-title {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.thumb {
  grid-area: thumb;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-s);
  background:
    radial-gradient(80% 60% at 50% 100%, color-mix(in srgb, var(--rarity) 30%, transparent), transparent 75%),
    var(--stage);
  box-shadow: inset 0 -2px 0 var(--rarity);
}

.thumb img {
  width: 100%;
  height: 100%;
  padding: 6%;
  object-fit: contain;
}

.row-name {
  grid-area: name;
  display: grid;
  min-width: 0;
}

.row-kind,
.row-meta {
  overflow: hidden;
  color: var(--muted);
  font-size: var(--step--1);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.row-meta {
  font-variant-numeric: tabular-nums;
}

.row-title {
  overflow: hidden;
  font-stretch: var(--semi);
  font-weight: 640;
  line-height: 1.2;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* Coluna de preço com teto: o nome da skin nunca é esmagado. */
.row-price {
  grid-area: price;
  display: grid;
  justify-items: end;
  max-width: 8.5rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.row-seller {
  font-weight: 650;
  white-space: nowrap;
}

.row-source {
  color: var(--muted);
  font-size: var(--step--1);
  line-height: 1.3;
}

.row-tags {
  grid-area: tags;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.tag {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 6px;
  border-radius: var(--radius-s);
  background: var(--surface-2);
  font-size: var(--step--1);
  font-weight: 600;
}

.tag--reservado {
  background: var(--accent);
  color: var(--accent-ink);
}

.tag--cost {
  background: transparent;
  color: var(--muted);
  font-weight: 500;
}

/* Oculto: a linha fica apagada, mas continua fácil de achar e de mostrar de novo. */
.row.is-hidden .thumb img,
.row.is-hidden .row-title,
.row.is-hidden .row-seller {
  opacity: 0.55;
}

.eye {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-left: 0.5rem;
  border: 1px solid var(--field-line);
  border-radius: var(--radius-m);
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.eye svg {
  width: 20px;
  height: 20px;
}

.eye[aria-pressed='false'] {
  color: var(--muted);
  border-style: dashed;
}

.eye:hover {
  background: var(--surface);
}

.eye:disabled {
  opacity: 0.6;
  cursor: default;
}

.empty {
  display: grid;
  gap: 0.25rem;
  padding: 2rem 0;
}

.empty-title {
  font-size: var(--step-1);
  font-weight: 600;
}

.more {
  display: flex;
  justify-content: center;
}

@media (min-width: 48rem) {
  .chips {
    flex-wrap: wrap;
    margin-inline: 0;
    padding-inline: 0;
  }

  .row-price {
    max-width: none;
  }

  .items-tools {
    grid-template-columns: minmax(0, 20rem) 1fr;
    align-items: center;
  }

  .row-main {
    grid-template-columns: 88px minmax(0, 1fr) minmax(8rem, auto) minmax(10rem, 14rem);
    grid-template-areas: 'thumb name tags price';
    gap: 1rem;
  }

  .row-tags {
    justify-content: flex-end;
  }
}
</style>
