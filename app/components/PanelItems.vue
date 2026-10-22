<script setup>
// Aba "Itens" do painel: todos os itens do inventário (inclusive os ocultos), com busca e filtros.
// O olho mostra ou oculta na hora; tocar no item abre a edição de preço, custo e situação.
const props = defineProps({
  store: { type: Object, required: true },
})

const { data, status: fetchStatus, error, refresh, patchItem } = usePanelItems()
const items = computed(() => data.value?.items ?? [])
const loading = computed(() => fetchStatus.value === 'pending' || fetchStatus.value === 'idle')

// Se a loja mudou (outra aba salvou o desconto ou o inventário foi lido de novo), a lista também.
watch(
  () => [props.store.pricing.discount, props.store.pricing.rounding, props.store.readAt],
  () => refresh(),
)

// ---- Filtros: categoria (e arma, dentro dela), situação e busca, como na loja. A contagem de cada
// chip aplica os outros filtros, então mostra quantos itens aparecem ao tocar nele.
const STATUSES = [
  { id: 'todos', label: 'Todos', test: () => true },
  { id: 'ocultos', label: 'Ocultos', test: (item) => item.hidden },
  { id: 'manual', label: 'Preço manual', test: (item) => item.price != null || item.ask },
  // Sem preço Steam e sem preço seu: a loja mostra "Sob consulta".
  { id: 'sem-preco', label: 'Sem preço', test: (item) => item.standard == null && item.price == null && !item.ask },
  { id: 'reservados', label: 'Reservados', test: (item) => item.status === 'reservado' },
  { id: 'vendidos', label: 'Vendidos', test: (item) => item.status === 'vendido' },
]
const status = ref('todos')
const category = ref('tudo')
const group = ref(null)
const search = ref('')
const sort = ref('raridade')
watch(category, () => (group.value = null))

const term = computed(() => normalizeText(search.value.trim()))
const RULES = Object.entries({
  search: (item) =>
    !term.value || normalizeText([item.marketName, item.localName].filter(Boolean).join(' ')).includes(term.value),
  category: (item) => category.value === 'tudo' || item.category === category.value,
  group: (item) => !group.value || itemGroup(item) === group.value,
  status: (item) => STATUSES.find((s) => s.id === status.value).test(item),
})
const passes = (item, skip = []) => RULES.every(([name, rule]) => skip.includes(name) || rule(item))

const present = computed(() => new Set(items.value.map((item) => item.category)))
const categoryChips = computed(() => [{ id: 'tudo', label: 'Tudo' }, ...CATEGORIES.filter((c) => present.value.has(c.id))])
const categoryCounts = computed(() => {
  const map = { tudo: 0 }
  for (const item of items.value) {
    if (!passes(item, ['category', 'group'])) continue
    map.tudo++
    map[item.category] = (map[item.category] ?? 0) + 1
  }
  return map
})

// Segundo nível: as armas (ou os tipos, em Agentes e Outros) da categoria escolhida.
const groups = computed(() => {
  if (category.value === 'tudo') return []
  const names = new Set(items.value.filter((item) => item.category === category.value).map(itemGroup))
  return [...names].sort((a, b) => a.localeCompare(b))
})
const groupsByType = computed(() => ['agentes', 'outros'].includes(category.value))
const groupCounts = computed(() => {
  const map = {}
  for (const item of items.value) {
    if (!passes(item, ['group'])) continue
    map[itemGroup(item)] = (map[itemGroup(item)] ?? 0) + 1
  }
  return map
})

const statusCounts = computed(() =>
  Object.fromEntries(STATUSES.map((s) => [s.id, items.value.filter((item) => passes(item, ['status']) && s.test(item)).length])),
)

// Preço que a loja mostra (manual ou padrão); sob consulta e sem preço vão para o fim.
const shownValue = (item) => (item.ask ? null : (item.price ?? item.standard))
const SORTS = {
  raridade: null,
  'maior-preco': (a, b) => (shownValue(b) ?? -1) - (shownValue(a) ?? -1),
  'menor-preco': (a, b) => (shownValue(a) ?? Infinity) - (shownValue(b) ?? Infinity),
  nome: (a, b) => `${a.weapon} ${a.skin}`.localeCompare(`${b.weapon} ${b.skin}`),
  float: (a, b) => (a.float ?? 2) - (b.float ?? 2),
}

const filtered = computed(() => {
  const list = items.value.filter((item) => passes(item))
  return SORTS[sort.value] ? [...list].sort(SORTS[sort.value]) : list
})
const activeFilters = computed(() => category.value !== 'tudo' || status.value !== 'todos' || Boolean(term.value))

function clearFilters() {
  search.value = ''
  category.value = 'tudo'
  status.value = 'todos'
}

const PAGE_SIZE = 60
const limit = ref(PAGE_SIZE)
const visible = computed(() => filtered.value.slice(0, limit.value))
watch([status, category, group, search, sort], () => (limit.value = PAGE_SIZE))

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
      <div class="tools-top">
        <label class="search">
          <AppIcon name="search" />
          <span class="visually-hidden">Buscar item</span>
          <input v-model="search" type="search" placeholder="Buscar skin" enterkeyhint="search" />
        </label>
        <label class="sort">
          <span class="filter-label">Ordenar</span>
          <select v-model="sort">
            <option value="raridade">Raridade</option>
            <option value="maior-preco">Maior preço</option>
            <option value="menor-preco">Menor preço</option>
            <option value="nome">Nome</option>
            <option value="float">Menor float</option>
          </select>
        </label>
      </div>

      <div class="filter-row">
        <span id="filtro-categoria" class="filter-label">Categoria</span>
        <div class="chips" role="group" aria-labelledby="filtro-categoria">
          <button
            v-for="c in categoryChips"
            :key="c.id"
            type="button"
            class="chip"
            :aria-pressed="category === c.id"
            :disabled="!categoryCounts[c.id] && category !== c.id"
            @click="category = c.id"
          >
            {{ c.label }}
            <span v-if="items.length" class="chip-count">{{ categoryCounts[c.id] ?? 0 }}</span>
          </button>
        </div>
      </div>

      <div v-if="groups.length > 1" class="filter-row">
        <span id="filtro-arma" class="filter-label">{{ groupsByType ? 'Tipo' : 'Arma' }}</span>
        <div class="chips" role="group" aria-labelledby="filtro-arma">
          <button type="button" class="chip" :aria-pressed="!group" @click="group = null">
            {{ groupsByType ? 'Todos' : 'Todas' }}
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

      <div class="filter-row">
        <span id="filtro-situacao" class="filter-label">Situação</span>
        <div class="chips" role="group" aria-labelledby="filtro-situacao">
          <button
            v-for="s in STATUSES"
            :key="s.id"
            type="button"
            class="chip"
            :aria-pressed="status === s.id"
            @click="status = s.id"
          >
            {{ s.label }}
            <span v-if="items.length" class="chip-count">{{ statusCounts[s.id] }}</span>
          </button>
        </div>
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
    <div v-else-if="!filtered.length" class="empty">
      <p class="empty-title">Nenhum item encontrado{{ search ? ` para “${search}”` : '' }}</p>
      <button v-if="activeFilters" class="btn" type="button" @click="clearFilters">Limpar busca e filtros</button>
    </div>

    <template v-else>
      <p class="result-count muted" role="status">
        {{ filtered.length === 1 ? '1 item' : `${filtered.length} itens` }}
      </p>
      <ul class="tiles">
        <li
          v-for="item in visible"
          :key="item.id"
          class="tile"
          :class="{ 'is-hidden': item.hidden }"
          :style="rarityStyle(item)"
        >
          <button class="tile-main" type="button" :aria-label="`Editar ${item.marketName}`" @click="editing = item">
            <span class="thumb">
              <img
                v-if="item.image"
                :src="steamImage(item.image, '256fx192f')"
                alt=""
                width="128"
                height="96"
                loading="lazy"
              />
            </span>
            <span class="tile-name">
              <span class="tile-kind">{{ rowKind(item) }}</span>
              <span class="tile-title">{{ itemTitle(item) }}</span>
              <span v-if="rowMeta(item)" class="tile-meta">{{ rowMeta(item) }}</span>
            </span>
            <span class="tile-price">
              <span class="tile-values">
                <span class="tile-seller">{{ shownPrice(item) }}</span>
                <span v-if="(item.ask || item.price != null) && item.standard != null" class="tile-standard">
                  padrão {{ formatBRL(item.standard) }}
                </span>
              </span>
              <span class="tile-source">{{ priceSource(item) }}</span>
            </span>
            <span v-if="item.hidden || item.status || item.cost != null" class="tile-tags">
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
    </template>

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

/* ---- Busca, ordem e filtros */
.items-tools {
  display: grid;
  gap: 0.75rem;
}

.tools-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
}

.search {
  position: relative;
  display: flex;
  flex: 1 1 16rem;
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

.search input,
.sort select {
  min-height: 44px;
  border: 1px solid var(--field-line);
  border-radius: var(--radius-m);
  background: var(--stage);
}

.search input {
  width: 100%;
  padding: 0 0.75rem 0 2.5rem;
}

.search input::placeholder {
  color: var(--placeholder);
}

.search input:focus-visible,
.sort select:focus-visible {
  outline-offset: 0;
  border-color: var(--accent-edge);
}

.sort {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sort select {
  padding: 0 0.75rem;
}

.filter-label {
  color: var(--muted);
  font-size: var(--step--1);
}

/* No celular, o nome do filtro fica em cima e os chips rolam de lado. */
.filter-row {
  display: grid;
  gap: 0.375rem;
  min-width: 0;
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

.result-count {
  font-size: var(--step--1);
}

/* ---- Grade de cartões: uma coluna no celular e até quatro no computador. A skin fica à esquerda,
   no palco da cor da raridade, como no inventário do jogo. */
.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 17.5rem), 1fr));
  gap: 0.75rem;
  margin-top: -0.5rem;
}

.tile {
  position: relative;
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius-m);
  background: var(--surface);
}

.tile:hover {
  border-color: var(--field-line);
}

.tile-main {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  grid-template-areas:
    'thumb name'
    'price price'
    'tags tags';
  align-content: start;
  align-items: center;
  gap: 0.625rem 0.75rem;
  width: 100%;
  height: 100%;
  padding: 0.75rem;
  border: 0;
  border-radius: var(--radius-m);
  background: none;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.tile-main:focus-visible {
  outline-offset: -2px;
}

.tile-main:hover .tile-title {
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

/* Espaço à direita para o olho, que fica no canto do cartão. */
.tile-name {
  grid-area: name;
  display: grid;
  min-width: 0;
  padding-right: 2.75rem;
}

.tile-kind,
.tile-meta {
  overflow: hidden;
  color: var(--muted);
  font-size: var(--step--1);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.tile-meta {
  font-variant-numeric: tabular-nums;
}

.tile-title {
  overflow: hidden;
  font-size: var(--step-1);
  font-stretch: var(--semi);
  font-weight: 640;
  line-height: 1.2;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.tile-price {
  grid-area: price;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.5rem;
  padding-top: 0.625rem;
  border-top: 1px solid var(--line);
  font-variant-numeric: tabular-nums;
}

.tile-values {
  display: grid;
  min-width: 0;
}

.tile-seller {
  font-size: var(--step-1);
  font-weight: 650;
  white-space: nowrap;
}

.tile-standard,
.tile-source {
  color: var(--muted);
  font-size: var(--step--1);
}

.tile-source {
  flex: none;
}

.tile-tags {
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

/* Oculto: o cartão fica apagado e tracejado, mas continua fácil de achar e de mostrar de novo. */
.tile.is-hidden {
  border-style: dashed;
  background: transparent;
}

.tile.is-hidden .thumb img,
.tile.is-hidden .tile-title,
.tile.is-hidden .tile-seller {
  opacity: 0.55;
}

.eye {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--field-line);
  border-radius: var(--radius-m);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
}

.eye svg {
  width: 20px;
  height: 20px;
}

.eye[aria-pressed='false'] {
  border-style: dashed;
  background: transparent;
  color: var(--muted);
}

.eye:hover {
  background: var(--surface-2);
}

.eye:disabled {
  opacity: 0.6;
  cursor: default;
}

.empty {
  display: grid;
  justify-items: start;
  gap: 0.75rem;
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

/* Celular: uma coluna só, então o cartão fica baixo. Preço e etiquetas vão ao lado da foto, embaixo
   do nome, e a lista mostra mais itens por tela. */
@media (max-width: 39.99rem) {
  .tiles {
    gap: 0.5rem;
  }

  .tile-main {
    grid-template-columns: 80px minmax(0, 1fr);
    grid-template-areas:
      'thumb name'
      'thumb price'
      'thumb tags';
    align-items: start;
    gap: 0.375rem 0.75rem;
    padding: 0.625rem;
  }

  .tile-price {
    padding-top: 0;
    border-top: 0;
  }
}

/* Computador: o nome do filtro à esquerda e os chips quebrando linha. */
@media (min-width: 48rem) {
  .filter-row {
    grid-template-columns: 5.5rem minmax(0, 1fr);
    align-items: start;
    gap: 0.75rem;
  }

  .filter-row > .filter-label {
    padding-top: 0.625rem;
  }

  .chips {
    flex-wrap: wrap;
    margin-inline: 0;
    padding-inline: 0;
  }
}
</style>
