<script setup>
// Detalhe de uma loja no admin: dados, cobrança no WhatsApp, registrar pagamento, verificar,
// fundador, bloqueio, observação e os pagamentos dela. Folha de baixo no celular, painel na
// lateral no computador. Registrar pagamento e bloquear pedem confirmação: não há como desfazer
// pelo site.
const props = defineProps({
  store: { type: Object, default: null },
  config: { type: Object, default: null },
  host: { type: String, required: true },
  // Lojas marcadas como fundadoras agora, para mostrar as vagas usadas.
  foundersUsed: { type: Number, default: 0 },
})
const emit = defineEmits(['close', 'update', 'paid'])

const dialog = ref(null)
const busy = ref(null)
const problem = ref(null)
const done = ref(null)
const confirming = ref(null)

const payment = reactive({ months: 1, value: '', note: '' })
const note = ref('')
const history = ref(null)
const historyProblem = ref(null)

// Abre e fecha junto com a loja escolhida; trocar de loja limpa os formulários.
watch(
  () => props.store?.id,
  async (id) => {
    if (id) {
      problem.value = null
      done.value = null
      confirming.value = null
      payment.months = props.store.plan.id === 'trimestral' ? 3 : 1
      payment.value = moneyInput(expectedValue(props.store, payment.months, props.config))
      payment.note = ''
      note.value = props.store.note
      loadHistory(id)
    }
    await nextTick()
    if (!dialog.value) return
    if (id && !dialog.value.open) dialog.value.showModal()
    if (!id && dialog.value.open) dialog.value.close()
  },
)

function close() {
  dialog.value?.close()
}

function onBackdropClick(event) {
  if (event.target === dialog.value) close()
}

async function loadHistory(id) {
  history.value = null
  historyProblem.value = null
  try {
    const result = await $fetch('/api/admin/pagamentos', { query: { loja: id } })
    if (props.store?.id === id) history.value = result
  } catch (error) {
    historyProblem.value = adminMessage(error)
  }
}

/** Chama uma ação da loja; devolve a loja atualizada (ou null com o erro guardado). */
async function act(name, path, body = {}) {
  problem.value = null
  done.value = null
  busy.value = name
  try {
    const { store } = await $fetch(`/api/admin/lojas/${props.store.id}/${path}`, { method: 'POST', body })
    return store
  } catch (error) {
    problem.value = { action: name, ...adminMessage(error) }
    return null
  } finally {
    busy.value = null
  }
}

const problemFor = (name) => (problem.value?.action === name ? problem.value : null)

// ---- Cobrança
const chargeable = computed(() => Boolean(props.store?.verified && !props.store.blockedAt))
const charge = computed(() => (props.store ? chargeLink(props.store, props.config, props.host) : null))
const message = computed(() => (props.store ? chargeMessage(props.store, props.config, props.host) : ''))

// ---- Pagamento
function setMonths(months) {
  payment.months = months
  payment.value = moneyInput(expectedValue(props.store, months, props.config))
  confirming.value = null
}

const paymentValue = computed(() => parseMoney(payment.value))
const newDue = computed(() => (props.store ? nextDue(props.store, payment.months) : null))
const planChange = computed(() => {
  const plan = payment.months === 3 ? 'trimestral' : 'mensal'
  return props.store && plan !== props.store.plan.id ? plan : null
})

function askPayment() {
  problem.value = null
  done.value = null
  const value = paymentValue.value
  if (value == null || Number.isNaN(value) || value <= 0) {
    problem.value = { action: 'pagamento', ...adminMessage({ data: { code: 'PAYMENT_VALUE' } }) }
    return
  }
  confirming.value = 'pagamento'
}

async function registerPayment() {
  const value = paymentValue.value
  const store = await act('pagamento', 'pagamento', {
    meses: payment.months,
    valor: value,
    observacao: payment.note,
  })
  confirming.value = null
  if (!store) return
  emit('paid', store)
  done.value = {
    action: 'pagamento',
    text: `Pagamento de ${formatBRL(value)} registrado. A loja fica no ar até ${formatFullDate(store.paidUntil)}.`,
  }
  payment.note = ''
  loadHistory(store.id)
}

// ---- Fundador, verificação, bloqueio e observação
const founderValue = computed(() =>
  props.store ? planValue(props.store.plan.id, !props.store.founder, props.config) : null,
)
const seats = computed(() => props.config?.founders?.seats ?? null)
const founderText = computed(() => {
  const store = props.store
  if (!store) return ''
  const parts = [
    store.founder
      ? 'Esta loja é fundadora.'
      : 'Desconto para os primeiros assinantes, enquanto mantiverem a assinatura.',
  ]
  if (founderValue.value) {
    const plan = PLAN_LABEL[store.plan.id]?.toLowerCase() ?? store.plan.id
    parts.push(
      `${store.founder ? 'Tirando, o valor volta para' : 'Marcando, o valor passa para'} ${formatPlanPrice(founderValue.value)} no plano ${plan}.`,
    )
  }
  if (seats.value) parts.push(`Vagas usadas: ${props.foundersUsed} de ${seats.value}.`)
  return parts.join(' ')
})

async function toggleFounder() {
  const store = await act('fundador', 'fundador', { fundador: !props.store.founder })
  if (store) emit('update', store)
}

async function verify() {
  // Vai junto o SteamID da tela: o servidor só verifica se a loja ainda tem esse inventário.
  const store = await act('verificar', 'verificar', { steamid: props.store.steamid })
  if (!store) return
  emit('update', store)
  done.value = {
    action: 'verificar',
    text: store.trialUsed
      ? 'Loja verificada, sem teste grátis: o SteamID, o e-mail ou o WhatsApp já tinha usado um.'
      : `Loja verificada. Teste grátis até ${formatFullDate(store.paidUntil)}.`,
  }
}

async function setBlocked(blocked) {
  const store = await act('bloqueio', 'bloqueio', { bloqueada: blocked })
  confirming.value = null
  if (store) emit('update', store)
}

async function saveNote() {
  const store = await act('observacao', 'observacao', { texto: note.value })
  if (!store) return
  emit('update', store)
  note.value = store.note
  done.value = { action: 'observacao', text: store.note ? 'Observação salva.' : 'Observação apagada.' }
}

const doneFor = (name) => (done.value?.action === name ? done.value.text : null)
const figure = computed(() => (props.store ? dueFigure(props.store) : null))
const profileUrl = computed(() => `https://steamcommunity.com/profiles/${props.store?.steamid}`)
</script>

<template>
  <dialog
    ref="dialog"
    class="sheet"
    :aria-label="store ? `Loja ${store.name || store.slug}` : undefined"
    @close="emit('close')"
    @click="onBackdropClick"
  >
    <div v-if="store" class="detail" :class="[`tone-${figure.tone}`, `status-${store.status}`]">
      <div class="detail-head">
        <div class="due">
          <span class="due-figure display">{{ figure.figure }}</span>
          <span class="due-unit">{{ figure.unit }}</span>
        </div>
        <div class="detail-name">
          <h2 class="display detail-title">{{ store.name || store.slug }}</h2>
          <p class="muted">{{ host }}/{{ store.slug }}</p>
        </div>
        <button class="close" type="button" aria-label="Fechar" @click="close">
          <AppIcon name="close" />
        </button>
      </div>

      <p class="state">{{ dueText(store) }}</p>

      <!-- Loja não verificada ainda não tem vencimento, e a bloqueada não volta com o Pix: não há o
           que cobrar. -->
      <div class="actions">
        <a
          v-if="chargeable"
          class="btn"
          :class="{ 'btn--primary': isDue(store) }"
          :href="charge"
          target="_blank"
          rel="noopener"
        >
          <AppIcon name="chat" />
          Cobrar no WhatsApp
        </a>
        <a class="btn" :href="`/${store.slug}`" target="_blank" rel="noopener">
          <AppIcon name="external" />
          Abrir a loja
        </a>
      </div>
      <details v-if="chargeable" class="message">
        <summary>Ver a mensagem de cobrança</summary>
        <p>{{ message }}</p>
        <p v-if="!config?.pix" class="muted small">
          Sem chave Pix na configuração (pix_dono), a mensagem não leva a chave.
        </p>
      </details>

      <dl class="facts">
        <div>
          <dt>Plano</dt>
          <dd>
            {{ PLAN_LABEL[store.plan.id] }}, {{ store.plan.value ? formatPlanPrice(store.plan.value) : 'sem valor' }}
            <template v-if="store.founder"> (fundador)</template>
          </dd>
        </div>
        <div>
          <dt>E-mail</dt>
          <dd>{{ store.email || '—' }}</dd>
        </div>
        <div>
          <dt>WhatsApp</dt>
          <dd>{{ formatPhone(store.whatsapp) }}</dd>
        </div>
        <div>
          <dt>Verificada</dt>
          <dd>
            <template v-if="store.verified">
              {{ store.verifiedBy === 'admin' ? 'Pelo admin' : 'Pelo perfil' }} em {{ formatFullDate(store.verifiedAt) }}
            </template>
            <template v-else>Não</template>
          </dd>
        </div>
        <div>
          <dt>Inventário</dt>
          <dd>
            {{ store.items === 1 ? '1 item' : `${store.items} itens` }}<template v-if="store.readAt">,
              lido em {{ formatDateTime(store.readAt) }}</template>
          </dd>
        </div>
        <div>
          <dt>Últimos 30 dias</dt>
          <dd>
            {{ store.visits === 1 ? '1 visita' : `${store.visits} visitas` }},
            {{ store.clicks === 1 ? '1 clique' : `${store.clicks} cliques` }} no WhatsApp
          </dd>
        </div>
        <div>
          <dt>SteamID</dt>
          <dd>
            <a :href="profileUrl" target="_blank" rel="noopener">{{ store.steamid }}</a>
          </dd>
        </div>
        <div>
          <dt>Criada em</dt>
          <dd>{{ formatFullDate(store.createdAt) }}</dd>
        </div>
      </dl>

      <!-- Verificar: só para loja que ainda não está -->
      <section v-if="!store.verified" class="group" aria-labelledby="admin-verificar">
        <h3 id="admin-verificar" class="group-title">Verificar a loja</h3>
        <p class="muted small">
          Para quando o revendedor não consegue pôr o código no perfil e você conferiu de outro jeito que o
          inventário é dele. A loja fica pública e começa o teste grátis de 7 dias, se o SteamID, o e-mail e o
          WhatsApp ainda não usaram um.
        </p>
        <button class="btn" type="button" :disabled="busy === 'verificar'" @click="verify">
          {{ busy === 'verificar' ? 'Verificando…' : 'Verificar loja' }}
        </button>
        <FormProblem v-if="problemFor('verificar')" :problem="problemFor('verificar')" />
      </section>

      <!-- Pagamento -->
      <section class="group" aria-labelledby="admin-pagamento">
        <h3 id="admin-pagamento" class="group-title">Registrar pagamento</h3>
        <p v-if="doneFor('verificar')" class="done" role="status">{{ doneFor('verificar') }}</p>
        <template v-if="store.verified">
          <div class="segments" role="radiogroup" aria-label="Período">
            <label v-for="m in [1, 3]" :key="m" class="segment">
              <input type="radio" name="periodo" :checked="payment.months === m" @change="setMonths(m)" />
              <span>{{ m === 1 ? '1 mês' : '3 meses' }}</span>
            </label>
          </div>
          <label class="field">
            <span class="field-label">Valor recebido</span>
            <span class="money-field" :class="{ 'is-invalid': problemFor('pagamento')?.field === 'valor' }">
              <span aria-hidden="true">R$</span>
              <input
                v-model="payment.value"
                inputmode="decimal"
                autocomplete="off"
                placeholder="0,00"
                :aria-invalid="problemFor('pagamento')?.field === 'valor' ? 'true' : undefined"
                @input="confirming = null"
              />
            </span>
          </label>
          <label class="field">
            <span class="field-label">Observação <span class="field-optional">(opcional)</span></span>
            <input v-model="payment.note" class="input" maxlength="300" autocomplete="off" placeholder="Ex.: Pix de 21/10, banco tal" />
          </label>
          <p class="muted small">
            Fica no ar até <strong class="em">{{ formatFullDate(newDue) }}</strong>: o período conta a partir do
            vencimento ou de hoje, o que for depois.<template v-if="store.blockedAt"> O bloqueio sai.</template>
            <template v-if="planChange">
              A loja passa para o plano {{ PLAN_LABEL[planChange].toLowerCase() }}.</template>
          </p>

          <div v-if="confirming === 'pagamento'" class="confirm" role="group" aria-label="Confirmar pagamento">
            <p>
              Registrar <strong class="em">{{ formatBRL(paymentValue) }}</strong> por
              {{ payment.months === 1 ? '1 mês' : '3 meses' }}? Não dá para desfazer pelo site.
            </p>
            <div class="actions">
              <button class="btn btn--primary" type="button" :disabled="busy === 'pagamento'" @click="registerPayment">
                {{ busy === 'pagamento' ? 'Registrando…' : 'Confirmar pagamento' }}
              </button>
              <button class="btn" type="button" :disabled="busy === 'pagamento'" @click="confirming = null">Voltar</button>
            </div>
          </div>
          <button v-else class="btn btn--primary" type="button" @click="askPayment">Registrar pagamento</button>
          <p v-if="doneFor('pagamento')" class="done" role="status">{{ doneFor('pagamento') }}</p>
          <FormProblem v-if="problemFor('pagamento')" :problem="problemFor('pagamento')" />
        </template>
        <p v-else class="muted small">Verifique a loja antes: loja não verificada não fica no ar, mesmo paga.</p>
      </section>

      <!-- Fundador -->
      <section class="group" aria-labelledby="admin-fundador">
        <h3 id="admin-fundador" class="group-title">Preço de fundador</h3>
        <p class="muted small">{{ founderText }}</p>
        <button class="btn" type="button" :disabled="busy === 'fundador'" @click="toggleFounder">
          {{ busy === 'fundador' ? 'Salvando…' : store.founder ? 'Tirar o preço de fundador' : 'Marcar como fundador' }}
        </button>
        <FormProblem v-if="problemFor('fundador')" :problem="problemFor('fundador')" />
      </section>

      <!-- Bloqueio -->
      <section class="group" aria-labelledby="admin-bloqueio">
        <h3 id="admin-bloqueio" class="group-title">Bloqueio</h3>
        <template v-if="store.blockedAt">
          <p class="muted small">
            Bloqueada desde {{ formatDateTime(store.blockedAt) }}. Quem abre o link vê "loja indisponível", e o painel
            do revendedor diz que a loja foi suspensa.
          </p>
          <button class="btn" type="button" :disabled="busy === 'bloqueio'" @click="setBlocked(false)">
            {{ busy === 'bloqueio' ? 'Salvando…' : 'Desbloquear' }}
          </button>
        </template>
        <template v-else>
          <p class="muted small">Tira a loja do ar na hora, mesmo paga. Registrar um pagamento também desbloqueia.</p>
          <div v-if="confirming === 'bloqueio'" class="confirm" role="group" aria-label="Confirmar bloqueio">
            <p>Bloquear agora? Quem abrir o link passa a ver "loja indisponível".</p>
            <div class="actions">
              <button class="btn btn--danger" type="button" :disabled="busy === 'bloqueio'" @click="setBlocked(true)">
                {{ busy === 'bloqueio' ? 'Bloqueando…' : 'Bloquear a loja' }}
              </button>
              <button class="btn" type="button" @click="confirming = null">Voltar</button>
            </div>
          </div>
          <button v-else class="btn" type="button" @click="confirming = 'bloqueio'">Bloquear</button>
        </template>
        <FormProblem v-if="problemFor('bloqueio')" :problem="problemFor('bloqueio')" />
      </section>

      <!-- Observação -->
      <section class="group" aria-labelledby="admin-observacao">
        <h3 id="admin-observacao" class="group-title">Observação</h3>
        <label class="field">
          <span class="visually-hidden">Observação sobre a loja</span>
          <textarea v-model="note" class="input textarea" rows="3" maxlength="1000" placeholder="Só você vê." />
        </label>
        <button
          class="btn"
          type="button"
          :disabled="busy === 'observacao' || note.trim() === store.note"
          @click="saveNote"
        >
          {{ busy === 'observacao' ? 'Salvando…' : 'Salvar observação' }}
        </button>
        <p v-if="doneFor('observacao')" class="done" role="status">{{ doneFor('observacao') }}</p>
        <FormProblem v-if="problemFor('observacao')" :problem="problemFor('observacao')" />
      </section>

      <!-- Pagamentos da loja -->
      <section class="group" aria-labelledby="admin-historico">
        <h3 id="admin-historico" class="group-title">Pagamentos da loja</h3>
        <FormProblem v-if="historyProblem" :problem="historyProblem" />
        <p v-else-if="!history" class="muted small">Carregando…</p>
        <p v-else-if="!history.payments.length" class="muted small">Nenhum pagamento registrado.</p>
        <template v-else>
          <ul class="history">
            <li v-for="p in history.payments" :key="p.id">
              <span class="history-date">{{ formatFullDate(p.paidAt) }}</span>
              <span class="history-value">{{ formatBRL(p.value) }}</span>
              <span class="muted small">
                {{ p.months === 1 ? '1 mês' : '3 meses' }}, até {{ formatFullDate(p.paidUntil) }}
              </span>
              <span v-if="p.note" class="history-note small">{{ p.note }}</span>
            </li>
          </ul>
          <p class="muted small">Total: {{ formatBRL(history.total) }}</p>
        </template>
      </section>
    </div>
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

/* Computador: painel na lateral direita, com a lista ainda à vista. */
@media (min-width: 48rem) {
  .sheet {
    width: min(34rem, 100%);
    height: 100dvh;
    max-height: 100dvh;
    margin: 0 0 0 auto;
    border-radius: 0;
    border-left: 1px solid var(--line);
  }
}

.detail {
  --tone: var(--field-line);
  display: grid;
  gap: 1rem;
  padding: 1rem var(--gutter) 2rem;
}

.detail.tone-soon {
  --tone: var(--warn);
}

.detail.tone-late {
  --tone: var(--alert);
}

.detail-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.875rem;
  align-items: start;
}

.due {
  min-width: 3.5rem;
  padding-left: 0.75rem;
  border-left: 3px solid var(--tone);
}

.tone-none .due {
  border-left-style: dashed;
}

.status-bloqueada .due {
  border-left: 0;
  padding-left: calc(0.75rem + 6px);
  background: repeating-linear-gradient(-45deg, var(--alert) 0 3px, transparent 3px 6px) left / 6px 100% no-repeat;
}

.due-figure {
  display: block;
  font-size: var(--step-3);
  line-height: 0.9;
}

.tone-late .due-figure {
  color: var(--alert);
}

.tone-none .due-figure,
.status-bloqueada .due-figure {
  color: var(--muted);
}

.due-unit {
  display: block;
  margin-top: 0.25rem;
  color: var(--muted);
  font-size: var(--step--1);
  line-height: 1.2;
}

.detail-title {
  font-size: var(--step-3);
  overflow-wrap: anywhere;
}

.detail-name .muted {
  margin-top: 0.25rem;
  overflow-wrap: anywhere;
}

.close {
  display: grid;
  place-items: center;
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

.state {
  font-size: var(--step-1);
  font-stretch: var(--semi);
  font-weight: 640;
}

.muted {
  color: var(--muted);
}

.small {
  font-size: var(--step--1);
}

.em {
  color: var(--text);
  font-weight: 650;
  white-space: nowrap;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/* O detalhe tem o mesmo fundo dos botões: a borda dos campos (3:1) mostra onde o botão está. */
.detail .btn:not(.btn--primary, .btn--danger) {
  border-color: var(--field-line);
}

.message {
  border-left: 2px solid var(--line);
  padding-left: 0.875rem;
}

.message summary {
  display: flex;
  align-items: center;
  min-height: 44px;
  color: var(--text);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.message p {
  margin-top: 0.25rem;
  white-space: pre-line;
}

/* Dados da loja em duas colunas curtas: rótulo e valor. */
.facts {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 1rem 0 0;
  border-top: 1px solid var(--line);
}

.facts > div {
  display: grid;
  grid-template-columns: 6.5rem minmax(0, 1fr);
  gap: 0.75rem;
}

@media (min-width: 48rem) {
  .facts > div {
    grid-template-columns: 8.5rem minmax(0, 1fr);
  }
}

.facts dt {
  color: var(--muted);
}

.facts dd {
  overflow-wrap: anywhere;
}

.facts a {
  text-underline-offset: 3px;
}

.group {
  display: grid;
  gap: 0.75rem;
  justify-items: start;
  padding-top: 1rem;
  border-top: 1px solid var(--line);
}

.group > .field,
.group > .segments,
.group > .confirm {
  justify-self: stretch;
}

.group-title {
  font-size: var(--step-1);
  font-stretch: var(--semi);
  font-weight: 680;
}

.done {
  font-weight: 560;
}

.textarea {
  min-height: 6rem;
  padding-block: 0.75rem;
  resize: vertical;
  line-height: 1.45;
}

.money-field {
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

.money-field:focus-within {
  border-color: var(--accent-edge);
  outline: 2px solid var(--accent-edge);
  outline-offset: 0;
}

.money-field.is-invalid {
  border-color: var(--alert);
}

.money-field input {
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

.money-field input::placeholder {
  color: var(--placeholder);
}

.segments {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  max-width: 20rem;
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

/* Confirmação: a pergunta com o valor e o botão que grava, no lugar do botão de antes. */
.confirm {
  display: grid;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-left: 3px solid var(--accent-edge);
  background: var(--stage);
}

.btn--danger {
  border-color: var(--alert);
  color: var(--alert);
}

.history {
  display: grid;
  justify-self: stretch;
}

.history li {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0 0.75rem;
  padding: 0.625rem 0;
  border-bottom: 1px solid var(--line);
  font-variant-numeric: tabular-nums;
}

.history li > .muted,
.history-note {
  grid-column: 1 / -1;
}

.history-value {
  justify-self: end;
  font-weight: 650;
}

.history-note {
  overflow-wrap: anywhere;
}
</style>
