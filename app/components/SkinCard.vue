<script setup>
// Card de um item. A raridade acende o "palco" por baixo da skin.
// Com `to`, o card vira link (usado na página inicial); sem, emite `open`.
const props = defineProps({
  item: { type: Object, required: true },
  to: { type: [String, Object], default: null },
})
const emit = defineEmits(['open'])

const NuxtLink = resolveComponent('NuxtLink')
const stickers = computed(() => props.item.stickers.slice(0, 5))
</script>

<template>
  <article class="card" :style="{ '--rarity': item.rarity.color }">
    <div class="stage">
      <img
        v-if="item.image"
        class="stage-img"
        :src="steamImage(item.image)"
        alt=""
        width="360"
        height="270"
        loading="lazy"
        decoding="async"
      />
      <div v-if="item.quantity > 1 || !item.tradable" class="badges">
        <span v-if="item.quantity > 1" class="badge">{{ item.quantity }}×</span>
        <span v-if="!item.tradable" class="badge badge--lock" :title="item.tradeLock">
          <AppIcon name="lock" />
          <span class="visually-hidden">{{ item.tradeLock }}</span>
        </span>
      </div>
      <ul v-if="stickers.length" class="stickers">
        <li v-for="(sticker, i) in stickers" :key="i">
          <img :src="sticker.image" :alt="sticker.name ?? 'Sticker'" width="30" height="22" loading="lazy" />
        </li>
      </ul>
    </div>

    <p class="kind">
      <span v-if="item.star" class="star">★ </span>
      <span v-if="item.stattrak" class="stattrak">StatTrak™ </span>
      <span v-if="item.souvenir" class="souvenir">Souvenir </span>
      <span>{{ itemSubtitle(item) }}</span>
    </p>
    <h3 class="name">
      <component
        :is="to ? NuxtLink : 'button'"
        class="hit"
        :to="to ?? undefined"
        :type="to ? undefined : 'button'"
        :aria-label="item.marketName"
        @click="to ? null : emit('open', item)"
      >
        {{ itemTitle(item) }}
      </component>
    </h3>
    <WearMeter v-if="item.wear" class="card-wear" :wear="item.wear" :float="item.float" />
  </article>
</template>

<style scoped>
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stage {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: var(--radius-s);
  background: var(--stage);
  box-shadow: inset 0 -2px 0 var(--rarity);
}

/* Luz no chão do palco, na cor da raridade. */
.stage::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(46% 12% at 50% 86%, color-mix(in srgb, var(--rarity) 55%, transparent), transparent),
    radial-gradient(85% 70% at 50% 100%, color-mix(in srgb, var(--rarity) 30%, transparent), transparent 75%);
  opacity: 0.75;
  transition: opacity 180ms ease;
}

.card:hover .stage::before,
.card:focus-within .stage::before {
  opacity: 1;
}

.stage-img {
  position: absolute;
  inset: 8% 7% 14%;
  width: 86%;
  height: 78%;
  object-fit: contain;
  filter: drop-shadow(0 10px 10px rgb(0 0 0 / 0.5));
}

.badges {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 4px;
}

.badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 6px;
  border-radius: var(--radius-s);
  background: rgb(22 27 34 / 0.85);
  font-size: var(--step--1);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.badge--lock {
  color: var(--alert);
}

.badge--lock svg {
  width: 14px;
  height: 14px;
}

.stickers {
  position: absolute;
  bottom: 6px;
  left: 6px;
  display: flex;
  gap: 2px;
}

.stickers img {
  width: 30px;
  height: 22px;
  object-fit: contain;
}

.kind {
  margin-top: 0.625rem;
  overflow: hidden;
  color: var(--muted);
  font-size: var(--step--1);
  white-space: nowrap;
  text-overflow: ellipsis;
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

.name {
  font-size: var(--step-1);
  font-stretch: var(--semi);
  font-weight: 640;
  line-height: 1.15;
}

.hit {
  display: block;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  overflow-wrap: anywhere;
}

/* O card inteiro é clicável, mas só o nome é o botão. */
.hit::after {
  content: '';
  position: absolute;
  inset: 0;
}

.hit:focus-visible {
  outline: none;
}

.card:has(.hit:focus-visible) .stage {
  outline: 2px solid var(--chalk);
  outline-offset: 2px;
}

.card-wear {
  margin-top: 0.5rem;
}
</style>
