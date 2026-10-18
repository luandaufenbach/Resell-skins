<script setup>
// Demonstração da página inicial: a loja de exemplo com os componentes de verdade (chips, cards,
// preço e ficha), num tema só dela. O seletor troca a cor de destaque e o fundo na hora, sem
// mexer no resto da página.
const props = defineProps({
  store: { type: Object, required: true },
})

const COLORS = [
  { id: 'padrao', label: 'Padrão', hex: null },
  { id: 'laranja', label: 'Laranja', hex: 'ff7a1a' },
  { id: 'verde', label: 'Verde', hex: '2bc26b' },
  { id: 'azul', label: 'Azul', hex: '3d8bff' },
  { id: 'rosa', label: 'Rosa', hex: 'ff4f8b' },
  { id: 'amarelo', label: 'Amarelo', hex: 'ffcf33' },
]

const color = ref('padrao')
const background = ref('escuro')
const options = computed(() => ({ cor: COLORS.find((c) => c.id === color.value).hex, fundo: background.value }))
const theme = useScopedTheme(options)
const style = computed(() => themeStyle(theme.value))

// "Padrão" mostra o destaque da própria base: branco giz no escuro, grafite no claro.
const swatch = (c) => (c.hex ? `#${c.hex}` : buildTheme({ fundo: background.value }).accent)

// A loja inteira abre com o mesmo tema escolhido aqui.
const fullStore = computed(() => ({
  path: '/loja/demo',
  query: { cor: options.value.cor ?? undefined, fundo: background.value === 'claro' ? 'claro' : undefined },
}))

// Em "Tudo", uma seleção com raridades e categorias diferentes; nas outras, os primeiros da categoria.
const PICKS = [
  '★ Karambit | Doppler (Factory New)',
  'StatTrak™ AK-47 | Redline (Field-Tested)',
  '★ Sport Gloves | Vice (Field-Tested)',
  'AWP | Atheris (Factory New)',
  'Desert Eagle | Printstream (Factory New)',
  'M4A1-S | Printstream (Minimal Wear)',
]

const items = computed(() => props.store.items ?? [])
const category = ref('tudo')
const chips = computed(() => [
  { id: 'tudo', label: 'Tudo', count: items.value.length },
  ...CATEGORIES.map((c) => ({ ...c, count: items.value.filter((i) => i.category === c.id).length })).filter(
    (c) => c.count,
  ),
])
const shown = computed(() =>
  category.value === 'tudo'
    ? PICKS.map((name) => items.value.find((i) => i.marketName === name)).filter(Boolean)
    : items.value.filter((i) => i.category === category.value).slice(0, 6),
)

const savings = computed(() => savingsPercent(items.value.find((i) => i.price)?.price))
const selected = ref(null)
</script>

<template>
  <div class="demo">
    <div class="controls">
      <fieldset class="control">
        <legend>Cor da loja</legend>
        <div class="swatches">
          <label v-for="c in COLORS" :key="c.id" class="swatch" :title="c.label">
            <input v-model="color" type="radio" name="demo-cor" :value="c.id" />
            <span class="swatch-dot" :class="{ 'swatch-dot--base': !c.hex }" :style="{ background: swatch(c) }" />
            <span class="visually-hidden">{{ c.label }}</span>
          </label>
        </div>
      </fieldset>

      <fieldset class="control">
        <legend>Fundo</legend>
        <div class="modes">
          <label class="mode">
            <input v-model="background" type="radio" name="demo-fundo" value="escuro" />
            <span>Escuro</span>
          </label>
          <label class="mode">
            <input v-model="background" type="radio" name="demo-fundo" value="claro" />
            <span>Claro</span>
          </label>
        </div>
      </fieldset>
    </div>

    <section class="frame" :style="style" aria-labelledby="demo-nome">
      <header class="frame-head">
        <span class="avatar" aria-hidden="true">{{ (store.profile?.name ?? 'L').charAt(0) }}</span>
        <div class="frame-title">
          <h2 id="demo-nome" class="display frame-name">{{ store.profile?.name ?? 'Loja exemplo' }}</h2>
          <p v-if="savings" class="frame-note">Preços {{ savings }}% abaixo da Steam.</p>
        </div>
      </header>
      <NuxtLink class="btn btn--primary frame-open" :to="fullStore">Abrir a loja inteira</NuxtLink>

      <nav class="frame-chips" aria-label="Categorias da loja de exemplo">
        <button
          v-for="chip in chips"
          :key="chip.id"
          type="button"
          class="chip"
          :aria-pressed="category === chip.id"
          @click="category = chip.id"
        >
          {{ chip.label }}
          <span class="chip-count">{{ chip.count }}</span>
        </button>
      </nav>

      <ul class="frame-grid">
        <li v-for="item in shown" :key="item.id">
          <SkinCard :item="item" @open="selected = $event" />
        </li>
      </ul>

      <SkinDetail :item="selected" demo :copy-link="false" @close="selected = null" />
    </section>

    <p class="demo-caption">Itens fictícios, preços reais de hoje. Toque numa skin para abrir a ficha.</p>
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 0.875rem;
  min-width: 0;
}

/* No celular, as skins vêm antes do seletor: a primeira tela mostra a loja, não os botões. */
.frame {
  order: 1;
}

.controls {
  order: 2;
}

.demo-caption {
  order: 3;
}

@media (min-width: 40rem) {
  .controls {
    order: 0;
  }
}

/* ---- Seletor de cor e fundo (no tema da página, não no da loja) */
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  justify-content: space-between;
  gap: 0.75rem 1.5rem;
}

.control {
  display: grid;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  border: 0;
}

.control legend {
  padding: 0;
  margin-bottom: 0.375rem;
  color: var(--muted);
  font-size: var(--step--1);
}

.swatches,
.modes {
  display: flex;
  gap: 0.25rem;
}

.swatch {
  position: relative;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid transparent;
  border-radius: var(--radius-s);
  cursor: pointer;
}

.swatch:has(input:checked) {
  border-color: var(--text);
}

.swatch:has(input:focus-visible),
.mode:has(input:focus-visible) {
  outline: 2px solid var(--accent-edge);
  outline-offset: 2px;
}

.swatch input,
.mode input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.swatch-dot {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-s);
}

/* O "Padrão" do fundo claro é grafite, quase a cor da página: o contorno mostra onde ele está. */
.swatch-dot--base {
  box-shadow: 0 0 0 1px var(--muted);
}

.modes {
  gap: 0;
}

.mode {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 0.875rem;
  border: 1px solid var(--line);
  background: transparent;
  font-stretch: var(--semi);
  font-weight: 560;
  cursor: pointer;
}

.mode:first-child {
  border-radius: var(--radius-s) 0 0 var(--radius-s);
}

.mode:last-child {
  margin-left: -1px;
  border-radius: 0 var(--radius-s) var(--radius-s) 0;
}

.mode:has(input:checked) {
  z-index: 1;
  border-color: var(--accent-edge);
  background: var(--accent);
  color: var(--accent-ink);
}

/* ---- A loja de exemplo, no tema escolhido */
.frame {
  --frame-pad: 0.875rem;
  display: grid;
  grid-template-areas: 'head' 'chips' 'grid' 'open';
  gap: 1rem;
  min-width: 0;
  padding: 1rem var(--frame-pad) 1.25rem;
  border: 1px solid var(--line);
  border-radius: var(--radius-m);
  background: var(--bg);
  color: var(--text);
}

.frame-head {
  grid-area: head;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
}

.avatar {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-s);
  background: var(--surface-2);
  font-size: var(--step-1);
  font-stretch: var(--narrow);
  font-weight: 700;
}

.frame-name {
  font-size: var(--step-3);
}

.frame-note {
  margin-top: 0.25rem;
  color: var(--muted);
  font-size: var(--step--1);
}

.frame-open {
  grid-area: open;
  justify-self: start;
}

/* Uma linha só, rolando de lado: a demonstração mostra a loja, não precisa de todos à vista. */
.frame-chips {
  grid-area: chips;
  display: flex;
  gap: 0.375rem;
  margin: -4px calc(var(--frame-pad) * -1);
  padding: 4px var(--frame-pad);
  overflow-x: auto;
  scrollbar-width: none;
}

.frame-chips::-webkit-scrollbar {
  display: none;
}

.frame-grid {
  grid-area: grid;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem 0.75rem;
}

/* No celular, quatro skins bastam: a demonstração não pode empurrar o resto da página. */
.frame-grid li:nth-child(n + 5) {
  display: none;
}

.demo-caption {
  color: var(--muted);
  font-size: var(--step--1);
}

@media (min-width: 40rem) {
  .frame {
    --frame-pad: 1.25rem;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: 'head open' 'chips chips' 'grid grid';
    padding: 1.25rem var(--frame-pad) 1.5rem;
  }

  .frame-open {
    align-self: center;
  }

  .frame-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.75rem 1rem;
  }

  .frame-grid li:nth-child(n + 5) {
    display: block;
  }
}
</style>
