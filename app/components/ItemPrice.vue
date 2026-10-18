<script setup>
// Preço do item: o do revendedor, a economia e o preço Steam riscado ("de ... por ...").
// O riscado some quando não há economia. Preço Steam estimado leva "≈".
const props = defineProps({
  price: { type: Object, default: null },
  large: { type: Boolean, default: false },
})

const savings = computed(() => savingsPercent(props.price))
</script>

<template>
  <div class="price" :class="{ 'price--large': large }">
    <template v-if="price">
      <p v-if="savings" class="price-steam">
        <!-- Numa linha só: o Vue apaga o espaço entre tags separadas por quebra de linha. -->
        Steam <abbr v-if="price.estimated" class="price-approx" title="Estimado a partir do menor anúncio na Steam">≈</abbr> <s>{{ formatBRL(price.steam) }}</s>
      </p>
      <p class="price-main">
        <span class="price-seller">{{ formatBRL(price.seller) }}</span>
        <span v-if="savings" class="price-off">−{{ savings }}%</span>
      </p>
    </template>
    <p v-else class="price-main price-ask">Sob consulta</p>
  </div>
</template>

<style scoped>
.price {
  display: grid;
  gap: 0.125rem;
  font-variant-numeric: tabular-nums;
}

.price-steam {
  color: var(--muted);
  font-size: var(--step--1);
  line-height: 1.2;
}

.price-steam s {
  text-decoration-thickness: 1px;
}

.price-approx {
  text-decoration: none;
}

.price-main {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.375rem;
}

/* Menor e mais pesado que o nome do card, para não parecer um segundo título. */
.price-seller,
.price-ask {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.2;
}

.price-off {
  padding: 0 0.25rem;
  border: 1px solid var(--accent-edge);
  border-radius: var(--radius-s);
  color: var(--accent-text);
  font-size: var(--step--1);
  font-weight: 620;
  line-height: 1.35;
}

.price--large .price-steam {
  font-size: var(--step-0);
}

.price--large .price-seller,
.price--large .price-ask {
  font-size: var(--step-3);
  font-stretch: var(--narrow);
  font-weight: 760;
}
</style>
