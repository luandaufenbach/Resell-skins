<script setup>
// Edição de um item no painel: mostrar ou ocultar, preço (padrão, manual ou sob consulta), custo e
// situação. Folha de baixo no celular, janela no computador, como a ficha do item na loja.
// O preço manual não apaga o padrão: os dois aparecem, e "Voltar ao padrão" limpa o manual.
const props = defineProps({
  item: { type: Object, default: null },
  // { discount (em %), rounding }
  pricing: { type: Object, required: true },
})
const emit = defineEmits(['close', 'saved'])

const dialog = ref(null)
const form = reactive({ hidden: false, price: '', ask: false, cost: '', status: null })
const problem = ref(null)
const saving = ref(false)

watch(
  () => props.item,
  async (item) => {
    if (item) {
      Object.assign(form, {
        hidden: item.hidden,
        price: moneyInput(item.price),
        ask: item.ask,
        cost: moneyInput(item.cost),
        status: item.status,
      })
      problem.value = null
    }
    await nextTick()
    if (!dialog.value) return
    if (item && !dialog.value.open) dialog.value.showModal()
    if (!item && dialog.value.open) dialog.value.close()
  },
)

function close() {
  dialog.value?.close()
}

function onBackdropClick(event) {
  if (event.target === dialog.value) close()
}

const { theme } = useTheme()
const rarityStyle = computed(() =>
  props.item
    ? {
        '--rarity': props.item.rarity.color,
        '--rarity-text': readableColor(props.item.rarity.color, [theme.value.bg, theme.value.surface]),
      }
    : null,
)

const manual = computed(() => form.price.trim() !== '')
const standardText = computed(() => {
  const item = props.item
  if (!item) return ''
  if (item.standard == null) return 'Sem preço Steam de referência: sem um preço seu, a loja mostra "Sob consulta".'
  return `Steam ${item.estimated ? '≈ ' : ''}${formatBRL(item.steam)} menos ${props.pricing.discount}%.`
})

const STATUSES = [
  { id: null, label: 'À venda' },
  { id: 'reservado', label: 'Reservado' },
  { id: 'vendido', label: 'Vendido' },
]

async function save() {
  problem.value = null
  const price = parseMoney(form.price)
  const cost = parseMoney(form.cost)
  if (Number.isNaN(price) || price === 0) return (problem.value = accountMessage({ data: { code: 'PRICE_INVALID' } }))
  if (Number.isNaN(cost)) return (problem.value = accountMessage({ data: { code: 'COST_INVALID' } }))

  saving.value = true
  try {
    const { item } = await $fetch(`/api/painel/itens/${props.item.id}`, {
      method: 'POST',
      body: { hidden: form.hidden, price, ask: form.ask, cost, status: form.status },
    })
    emit('saved', props.item.id, item)
    close()
  } catch (error) {
    if (errorCode(error) === 'AUTH_REQUIRED') return navigateTo('/entrar')
    problem.value = accountMessage(error)
  } finally {
    saving.value = false
  }
}

const fieldProblem = (field) => (problem.value?.field === field ? problem.value : null)
</script>

<template>
  <dialog ref="dialog" class="sheet" :style="rarityStyle" :aria-label="item?.marketName" @close="emit('close')" @click="onBackdropClick">
    <form v-if="item" class="editor" novalidate @submit.prevent="save">
      <div class="editor-head">
        <div class="thumb">
          <img v-if="item.image" :src="steamImage(item.image, '256fx192f')" alt="" width="128" height="96" />
        </div>
        <div class="editor-name">
          <p class="kind">
            <span v-if="item.star" class="star">★ </span>
            <span v-if="item.stattrak" class="stattrak">StatTrak™ </span>
            <span>{{ itemSubtitle(item) }}</span>
          </p>
          <h2 class="display editor-title">{{ itemTitle(item) }}</h2>
          <p v-if="item.wear" class="muted small">
            {{ wearLabel(item.wear) }}<template v-if="item.float != null">, float {{ formatFloat(item.float) }}</template>
          </p>
        </div>
        <button class="close" type="button" aria-label="Fechar" @click="close">
          <AppIcon name="close" />
        </button>
      </div>

      <label class="check">
        <input v-model="form.hidden" type="checkbox" :true-value="false" :false-value="true" />
        <span>
          Mostrar na loja
          <span class="muted small">Desligado, o item some da loja até você ligar de novo.</span>
        </span>
      </label>

      <fieldset class="group">
        <legend>Preço</legend>
        <div class="price-lines">
          <div class="price-line" :class="{ 'is-off': manual || form.ask }">
            <span class="muted">Padrão</span>
            <strong>{{ item.standard != null ? formatBRL(item.standard) : 'Sob consulta' }}</strong>
          </div>
          <p class="muted small">{{ standardText }}</p>
        </div>

        <label class="field">
          <span class="field-label">Seu preço <span class="field-optional">(opcional)</span></span>
          <span class="money" :class="{ 'is-invalid': fieldProblem('preco') }">
            <span aria-hidden="true">R$</span>
            <input
              v-model="form.price"
              inputmode="decimal"
              autocomplete="off"
              :disabled="form.ask"
              :placeholder="form.ask ? '' : '0,00'"
              :aria-invalid="fieldProblem('preco') ? 'true' : undefined"
            />
          </span>
        </label>
        <button v-if="manual && !form.ask" class="link-button" type="button" @click="form.price = ''">
          Voltar ao padrão ({{ item.standard != null ? formatBRL(item.standard) : 'sob consulta' }})
        </button>
        <FormProblem v-if="fieldProblem('preco')" :problem="fieldProblem('preco')" />

        <label class="check">
          <input v-model="form.ask" type="checkbox" />
          <span>
            Sob consulta
            <span class="muted small">A loja não mostra o preço; o cliente pergunta no WhatsApp.</span>
          </span>
        </label>
      </fieldset>

      <label class="field">
        <span class="field-label">Custo <span class="field-optional">(opcional)</span></span>
        <span class="money" :class="{ 'is-invalid': fieldProblem('custo') }">
          <span aria-hidden="true">R$</span>
          <input
            v-model="form.cost"
            inputmode="decimal"
            autocomplete="off"
            placeholder="0,00"
            :aria-invalid="fieldProblem('custo') ? 'true' : undefined"
          />
        </span>
        <span class="field-hint">
          Quanto você pagou{{ item.quantity > 1 ? ' por unidade' : '' }}. Só você vê: nunca aparece na loja.
        </span>
      </label>
      <FormProblem v-if="fieldProblem('custo')" :problem="fieldProblem('custo')" />

      <fieldset class="group">
        <legend>Situação</legend>
        <div class="segments">
          <label v-for="s in STATUSES" :key="String(s.id)" class="segment">
            <input v-model="form.status" type="radio" name="situacao" :value="s.id" />
            <span>{{ s.label }}</span>
          </label>
        </div>
        <p class="muted small">
          Reservado e vendido aparecem com etiqueta na loja. O vendido sai quando você atualizar o inventário depois
          da troca.
        </p>
      </fieldset>

      <FormProblem v-if="problem && !problem.field" :problem="problem" />
      <div class="editor-actions">
        <button class="btn btn--primary" type="submit" :disabled="saving">{{ saving ? 'Salvando…' : 'Salvar' }}</button>
        <button class="btn" type="button" @click="close">Cancelar</button>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.sheet {
  width: 100%;
  max-width: 100%;
  max-height: 92dvh;
  margin: auto 0 0;
  padding: 0;
  border: 0;
  border-radius: var(--radius-l) var(--radius-l) 0 0;
  background: var(--surface);
  color: var(--text);
}

.sheet::backdrop {
  background: var(--backdrop, rgb(12 15 20 / 0.72));
}

@media (min-width: 48rem) {
  .sheet {
    width: min(34rem, calc(100% - 4rem));
    margin: auto;
    border-radius: var(--radius-l);
  }
}

.editor {
  display: grid;
  gap: 1.25rem;
  padding: 1rem var(--gutter) 1.5rem;
}

.editor-head {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) auto;
  gap: 0.875rem;
  align-items: center;
}

.thumb {
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
  object-fit: contain;
  padding: 6%;
}

.kind {
  overflow: hidden;
  color: var(--muted);
  font-size: var(--step--1);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.star {
  color: var(--rarity-text);
}

.stattrak {
  color: var(--stattrak);
}

.editor-title {
  font-size: var(--step-3);
  overflow-wrap: anywhere;
}

.close {
  display: grid;
  place-items: center;
  align-self: start;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: var(--radius-m);
  background: transparent;
  cursor: pointer;
}

.close svg {
  width: 22px;
  height: 22px;
}

.close:hover {
  background: var(--surface-2);
}

.muted {
  color: var(--muted);
}

.small {
  font-size: var(--step--1);
}

.group {
  display: grid;
  gap: 0.75rem;
  min-width: 0;
  margin: 0;
  padding: 1rem 0 0;
  border: 0;
  border-top: 1px solid var(--line);
}

.group legend {
  float: left;
  width: 100%;
  padding: 0;
  font-size: var(--step-1);
  font-stretch: var(--semi);
  font-weight: 680;
}

.price-lines {
  display: grid;
  gap: 0.125rem;
}

.price-line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  font-variant-numeric: tabular-nums;
}

.price-line strong {
  font-size: var(--step-1);
  font-weight: 650;
}

/* Com preço manual ou sob consulta, o padrão fica riscado: continua visível, mas não vale. */
.price-line.is-off strong {
  color: var(--muted);
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}

.money {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 48px;
  padding-left: 0.875rem;
  border: 1px solid var(--field-line);
  border-radius: var(--radius-m);
  background: var(--stage);
  color: var(--muted);
}

.money:focus-within {
  border-color: var(--accent-edge);
  outline: 2px solid var(--accent-edge);
  outline-offset: 0;
}

.money.is-invalid {
  border-color: var(--alert);
}

.money input {
  flex: 1;
  min-width: 0;
  min-height: 46px;
  padding-right: 0.875rem;
  border: 0;
  background: none;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  outline: none;
}

.money input::placeholder {
  color: var(--placeholder);
}

.money:has(input:disabled) {
  opacity: 0.55;
}

.check {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem;
  align-items: start;
  cursor: pointer;
}

.check input {
  width: 22px;
  height: 22px;
  margin: 1px 0 0;
  accent-color: var(--accent);
}

.check > span {
  display: grid;
  gap: 0.125rem;
  font-weight: 560;
}

.check .small {
  font-weight: 420;
}

.link-button {
  justify-self: start;
  min-height: 44px;
  margin-top: -0.5rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--text);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.segments {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid var(--field-line);
  border-radius: var(--radius-m);
}

.segment {
  position: relative;
}

.segment + .segment {
  border-left: 1px solid var(--field-line);
}

.segment input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.segment span {
  display: grid;
  place-items: center;
  min-height: 44px;
  padding: 0 0.5rem;
  font-stretch: var(--semi);
  font-weight: 600;
}

.segment input:checked + span {
  background: var(--accent);
  color: var(--accent-ink);
}

.segment:first-child input:checked + span {
  border-radius: var(--radius-m) 0 0 var(--radius-m);
}

.segment:last-child input:checked + span {
  border-radius: 0 var(--radius-m) var(--radius-m) 0;
}

.segment input:focus-visible + span {
  outline: 2px solid var(--accent-edge);
  outline-offset: 2px;
}

/* Salvar sempre à vista: preso no pé da folha enquanto o formulário rola. */
.editor-actions {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0 calc(var(--gutter) * -1) -1.5rem;
  padding: 0.75rem var(--gutter) 1rem;
  border-top: 1px solid var(--line);
  background: var(--surface);
}
</style>
