<script setup>
// Aba "Loja" do painel: verificação do inventário (a loja só fica pública depois dela), situação,
// "Atualizar inventário" e conta. Loja fora do ar é tratada no aviso de vencimento (PanelRenewal).
const props = defineProps({
  store: { type: Object, required: true },
  email: { type: String, default: '' },
  // O aviso de vencimento está na tela (com a data): o bloco "Loja no ar" sai.
  renewal: { type: Boolean, default: false },
})
const emit = defineEmits(['update'])

const { busy, act, problemFor } = usePanelAction((store) => emit('update', store))

// Hora atual, para o botão de atualizar liberar sozinho quando passar o intervalo.
const now = ref(Date.now())
let clock
onMounted(() => (clock = setInterval(() => (now.value = Date.now()), 15_000)))
onBeforeUnmount(() => clearInterval(clock))

// ---- Verificação
const { copied: codeCopied, copy: copyCode } = useCopy()
const codeExpired = computed(() => props.store.codeExpiresAt && Date.parse(props.store.codeExpiresAt) <= now.value)
const editProfile = computed(() => `https://steamcommunity.com/profiles/${props.store.steamid}/edit/info`)

// ---- Inventário
const update = ref(null)
const canRefreshAt = computed(() => (props.store.nextRefreshAt ? Date.parse(props.store.nextRefreshAt) : 0))
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
const { copied: linkCopied, copy: copyLink } = useCopy()
const storeUrl = computed(() => `${useSiteUrl()}/${props.store.slug}`)
</script>

<template>
  <div class="tab-body">
    <!-- Verificação: a loja só fica pública depois dela -->
    <section v-if="!store.verified" class="painel-block painel-block--wide" aria-labelledby="verificar">
      <h2 id="verificar" class="block-title">Verifique o seu inventário</h2>
      <p class="muted">
        A loja só aparece para os clientes depois desta etapa. Ela prova que o inventário é seu, sem pedir login
        da Steam. Enquanto isso, você já pode montar a marca e os preços nas outras abas.
      </p>

      <ol class="steps">
        <li>
          <p>Copie o código.</p>
          <div class="code">
            <span class="code-tag display" :class="{ 'is-expired': codeExpired }">{{ store.code }}</span>
            <button class="btn" type="button" :disabled="codeExpired" @click="copyCode(store.code)">
              {{ codeCopied ? 'Código copiado' : 'Copiar código' }}
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

      <FormProblem v-if="problemFor('verificar', 'codigo')" :problem="problemFor('verificar', 'codigo')" />
      <p class="muted small">Depois da verificação, você pode apagar o código do perfil.</p>
    </section>

    <!-- No ar -->
    <section v-else-if="store.open && !renewal" class="painel-block status" aria-labelledby="situacao">
      <h2 id="situacao" class="block-title">Loja no ar</h2>
      <p class="muted">{{ store.trial ? 'Teste grátis' : 'Paga' }} até {{ formatDate(store.paidUntil) }}.</p>
      <div class="actions">
        <button class="btn" type="button" @click="copyLink(storeUrl)">
          <AppIcon name="link" />
          {{ linkCopied ? 'Link copiado' : 'Copiar link da loja' }}
        </button>
      </div>
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
        <button class="btn" type="button" :disabled="busy === 'atualizar' || tooSoon" @click="refreshInventory">
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
      <p class="muted">{{ email }}</p>
      <p class="muted">
        Pedidos da loja vão para o WhatsApp {{ formatPhone(store.whatsapp) }}. Para trocar, use a aba Marca.
      </p>
    </section>
  </div>
</template>

<style scoped>
/* Painéis lado a lado no computador (situação, inventário e conta) e um embaixo do outro no
   celular. A verificação ocupa a linha inteira. */
.tab-body {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

/* Os painéis de uma linha dividem a largura entre si: três, dois ou um. */
.painel-block {
  display: grid;
  flex: 1 1 20rem;
  align-content: start;
  gap: 0.875rem;
  min-width: 0;
  padding: 1.25rem 1rem;
  border: 1px solid var(--line);
  border-radius: var(--radius-m);
  background: var(--surface);
}

.painel-block--wide {
  flex-basis: 100%;
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

/* Situação: a borda da esquerda diz que a loja está no ar. */
.status {
  border-left: 3px solid var(--accent-edge);
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

/* Computador: os três passos lado a lado, na ordem de leitura. */
@media (min-width: 64rem) {
  .steps {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 2rem;
  }
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
  font-size: clamp(2.25rem, 11vw, 2.75rem);
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
