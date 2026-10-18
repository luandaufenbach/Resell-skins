<script setup>
// Página do revendedor: cola o link da Steam e gera o catálogo.
const steamUrl = ref('')
const phone = ref('')
const pending = ref(false)
const problem = ref(null)

async function generate() {
  problem.value = null
  pending.value = true
  try {
    const { steamid } = await $fetch('/api/resolve', { query: { url: steamUrl.value } })
    const w = normalizePhone(phone.value)
    await navigateTo({ path: `/loja/${steamid}`, query: w ? { w } : {} })
  } catch (error) {
    problem.value = steamErrorMessage(error)
  } finally {
    pending.value = false
  }
}

// Algumas skins do catálogo de exemplo, escolhidas para mostrar raridades diferentes.
const SHOWCASE = [
  '★ Karambit | Doppler (Factory New)',
  'StatTrak™ AK-47 | Redline (Field-Tested)',
  'AWP | Atheris (Factory New)',
  '★ Sport Gloves | Vice (Field-Tested)',
  'SSG 08 | Abyss (Minimal Wear)',
  'Desert Eagle | Printstream (Factory New)',
]
const { data: demo } = await useFetch('/api/inventory/demo')
const preview = computed(() =>
  SHOWCASE.map((name) => demo.value?.items.find((i) => i.marketName === name)).filter(Boolean),
)
const savings = computed(() => savingsPercent(preview.value.find((i) => i.price)?.price))

useSeoMeta({
  title: 'Vitrine | Catálogo de skins de CS2 a partir do seu inventário',
  description:
    'Cole o link do seu perfil Steam e receba uma página com foto, desgaste e stickers de cada skin, num link para mandar a quem quiser comprar.',
})
</script>

<template>
  <main class="wrap home">
    <p class="wordmark display">Vitrine</p>

    <section class="hero">
      <div class="hero-copy">
        <h1 class="display hero-title">Seu inventário da Steam, pronto para vender</h1>
        <p class="lead">
          Cole o link do seu perfil e receba uma página com foto, desgaste e stickers de cada skin. Quem
          abrir o link fala direto com você no WhatsApp.
        </p>

        <form class="generate" @submit.prevent="generate">
          <label class="field">
            <span class="field-label">Link do perfil Steam</span>
            <input
              v-model="steamUrl"
              class="input"
              required
              inputmode="url"
              autocomplete="url"
              spellcheck="false"
              placeholder="steamcommunity.com/id/seunome"
            />
            <span class="field-hint">Também aceita o seu link de troca.</span>
          </label>

          <label class="field">
            <span class="field-label">WhatsApp para pedidos <span class="field-optional">(opcional)</span></span>
            <input
              v-model="phone"
              class="input"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              placeholder="(48) 99999-9999"
            />
          </label>

          <div v-if="problem" class="form-problem" role="alert">
            <p class="form-problem-title">{{ problem.title }}</p>
            <p>{{ problem.body }}</p>
          </div>

          <button class="btn btn--primary btn--large" type="submit" :disabled="pending">
            {{ pending ? 'Lendo inventário…' : 'Gerar catálogo' }}
          </button>
        </form>

        <p class="privacy">
          O inventário precisa estar público. Na Steam, abra Editar perfil, depois Configurações de
          privacidade, e deixe Inventário como Público.
        </p>
      </div>

      <figure v-if="preview.length" class="showcase">
        <ul class="showcase-grid">
          <li v-for="item in preview" :key="item.id">
            <SkinCard :item="item" :to="{ path: '/loja/demo', query: { i: item.id } }" />
          </li>
        </ul>
        <figcaption>
          <span v-if="savings">Preços de exemplo: {{ savings }}% abaixo da Steam.</span>
          <NuxtLink to="/loja/demo">Abrir o catálogo de exemplo</NuxtLink>
        </figcaption>
      </figure>
    </section>
  </main>
</template>

<style scoped>
.home {
  padding-top: 1.25rem;
  padding-bottom: 3rem;
}

.wordmark {
  font-size: var(--step-2);
}

.hero {
  display: grid;
  gap: 3rem;
  margin-top: 2.5rem;
}

.hero-copy {
  display: grid;
  gap: 1.25rem;
  align-content: start;
  max-width: 36rem;
}

.hero-title {
  font-size: clamp(2.75rem, 10vw, 5.25rem);
}

.lead {
  color: var(--muted);
  font-size: var(--step-1);
  line-height: 1.45;
}

.generate {
  display: grid;
  gap: 1.125rem;
  margin-top: 0.75rem;
}

.generate .btn {
  justify-self: start;
  margin-top: 0.25rem;
}

.form-problem {
  padding: 0.875rem 1rem;
  border-left: 3px solid var(--alert);
  background: var(--surface);
  font-size: var(--step--1);
}

.form-problem-title {
  margin-bottom: 0.25rem;
  color: var(--alert);
  font-size: var(--step-0);
  font-weight: 600;
}

.privacy {
  color: var(--muted);
  font-size: var(--step--1);
}

.showcase {
  display: grid;
  align-content: start;
  gap: 1.25rem;
}

.showcase-grid {
  display: grid;
  align-content: start;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem 0.75rem;
}

.showcase figcaption {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  color: var(--muted);
  font-size: var(--step--1);
}

.showcase figcaption a {
  color: var(--muted);
  font-size: var(--step-0);
  text-underline-offset: 3px;
}

@media (min-width: 40rem) {
  .showcase-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 2rem 1.25rem;
  }
}

@media (min-width: 64rem) {
  .hero {
    grid-template-columns: minmax(0, 32rem) minmax(0, 1fr);
    gap: 4rem;
    margin-top: 4rem;
  }
}
</style>
