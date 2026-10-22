<script setup>
// Pagamentos de um mês, do mais novo ao mais antigo, com o total no topo. O total vem do servidor
// somando as mesmas linhas da lista, então os dois sempre batem.
const props = defineProps({
  data: { type: Object, default: null },
  pending: { type: Boolean, default: false },
})
const month = defineModel('month', { type: String, required: true })
const emit = defineEmits(['open', 'retry'])

const thisMonth = currentMonth()
const canGoForward = computed(() => month.value < thisMonth)
const payments = computed(() => (props.data?.month === month.value ? props.data.payments : null))
const total = computed(() => (props.data?.month === month.value ? props.data.total : null))
</script>

<template>
  <section class="payments" aria-labelledby="pagamentos-mes">
    <div class="month">
      <button
        class="btn month-step"
        type="button"
        :aria-label="`Ver ${monthLabel(shiftMonth(month, -1))}`"
        @click="month = shiftMonth(month, -1)"
      >
        <AppIcon name="chevron-left" />
      </button>
      <h2 id="pagamentos-mes" class="month-name">{{ monthLabel(month) }}</h2>
      <button
        class="btn month-step"
        type="button"
        :disabled="!canGoForward"
        :aria-label="`Ver ${monthLabel(shiftMonth(month, 1))}`"
        @click="month = shiftMonth(month, 1)"
      >
        <AppIcon name="chevron-right" />
      </button>
    </div>

    <div class="total" aria-live="polite">
      <template v-if="total != null">
        <span class="total-value display">{{ formatBRL(total) }}</span>
        <span v-if="payments.length" class="muted">
          recebidos em {{ payments.length === 1 ? '1 pagamento' : `${payments.length} pagamentos` }}
        </span>
      </template>
      <span v-else-if="pending" class="muted">Carregando…</span>
    </div>

    <div v-if="!pending && !payments" class="empty">
      <p>Não deu para carregar os pagamentos deste mês.</p>
      <button class="btn" type="button" @click="emit('retry')">Tentar de novo</button>
    </div>
    <p v-else-if="payments && !payments.length" class="empty">
      Nenhum pagamento registrado em {{ monthLabel(month) }}. Para registrar, abra a loja na aba Lojas.
    </p>

    <table v-else-if="payments" class="table">
      <thead>
        <tr>
          <th scope="col">Data</th>
          <th scope="col">Loja</th>
          <th scope="col" class="num">Valor</th>
          <th scope="col">Período</th>
          <th scope="col">No ar até</th>
          <th scope="col">Observação</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in payments" :key="p.id" class="row">
          <td class="date">{{ formatDateTime(p.paidAt) }}</td>
          <td class="store">
            <button v-if="p.store" class="store-button" type="button" @click="emit('open', p.store.id)">
              {{ p.store.name || p.store.slug }}
            </button>
            <span v-else class="muted">Loja apagada</span>
          </td>
          <td class="num value">{{ formatBRL(p.value) }}</td>
          <td class="period">{{ p.months === 1 ? '1 mês' : '3 meses' }}</td>
          <td class="until"><span class="m-label">até </span>{{ formatFullDate(p.paidUntil) }}</td>
          <td class="note">{{ p.note }}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" colspan="2">Total do mês</th>
          <td class="num value">{{ formatBRL(total) }}</td>
          <td colspan="3" />
        </tr>
      </tfoot>
    </table>
  </section>
</template>

<style scoped>
.payments {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.month {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.month-step {
  width: 44px;
  padding: 0;
}

.month-step svg {
  width: 20px;
  height: 20px;
}

/* No mês atual não há mês seguinte: o botão quase some, para não parecer que dá para avançar. */
.month-step:disabled {
  border-color: transparent;
  background: transparent;
  opacity: 0.35;
}

.month-name {
  min-width: 11rem;
  font-size: var(--step-1);
  font-stretch: var(--semi);
  font-weight: 650;
  text-align: center;
}

.month-name::first-letter {
  text-transform: uppercase;
}

.total {
  display: grid;
  gap: 0.25rem;
  min-height: 4rem;
}

.total-value {
  font-size: clamp(2.5rem, 11vw, 3.5rem);
  font-variant-numeric: tabular-nums;
}

.muted {
  color: var(--muted);
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

.table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}

.store-button {
  padding: 0;
  border: 0;
  background: none;
  color: var(--text);
  font-weight: 620;
  text-align: left;
  text-decoration: underline;
  text-decoration-color: var(--field-line);
  text-underline-offset: 3px;
  overflow-wrap: anywhere;
  cursor: pointer;
}

.store-button:hover {
  text-decoration-color: currentColor;
}

.value {
  font-weight: 650;
}

.note {
  color: var(--muted);
  overflow-wrap: anywhere;
}

/* Celular: cada pagamento é um bloco; o total vai no topo, então o rodapé da tabela sai. */
@media (max-width: 47.99rem) {
  .table thead,
  .table tfoot {
    display: none;
  }

  .table,
  .table tbody {
    display: block;
  }

  .row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'store value'
      'date period'
      'until until'
      'note note';
    gap: 0.125rem 0.75rem;
    padding: 0.75rem 0;
    border-top: 1px solid var(--line);
  }

  .row:last-child {
    border-bottom: 1px solid var(--line);
  }

  .row > td {
    display: block;
    min-width: 0;
  }

  .store {
    grid-area: store;
    min-height: 44px;
  }

  .store-button {
    min-height: 44px;
  }

  .value {
    grid-area: value;
    align-self: center;
  }

  .date {
    grid-area: date;
    color: var(--muted);
    font-size: var(--step--1);
  }

  .period {
    grid-area: period;
    color: var(--muted);
    font-size: var(--step--1);
    text-align: right;
  }

  .until {
    grid-area: until;
    color: var(--muted);
    font-size: var(--step--1);
  }

  .note {
    grid-area: note;
    font-size: var(--step--1);
  }

  .note:empty {
    display: none;
  }
}

@media (min-width: 48rem) {
  .table th {
    padding: 0 0.75rem 0.625rem;
    border-bottom: 1px solid var(--line);
    color: var(--muted);
    font-size: var(--step--1);
    font-weight: 560;
    text-align: left;
  }

  .table td {
    padding: 0.625rem 0.75rem;
    border-bottom: 1px solid var(--line);
    vertical-align: top;
  }

  .table th:first-child,
  .table td:first-child {
    padding-left: 0;
  }

  .table .num {
    text-align: right;
  }

  .date,
  .until,
  .period {
    white-space: nowrap;
  }

  .store-button {
    min-height: 24px;
  }

  .m-label {
    display: none;
  }

  .note {
    max-width: 22rem;
  }

  .table tfoot th,
  .table tfoot td {
    padding-top: 0.75rem;
    border-bottom: 0;
    color: var(--text);
    font-size: var(--step-0);
    font-weight: 650;
  }
}
</style>
