<script setup>
// Ficha do item: abre como folha de baixo no celular e como janela no computador.
const props = defineProps({
  item: { type: Object, default: null },
  whatsapp: { type: String, default: '' },
})
const emit = defineEmits(['close'])

const dialog = ref(null)
const { copied, copy } = useCopy()

watch(
  () => props.item,
  async (item) => {
    await nextTick()
    if (!dialog.value) return
    if (item && !dialog.value.open) dialog.value.showModal()
    if (!item && dialog.value.open) dialog.value.close()
  },
)

onMounted(() => {
  if (props.item) dialog.value?.showModal()
})

function close() {
  dialog.value?.close()
}

function onBackdropClick(event) {
  if (event.target === dialog.value) close()
}

const accessoriesTitle = computed(() => {
  const kinds = new Set(props.item?.stickers.map((s) => s.kind))
  if (kinds.has('sticker') && kinds.has('charm')) return 'Stickers e chaveiro'
  return kinds.has('charm') ? 'Chaveiro' : 'Stickers'
})

// Mesmo valor no servidor e no navegador, para não dar diferença na hidratação.
const origin = useRequestURL().origin
const route = useRoute()
const pageUrl = () => origin + route.fullPath
</script>

<template>
  <dialog
    ref="dialog"
    class="sheet"
    :style="item ? { '--rarity': item.rarity.color } : null"
    :aria-label="item?.marketName"
    @close="emit('close')"
    @click="onBackdropClick"
  >
    <div v-if="item" class="sheet-body">
      <div class="sheet-stage">
        <img
          v-if="item.image"
          :key="item.id"
          class="sheet-img"
          :src="steamImage(item.image, '512fx384f')"
          alt=""
          width="512"
          height="384"
        />
      </div>

      <div class="sheet-info">
        <p class="kind">
          <span v-if="item.star" class="star">★ </span>
          <span v-if="item.stattrak" class="stattrak">StatTrak™ </span>
          <span v-if="item.souvenir" class="souvenir">Souvenir </span>
          <span>{{ itemSubtitle(item) }}</span>
        </p>
        <h2 class="sheet-title display">{{ itemTitle(item) }}</h2>

        <WearMeter v-if="item.wear" class="sheet-wear" :wear="item.wear" :float="item.float" large />

        <dl class="facts">
          <div>
            <dt>Raridade</dt>
            <dd><span class="swatch" />{{ item.rarity.label ?? '—' }}</dd>
          </div>
          <div v-if="item.wear">
            <dt>Desgaste</dt>
            <dd>{{ item.wearLabel ?? wearLabel(item.wear) }}</dd>
          </div>
          <div v-if="item.pattern != null">
            <dt>Pattern</dt>
            <dd>{{ item.pattern }}</dd>
          </div>
          <div v-if="item.nameTag">
            <dt>Nome personalizado</dt>
            <dd>“{{ item.nameTag }}”</dd>
          </div>
          <div v-if="item.quantity > 1">
            <dt>Quantidade</dt>
            <dd>{{ item.quantity }}</dd>
          </div>
          <div>
            <dt>Troca</dt>
            <dd :class="{ 'is-locked': !item.tradable }">
              {{ item.tradable ? 'Disponível agora' : item.tradeLock }}
            </dd>
          </div>
        </dl>

        <section v-if="item.stickers.length" class="accessories">
          <h3>{{ accessoriesTitle }}</h3>
          <ul>
            <li v-for="(sticker, i) in item.stickers" :key="i">
              <img :src="sticker.image" alt="" width="48" height="36" loading="lazy" />
              <span>{{ sticker.name ?? 'Sticker' }}</span>
            </li>
          </ul>
        </section>

        <div class="sheet-actions">
          <a
            v-if="whatsapp"
            class="btn btn--primary"
            :href="whatsappLink(whatsapp, item, pageUrl())"
            target="_blank"
            rel="noopener"
          >
            <AppIcon name="chat" />
            Pedir no WhatsApp
          </a>
          <button class="btn" type="button" @click="copy(pageUrl())">
            <AppIcon name="link" />
            {{ copied ? 'Link copiado' : 'Copiar link desta skin' }}
          </button>
          <a class="btn" :href="item.steamUrl" target="_blank" rel="noopener">
            <AppIcon name="external" />
            Ver na Steam
          </a>
          <a v-if="item.inspectLink" class="btn inspect" :href="item.inspectLink">Inspecionar no jogo</a>
        </div>
      </div>

      <button class="sheet-close" type="button" aria-label="Fechar" @click="close">
        <AppIcon name="close" />
      </button>
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
  background: rgb(12 15 20 / 0.72);
}

.sheet-body {
  position: relative;
  display: grid;
}

.sheet-stage {
  position: relative;
  aspect-ratio: 4 / 3;
  max-height: 46dvh;
  width: 100%;
  overflow: hidden;
  background: var(--stage);
  box-shadow: inset 0 -3px 0 var(--rarity);
}

.sheet-stage::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(42% 10% at 50% 86%, color-mix(in srgb, var(--rarity) 65%, transparent), transparent),
    radial-gradient(80% 75% at 50% 100%, color-mix(in srgb, var(--rarity) 36%, transparent), transparent 75%);
  transform-origin: 50% 100%;
}

.sheet-img {
  position: absolute;
  inset: 8% 8% 14%;
  width: 84%;
  height: 78%;
  object-fit: contain;
  filter: drop-shadow(0 14px 14px rgb(0 0 0 / 0.55));
}

/* O único momento animado: a luz sobe e a skin "pousa" no palco. */
.sheet[open] .sheet-stage::before {
  animation: light-up 520ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.sheet[open] .sheet-img {
  animation: settle 520ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

@keyframes light-up {
  from {
    opacity: 0;
    transform: scaleY(0.4);
  }
}

@keyframes settle {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.97);
  }
}

.sheet-info {
  display: grid;
  gap: 1.25rem;
  align-content: start;
  padding: 1.25rem var(--gutter) calc(1.5rem + env(safe-area-inset-bottom));
}

.kind {
  margin-bottom: -1rem;
  color: var(--muted);
}

.star {
  color: var(--rarity);
}

.stattrak {
  color: var(--stattrak);
}

.souvenir {
  color: var(--souvenir);
}

.sheet-title {
  font-size: clamp(2.25rem, 8vw, 3.25rem);
}

.facts {
  display: grid;
  gap: 0.5rem;
}

.facts > div {
  display: grid;
  grid-template-columns: 9rem 1fr;
  gap: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--line);
}

dt {
  color: var(--muted);
}

dd {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: var(--rarity);
}

.is-locked {
  color: var(--alert);
}

.accessories h3 {
  margin-bottom: 0.5rem;
  font-size: var(--step-0);
  font-weight: 600;
}

.accessories ul {
  display: grid;
  gap: 0.375rem;
}

.accessories li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: var(--step--1);
}

.accessories img {
  width: 48px;
  height: 36px;
  object-fit: contain;
}

.sheet-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.sheet-actions .btn {
  flex: 1 1 auto;
}

.sheet-close {
  position: absolute;
  top: 10px;
  right: 10px;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: rgb(22 27 34 / 0.8);
  cursor: pointer;
}

.sheet-close svg {
  width: 20px;
  height: 20px;
}

/* Inspecionar só funciona com o jogo instalado, então some no celular. */
.inspect {
  display: none;
}

@media (min-width: 48rem) {
  .sheet {
    width: min(920px, 100% - 48px);
    max-height: min(88dvh, 720px);
    margin: auto;
    border-radius: var(--radius-l);
  }

  .sheet-body {
    grid-template-columns: 1.15fr 1fr;
  }

  .sheet-stage {
    aspect-ratio: auto;
    max-height: none;
    min-height: 100%;
  }

  .sheet-info {
    padding: 2rem 2rem 2rem 1.75rem;
  }

  .inspect {
    display: inline-flex;
  }
}
</style>
