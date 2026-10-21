<script setup>
// Topo da loja: banner, logo (ou avatar da Steam), nome, frase, resumo, redes e as ações (slot).
// Usado na loja e na prévia do painel. O layout segue a largura do próprio topo (container
// query), não a da tela: assim a prévia do painel mostra o topo do celular dentro do computador.
const props = defineProps({
  name: { type: String, required: true },
  avatar: { type: String, default: null },
  profileUrl: { type: String, default: null },
  // { logo, banner, focus: { x, y }, tagline, socials: [{ id, label, handle, url }] }
  brand: { type: Object, default: null },
  summary: { type: String, default: '' },
})

const logo = computed(() => props.brand?.logo ?? null)
const banner = computed(() => props.brand?.banner ?? null)
const focus = computed(() => `${props.brand?.focus?.x ?? 50}% ${props.brand?.focus?.y ?? 50}%`)
const socials = computed(() => props.brand?.socials ?? [])
</script>

<template>
  <header class="store-head" :class="{ 'has-banner': banner }">
    <div v-if="banner" class="banner">
      <img :src="banner" alt="" :style="{ objectPosition: focus }" width="1600" height="600" fetchpriority="high" />
    </div>

    <div class="wrap head-body">
      <div class="owner">
        <img v-if="logo" class="logo" :src="logo" alt="" width="72" height="72" />
        <img v-else-if="avatar" class="avatar" :src="avatar" alt="" width="40" height="40" />
        <span v-else class="avatar avatar--blank" aria-hidden="true">{{ name.charAt(0) }}</span>
        <a v-if="profileUrl" :href="profileUrl" target="_blank" rel="noopener" class="owner-link">Perfil na Steam</a>
        <slot name="note" />
      </div>

      <h1 class="display store-name">{{ name }}</h1>
      <p v-if="brand?.tagline" class="tagline">{{ brand.tagline }}</p>

      <div v-if="summary || socials.length" class="head-meta">
        <p v-if="summary" class="store-summary">{{ summary }}</p>
        <ul v-if="socials.length" class="socials" aria-label="Redes da loja">
          <li v-for="s in socials" :key="s.id">
            <a :href="s.url" target="_blank" rel="noopener nofollow">
              <span class="social-net">{{ s.label }}</span>
              <span class="social-handle">{{ s.handle }}</span>
            </a>
          </li>
        </ul>
      </div>

      <div v-if="$slots.default" class="store-actions">
        <slot />
      </div>
    </div>
  </header>
</template>

<style scoped>
.store-head {
  container-type: inline-size;
}

/* Banner baixo, para as skins aparecerem logo na primeira tela. No celular vai de ponta a ponta
   (3:1); no computador fica na largura do conteúdo (6:1). Cada um recorta a imagem em volta do
   ponto de foco, e os recortes do painel (BannerFocus) usam as mesmas proporções. */
.banner {
  aspect-ratio: 3 / 1;
  overflow: hidden;
  background: var(--stage);
}

.banner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.head-body {
  display: grid;
  gap: 0.875rem;
  padding-top: 1.25rem;
  padding-bottom: 1.5rem;
}

.owner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  color: var(--muted);
  font-size: var(--step--1);
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-s);
  object-fit: cover;
}

.avatar--blank {
  display: grid;
  place-items: center;
  background: var(--surface-2);
  color: var(--text);
  font-size: var(--step-1);
  font-stretch: var(--narrow);
  font-weight: 700;
}

/* A logo fica sobre a borda do banner, como o emblema de um time. */
.logo {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-m);
  background: var(--surface);
  object-fit: contain;
}

.has-banner .logo {
  margin-top: -3.25rem;
  outline: 3px solid var(--bg);
}

.owner-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  text-underline-offset: 3px;
}

.has-banner .owner-link {
  align-self: flex-end;
}

.store-name {
  font-size: clamp(3rem, 13cqi, 7.5rem);
  overflow-wrap: anywhere;
}

/* Com banner, o nome fica menor: o banner já marca a loja. */
.has-banner .store-name {
  font-size: clamp(2.5rem, 10cqi, 5rem);
}

.tagline {
  max-width: 40rem;
  font-size: var(--step-1);
  font-stretch: var(--semi);
  font-weight: 560;
  line-height: 1.3;
}

.head-meta {
  display: grid;
  gap: 0.5rem;
}

.store-summary {
  color: var(--muted);
}

.socials {
  display: flex;
  flex-wrap: wrap;
  gap: 0 1.25rem;
}

.socials a {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 44px;
  font-size: var(--step--1);
  text-decoration: none;
}

.social-net {
  font-stretch: var(--semi);
  font-weight: 680;
}

.social-handle {
  color: var(--muted);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.socials a:hover .social-handle {
  color: var(--text);
}

.store-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

/* No celular, o botão principal ocupa a linha e os outros ficam ao lado dele, numa linha só. */
.store-actions > :slotted(:first-child) {
  flex: 1 1 auto;
}

@container (min-width: 48rem) {
  .banner {
    aspect-ratio: 6 / 1;
    width: calc(100% - 2 * var(--gutter));
    max-width: calc(var(--max) - 2 * var(--gutter));
    margin-inline: auto;
    border-radius: 0 0 var(--radius-m) var(--radius-m);
  }

  .store-actions > :slotted(:first-child) {
    flex: none;
  }

  .head-body {
    grid-template-columns: 1fr auto;
    column-gap: 2rem;
    padding-top: 2rem;
    padding-bottom: 2rem;
  }

  .head-body > * {
    grid-column: 1 / -1;
  }

  .logo {
    width: 88px;
    height: 88px;
  }

  .has-banner .logo {
    margin-top: -4.5rem;
  }

  .head-body > .head-meta {
    grid-column: 1;
    align-self: end;
  }

  .head-body > .store-actions {
    grid-column: 2;
    align-self: end;
    margin-top: 0;
  }
}
</style>
