<script setup>
// Lista de lojas do admin, da mais urgente para a menos: o número grande é quantos dias faltam
// para o vencimento (ou quantos passaram), com a faixa da esquerda na cor da urgência. Tabela no
// computador; no celular, cada linha vira um bloco. Clicar abre o detalhe com as ações.
const props = defineProps({
  stores: { type: Array, required: true },
  config: { type: Object, default: null },
  host: { type: String, required: true },
})
const emit = defineEmits(['open'])

const FILTERS = [
  { id: 'todas', label: 'Todas', test: () => true },
  { id: 'cobrar', label: 'Cobrar', test: isDue },
  { id: 'teste', label: 'Teste grátis', test: (s) => s.status === 'teste' },
  { id: 'paga', label: 'Pagas', test: (s) => s.status === 'paga' },
  { id: 'vencida', label: 'Vencidas', test: (s) => s.status === 'vencida' },
  { id: 'pendente', label: 'Não verificadas', test: (s) => s.status === 'pendente' },
  { id: 'bloqueada', label: 'Bloqueadas', test: (s) => s.status === 'bloqueada' },
]

const SORTS = [
  { id: 'vencimento', label: 'Vencimento' },
  { id: 'novas', label: 'Mais novas' },
  { id: 'visitas', label: 'Mais visitas' },
]

const filter = ref('todas')
const sort = ref('vencimento')
const search = ref('')

const counts = computed(() => Object.fromEntries(FILTERS.map((f) => [f.id, props.stores.filter(f.test).length])))

// Vencimento: as não verificadas vão para o fim (não têm data); empate pelo nome do endereço.
const SORTERS = {
  vencimento: (a, b) =>
    (a.verified ? 0 : 1) - (b.verified ? 0 : 1) ||
    (Date.parse(a.paidUntil) || Infinity) - (Date.parse(b.paidUntil) || Infinity) ||
    a.slug.localeCompare(b.slug),
  novas: (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  visitas: (a, b) => b.visits - a.visits || b.clicks - a.clicks,
}

const visible = computed(() => {
  const test = FILTERS.find((f) => f.id === filter.value)?.test ?? (() => true)
  const words = normalizeText(search.value).split(/\s+/).filter(Boolean)
  const digits = search.value.replace(/\D/g, '')
  const list = props.stores.filter((s) => {
    if (!test(s)) return false
    if (!words.length) return true
    const text = normalizeText([s.name, s.slug, s.email].filter(Boolean).join(' '))
    return words.every((w) => text.includes(w)) || (digits.length >= 4 && s.whatsapp.includes(digits))
  })
  return list.sort(SORTERS[sort.value])
})

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

const emptyText = computed(() => {
  if (filter.value === 'todas') return 'Nenhuma loja com essa busca.'
  return search.value ? 'Nenhuma loja com essa busca neste filtro.' : 'Nenhuma loja neste filtro.'
})

// Volta ao começo da faixa de chips (no celular ela rola), para o chip "Todas" ficar à vista.
const filtersEl = ref(null)
function showAll() {
  filter.value = 'todas'
  search.value = ''
  filtersEl.value?.scrollTo({ left: 0 })
}
</script>

<template>
  <section class="stores" aria-label="Lojas">
    <div class="tools">
      <label class="search">
        <span class="visually-hidden">Buscar loja</span>
        <AppIcon name="search" />
        <input v-model="search" class="input" type="search" placeholder="Endereço, nome, e-mail ou WhatsApp" />
      </label>
      <label class="sort">
        <span class="sort-label">Ordem</span>
        <select v-model="sort" class="input">
          <option v-for="s in SORTS" :key="s.id" :value="s.id">{{ s.label }}</option>
        </select>
      </label>
    </div>

    <div ref="filtersEl" class="filters" role="group" aria-label="Filtrar lojas">
      <button
        v-for="f in FILTERS"
        :key="f.id"
        class="chip"
        type="button"
        :aria-pressed="filter === f.id"
        :disabled="f.id !== 'todas' && !counts[f.id] && filter !== f.id"
        @click="filter = f.id"
      >
        {{ f.label }}
        <span class="chip-count">{{ counts[f.id] }}</span>
      </button>
    </div>

    <p v-if="!stores.length" class="empty">
      Nenhuma loja ainda. Quando um revendedor criar a loja no painel, ela aparece aqui.
    </p>
    <div v-else-if="!visible.length" class="empty">
      <p>{{ emptyText }}</p>
      <button class="btn" type="button" @click="showAll">Ver todas</button>
    </div>

    <table v-else class="table">
      <thead>
        <tr>
          <th scope="col">Vence</th>
          <th scope="col">Loja</th>
          <th scope="col">Situação</th>
          <th scope="col">Plano</th>
          <th scope="col">Verificada</th>
          <th scope="col">Inventário</th>
          <th scope="col" class="num">Itens</th>
          <th scope="col" class="num">Visitas <span class="th-note">30 dias</span></th>
          <th scope="col" class="num">Cliques <span class="th-note">no WhatsApp, 30 dias</span></th>
          <th scope="col"><span class="visually-hidden">Cobrar</span></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="s in visible"
          :key="s.id"
          class="row"
          :class="[`tone-${dueFigure(s).tone}`, `status-${s.status}`]"
          @click="emit('open', s.id)"
        >
          <td class="due">
            <span class="due-figure display">{{ dueFigure(s).figure }}</span>
            <span class="due-unit">{{ dueFigure(s).unit }}</span>
          </td>
          <td class="name">
            <button class="name-button" type="button" @click.stop="emit('open', s.id)">
              {{ s.name || s.slug }}
            </button>
            <span class="sub">{{ host }}/{{ s.slug }}</span>
            <span class="sub email">{{ s.email || 'sem e-mail' }}</span>
          </td>
          <td class="status">{{ dueText(s) }}</td>
          <td class="plan">
            {{ PLAN_LABEL[s.plan.id] }} <span class="money">{{ s.plan.value ? formatPlanPrice(s.plan.value) : '—' }}</span>
          </td>
          <td class="verified">
            <template v-if="s.verified">
              {{ s.verifiedBy === 'admin' ? 'Pelo admin' : 'Pelo perfil' }}
              <span class="sub">{{ formatDate(s.verifiedAt) }}</span>
            </template>
            <span v-else class="sub">Não</span>
          </td>
          <td class="read">
            <span class="read-long">{{ s.readAt ? formatDateTime(s.readAt) : 'não lido' }}</span>
            <span class="read-short">{{ s.readAt ? `lido ${formatDate(s.readAt)}` : 'não lido' }}</span>
          </td>
          <td class="num items">{{ s.items }}<span class="m-label"> {{ s.items === 1 ? 'item' : 'itens' }}</span></td>
          <td class="num visits">{{ s.visits }}<span class="m-label"> {{ s.visits === 1 ? 'visita' : 'visitas' }}</span></td>
          <td class="num clicks">{{ s.clicks }}<span class="m-label"> {{ s.clicks === 1 ? 'clique' : 'cliques' }}</span></td>
          <td class="cta">
            <a
              v-if="isDue(s)"
              class="btn charge"
              :href="chargeLink(s, config, host)"
              target="_blank"
              rel="noopener"
              :aria-label="`Cobrar ${s.name || s.slug} no WhatsApp`"
              @click.stop
            >
              <AppIcon name="chat" />
              <span class="charge-text">Cobrar</span>
            </a>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="visible.length && visible.length !== stores.length" class="muted small">
      Mostrando {{ plural(visible.length, 'loja', 'lojas') }} de {{ stores.length }}.
    </p>
  </section>
</template>

<style scoped>
.stores {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.tools {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.5rem;
}

@media (min-width: 40rem) {
  .tools {
    grid-template-columns: minmax(0, 28rem) auto;
    justify-content: space-between;
  }
}

.search {
  position: relative;
  display: block;
}

.search svg {
  position: absolute;
  top: 50%;
  left: 0.875rem;
  width: 18px;
  height: 18px;
  color: var(--muted);
  transform: translateY(-50%);
  pointer-events: none;
}

.search .input {
  padding-left: 2.5rem;
}

.sort {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sort-label {
  color: var(--muted);
}

.sort .input {
  width: auto;
  min-width: 10rem;
}

/* Chips numa faixa que rola no celular, como os filtros da loja. */
.filters {
  display: flex;
  gap: 0.375rem;
  margin-inline: calc(var(--gutter) * -1);
  padding: 2px var(--gutter);
  overflow-x: auto;
  scrollbar-width: none;
}

.filters .chip {
  min-height: 44px;
}

/* A faixa rola: o anel de foco fica por dentro para não ser cortado. No chip ativo (fundo na cor de
   destaque) o anel usa a cor do texto dele, senão some. */
.filters .chip:focus-visible {
  outline-offset: -2px;
}

.filters .chip[aria-pressed='true']:focus-visible {
  outline-color: var(--accent-ink);
  outline-offset: -4px;
}

@media (min-width: 48rem) {
  .filters {
    flex-wrap: wrap;
    margin-inline: 0;
    padding-inline: 0;
  }
}

.empty {
  display: grid;
  gap: 0.75rem;
  justify-items: start;
  padding: 1.5rem 1rem;
  border: 1px dashed var(--field-line);
  border-radius: var(--radius-m);
  color: var(--muted);
}

.muted {
  color: var(--muted);
}

.small {
  font-size: var(--step--1);
}

/* ---- Tabela. Cores da urgência só na faixa da esquerda (não é texto): ouro para "vence em até
   5 dias", a cor de alerta para vencida, tracejado para não verificada e listrado para bloqueada. */
.table {
  --tone: var(--field-line);
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-variant-numeric: tabular-nums;
}

.row {
  --tone: var(--field-line);
  cursor: pointer;
}

.row.tone-soon {
  --tone: var(--warn);
}

.row.tone-late {
  --tone: var(--alert);
}

.due {
  position: relative;
}

.due::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
  background: var(--tone);
}

.row.tone-none .due::before {
  background: repeating-linear-gradient(var(--field-line) 0 5px, transparent 5px 9px);
}

.row.status-bloqueada .due::before {
  background: repeating-linear-gradient(-45deg, var(--alert) 0 3px, transparent 3px 6px);
  width: 6px;
}

.due-figure {
  display: block;
  font-size: var(--step-3);
  line-height: 0.9;
}

.row.tone-late .due-figure {
  color: var(--alert);
}

.row.tone-none .due-figure,
.row.status-bloqueada .due-figure {
  color: var(--muted);
}

.due-unit {
  display: block;
  margin-top: 0.25rem;
  color: var(--muted);
  font-size: var(--step--1);
  line-height: 1.2;
}

.name-button {
  display: block;
  min-height: 24px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--text);
  font-size: var(--step-1);
  font-stretch: var(--semi);
  font-weight: 650;
  line-height: 1.2;
  text-align: left;
  overflow-wrap: anywhere;
  cursor: pointer;
}

.name-button:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.sub {
  display: block;
  color: var(--muted);
  font-size: var(--step--1);
  overflow-wrap: anywhere;
}

.money {
  font-weight: 600;
}

.charge {
  min-height: 44px;
  padding-inline: 0.875rem;
}

/* ---- Celular: cada linha é um bloco com o número à esquerda. */
@media (max-width: 63.99rem) {
  .table thead {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .table,
  .table tbody {
    display: block;
  }

  .row {
    display: grid;
    /* Coluna do Cobrar sempre com 44px, tenha ou não o botão: os blocos ficam alinhados. */
    grid-template-columns: 4.25rem repeat(3, minmax(0, 1fr)) 44px;
    grid-template-areas:
      'due name name name cta'
      'due status status status cta'
      'due plan plan read read'
      'due items visits clicks clicks';
    gap: 0.25rem 0.5rem;
    padding: 0.875rem 0;
    border-top: 1px solid var(--line);
  }

  .row:last-child {
    border-bottom: 1px solid var(--line);
  }

  .row > td {
    display: block;
    min-width: 0;
  }

  .due {
    grid-area: due;
    padding-left: 0.875rem;
  }

  .name {
    grid-area: name;
  }

  .name .email {
    display: none;
  }

  .status {
    grid-area: status;
  }

  .plan {
    grid-area: plan;
    font-size: var(--step--1);
  }

  .verified {
    display: none !important;
  }

  .read {
    grid-area: read;
    color: var(--muted);
    font-size: var(--step--1);
    text-align: right;
    white-space: nowrap;
  }

  .read-long {
    display: none;
  }

  .items {
    grid-area: items;
  }

  .visits {
    grid-area: visits;
  }

  .clicks {
    grid-area: clicks;
  }

  .items,
  .visits,
  .clicks {
    margin-top: 0.25rem;
    font-size: var(--step--1);
  }

  .m-label {
    color: var(--muted);
  }

  .items .m-label,
  .visits .m-label,
  .clicks .m-label {
    margin-left: 0.25em;
  }

  .cta {
    grid-area: cta;
    align-self: start;
  }

  /* No celular o botão fica só com o ícone, para o nome da loja ter espaço. */
  .charge-text {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .charge {
    width: 44px;
    padding: 0;
  }
}

/* ---- Computador: tabela de verdade, densa, uma loja por linha. */
@media (min-width: 64rem) {
  .table th {
    padding: 0 0.75rem 0.625rem;
    border-bottom: 1px solid var(--line);
    color: var(--muted);
    font-size: var(--step--1);
    font-weight: 560;
    line-height: 1.2;
    text-align: left;
    vertical-align: bottom;
  }

  .th-note {
    display: block;
    font-weight: 420;
  }

  /* Larga o bastante para "30 dias" numa linha; a nota dos cliques quebra em duas. */
  .table th.num {
    min-width: 5.5rem;
  }

  .read-short {
    display: none;
  }

  .table td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--line);
    vertical-align: top;
  }

  .table th:first-child,
  .table td:first-child {
    padding-left: 1rem;
  }

  .table .num {
    text-align: right;
  }

  .row:hover > td {
    background: var(--surface);
  }

  .due {
    width: 6rem;
  }

  .name {
    min-width: 12rem;
    max-width: 18rem;
  }

  /* Endereço e e-mail numa linha só: o texto inteiro aparece no detalhe da loja. */
  .name .sub {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .status,
  .plan,
  .read,
  .verified {
    white-space: nowrap;
  }

  .m-label {
    display: none;
  }

  .cta {
    width: 1%;
    white-space: nowrap;
  }
}

/* Computador estreito: sai a coluna Verificada (a situação já diz "Não verificada") e o botão de
   cobrar fica só com o ícone. */
@media (min-width: 64rem) and (max-width: 79.99rem) {
  .table th,
  .table td {
    padding-inline: 0.5rem;
  }

  .table th:nth-child(5),
  .verified {
    display: none;
  }

  .charge {
    width: 44px;
    padding: 0;
  }

  .charge-text {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
}
</style>
