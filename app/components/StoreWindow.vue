<script setup>
// Vitrine de exemplo ao lado dos formulários de conta, no computador: skins de verdade da loja de
// exemplo, com os cards da loja, sob o endereço que a loja vai ter. No cadastro, o endereço muda
// enquanto a pessoa digita. Os cards não abrem: sair da tela no meio do cadastro perderia o que
// foi digitado.
defineProps({
  slug: { type: String, default: '' },
})

const host = useSiteUrl().replace(/^https?:\/\//, '')
const { data: items } = useFetch('/api/demo', {
  key: 'vitrine-exemplo',
  transform: (store) =>
    SHOWCASE_ITEMS.map((name) => store.items.find((item) => item.marketName === name)).filter(Boolean),
})
</script>

<template>
  <figure v-if="items?.length" class="window">
    <div class="window-address">
      <AppIcon name="lock" />
      <span class="window-url">{{ host }}/<strong>{{ slug || 'sua-loja' }}</strong></span>
    </div>
    <ul class="window-grid" inert>
      <li v-for="item in items" :key="item.id">
        <SkinCard :item="item" />
      </li>
    </ul>
    <figcaption class="window-caption">
      Assim aparece cada skin na sua loja. Exemplo com itens fictícios e preços da Steam de hoje.
    </figcaption>
  </figure>
</template>

<style scoped>
.window {
  margin: 0;
  padding: 1rem 1.25rem 1.25rem;
  border: 1px solid var(--line);
  border-radius: var(--radius-m);
  background: var(--stage);
}

/* O endereço da loja é o que o revendedor vai mandar para os clientes: fica no topo, como a
   barra do navegador de quem abre o link. */
.window-address {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  border-radius: var(--radius-s);
  background: var(--surface);
  color: var(--muted);
}

.window-address svg {
  flex: none;
  width: 16px;
  height: 16px;
}

.window-url {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.window-url strong {
  color: var(--text);
  font-weight: 620;
}

.window-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem 1rem;
  margin-top: 1.25rem;
}

.window-caption {
  margin-top: 1.25rem;
  color: var(--muted);
  font-size: var(--step--1);
}
</style>
