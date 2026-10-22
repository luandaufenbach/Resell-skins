<script setup>
// Aba "Preços" do painel: desconto padrão sobre a Steam e arredondamento, com o resultado em três
// itens do próprio inventário (o mais barato, o do meio e o mais caro). Itens com preço manual
// não mudam.
const props = defineProps({
  store: { type: Object, required: true },
})
const emit = defineEmits(['update'])

const { busy, act, problemFor } = usePanelAction((store) => emit('update', store))
const { data, status, refresh } = usePanelItems()
const loadingItems = computed(() => !data.value && status.value !== 'error')

const discount = ref(props.store.pricing.discount)
const rounding = ref(props.store.pricing.rounding)
const saved = ref(false)
watch([discount, rounding], () => (saved.value = false))

const validDiscount = computed(() => Number.isInteger(discount.value) && discount.value >= 0 && discount.value <= MAX_DISCOUNT * 100)
const changed = computed(
  () => discount.value !== props.store.pricing.discount || rounding.value !== props.store.pricing.rounding,
)

// Exemplos: três itens com preço Steam e sem preço manual (esses não mudam); sem nenhum, três valores.
const samples = computed(() => {
  const priced = (data.value?.items ?? [])
    .filter((item) => item.steam && item.price == null && !item.ask)
    .sort((a, b) => a.steam - b.steam)
  if (!priced.length) {
    return [12.4, 123.47, 1234.56].map((steam, i) => ({ id: `exemplo-${i}`, name: null, steam }))
  }
  const picks = [priced[0], priced[Math.floor(priced.length / 2)], priced.at(-1)]
  return [...new Map(picks.map((item) => [item.id, item])).values()].map((item) => ({
    id: item.id,
    name: item.marketName,
    steam: item.steam,
    estimated: item.estimated,
  }))
})

const result = (steam) => (validDiscount.value ? sellerPrice(steam, discount.value / 100, rounding.value) : null)
const example = (id) => {
  if (loadingItems.value) return '…'
  const steam = samples.value[1]?.steam ?? 123.47
  return validDiscount.value ? formatBRL(sellerPrice(steam, discount.value / 100, id)) : '—'
}

async function save() {
  saved.value = false
  if (!validDiscount.value) return
  const response = await act('precos', '/api/painel/precos', { body: { discount: discount.value, rounding: rounding.value } })
  if (!response) return
  saved.value = true
  refresh()
}

function onDiscountInput(event) {
  const value = event.target.value === '' ? NaN : Number(event.target.value)
  discount.value = Number.isFinite(value) ? Math.round(value) : NaN
}
</script>

<template>
  <form class="pricing" novalidate @submit.prevent="save">
    <div class="pricing-intro">
      <h2 class="block-title">Preços</h2>
      <p class="muted">
        O preço de cada item é o da Steam menos o seu desconto, arredondado para baixo. Itens com preço manual ou sob
        consulta não mudam.
      </p>
    </div>

    <fieldset class="group">
      <legend>Desconto padrão</legend>
      <div class="discount">
        <label class="discount-number">
          <span class="visually-hidden">Desconto em porcentagem</span>
          <input
            :value="Number.isNaN(discount) ? '' : discount"
            type="number"
            inputmode="numeric"
            min="0"
            :max="MAX_DISCOUNT * 100"
            step="1"
            :aria-invalid="validDiscount ? undefined : 'true'"
            @input="onDiscountInput"
          />
          <span aria-hidden="true">%</span>
        </label>
        <input
          v-model.number="discount"
          class="discount-range"
          type="range"
          min="0"
          :max="MAX_DISCOUNT * 100"
          step="1"
          aria-label="Desconto em porcentagem"
        />
      </div>
      <p class="field-hint">Abaixo do preço da Steam. De 0% a {{ MAX_DISCOUNT * 100 }}%.</p>
      <FormProblem v-if="!validDiscount" :problem="accountMessage({ data: { code: 'DISCOUNT_INVALID' } })" />
    </fieldset>

    <fieldset class="group">
      <legend>Arredondamento</legend>
      <div class="roundings">
        <label v-for="r in ROUNDINGS" :key="r.id" class="rounding">
          <input v-model="rounding" type="radio" name="arredondamento" :value="r.id" />
          <span class="rounding-label">{{ r.label }}</span>
          <span class="rounding-example">{{ example(r.id) }}</span>
        </label>
      </div>
      <p class="field-hint">
        Se arredondar tirasse mais de 10% de um preço baixo, ele fica com os centavos (ou no real inteiro, no caso do
        múltiplo de 5).
      </p>
    </fieldset>

    <section class="group samples-group" aria-labelledby="exemplos">
      <h3 id="exemplos" class="group-title">
        {{ loadingItems || samples[0]?.name ? 'Como fica no seu inventário' : 'Exemplos' }}
      </h3>
      <p v-if="loadingItems" class="muted" role="status">Carregando os itens…</p>
      <table v-else class="samples">
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Steam</th>
            <th scope="col">Seu preço</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in samples" :key="s.id">
            <th scope="row">{{ s.name ?? 'Exemplo' }}</th>
            <td>{{ s.estimated ? '≈ ' : '' }}{{ formatBRL(s.steam) }}</td>
            <td class="samples-result">{{ result(s.steam) != null ? formatBRL(result(s.steam)) : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <FormProblem v-if="problemFor('precos')" :problem="problemFor('precos')" />
    <div class="save-row">
      <button class="btn btn--primary" type="submit" :disabled="busy === 'precos' || !validDiscount || !changed">
        {{ busy === 'precos' ? 'Salvando…' : 'Salvar preços' }}
      </button>
      <p v-if="saved" class="done" role="status">Salvo. A loja já mostra os preços novos.</p>
    </div>
  </form>
</template>

<style scoped>
.pricing {
  display: grid;
  gap: 1.75rem;
  max-width: 40rem;
}

/* Computador: desconto e arredondamento à esquerda, exemplos presos à direita. */
@media (min-width: 64rem) {
  .pricing {
    grid-template-columns: minmax(0, 36rem) minmax(0, 34rem);
    column-gap: 3.5rem;
    max-width: none;
  }

  .pricing > * {
    grid-column: 1;
  }

  .pricing > .samples-group {
    position: sticky;
    top: 1.5rem;
    grid-column: 2;
    grid-row: 1 / span 4;
    align-self: start;
    padding: 1.25rem 1rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-m);
    background: var(--surface);
  }
}

.pricing-intro {
  display: grid;
  gap: 0.5rem;
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

.group {
  display: grid;
  gap: 0.75rem;
  min-width: 0;
  margin: 0;
  padding: 1.5rem 0 0;
  border: 0;
  border-top: 1px solid var(--line);
}

.group legend,
.group-title {
  float: left;
  width: 100%;
  padding: 0;
  font-size: var(--step-1);
  font-stretch: var(--semi);
  font-weight: 680;
}

/* O número grande e condensado, como o contador de munição do jogo. */
.discount {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.5rem;
}

.discount-number {
  display: inline-flex;
  align-items: baseline;
  gap: 0.125rem;
  padding: 0 0.75rem;
  border: 1px solid var(--field-line);
  border-radius: var(--radius-m);
  background: var(--stage);
  font-size: var(--step-3);
  font-stretch: var(--narrow);
  font-weight: 760;
}

.discount-number:focus-within {
  border-color: var(--accent-edge);
  outline: 2px solid var(--accent-edge);
  outline-offset: 0;
}

.discount-number:has([aria-invalid='true']) {
  border-color: var(--alert);
}

.discount-number input {
  width: 2.6ch;
  min-height: 56px;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-variant-numeric: tabular-nums;
  text-align: right;
  outline: none;
  appearance: textfield;
}

.discount-number input::-webkit-inner-spin-button,
.discount-number input::-webkit-outer-spin-button {
  appearance: none;
  margin: 0;
}

.discount-range {
  flex: 1 1 12rem;
  min-height: 44px;
  accent-color: var(--accent);
}

.roundings {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 8.5rem), 1fr));
  gap: 0.5rem;
}

.rounding {
  position: relative;
  display: grid;
  gap: 0.125rem;
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--field-line);
  border-radius: var(--radius-m);
  cursor: pointer;
}

.rounding input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.rounding:has(input:checked) {
  border-color: var(--accent-edge);
  box-shadow: inset 0 0 0 1px var(--accent-edge);
}

.rounding:has(input:focus-visible) {
  outline: 2px solid var(--accent-edge);
  outline-offset: 2px;
}

.rounding-label {
  font-stretch: var(--semi);
  font-weight: 620;
}

.rounding-example {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.rounding:has(input:checked) .rounding-example {
  color: var(--text);
}


.samples {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}

.samples th,
.samples td {
  padding: 0.625rem 0;
  border-bottom: 1px solid var(--line);
  text-align: right;
  vertical-align: top;
}

.samples thead th {
  color: var(--muted);
  font-size: var(--step--1);
  font-weight: 500;
}

.samples th:first-child {
  padding-right: 1rem;
  text-align: left;
}

.samples tbody th {
  font-weight: 560;
  overflow-wrap: anywhere;
}

.samples td + td {
  padding-left: 1rem;
}

.samples-result {
  font-weight: 650;
  white-space: nowrap;
}

.samples td:nth-child(2) {
  color: var(--muted);
  white-space: nowrap;
}

.save-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
}

.done {
  font-weight: 560;
}
</style>
