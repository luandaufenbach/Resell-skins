<script setup>
// Barra de desgaste com as faixas reais (FN 0–0,07 ... BS 0,45–1)
// e um marcador na posição exata do float, quando a Steam informa.
const props = defineProps({
  wear: { type: String, required: true },
  float: { type: Number, default: null },
  large: { type: Boolean, default: false },
})

const label = computed(() => wearLabel(props.wear))
</script>

<template>
  <div class="wear" :class="{ 'wear--large': large }">
    <abbr class="wear-id" :title="label">{{ wear }}</abbr>
    <span class="wear-bar" aria-hidden="true">
      <span
        v-for="segment in WEAR_SCALE"
        :key="segment.id"
        class="wear-seg"
        :class="{ 'is-on': segment.id === wear }"
        :style="{ flexGrow: segment.max - segment.min }"
      />
      <span v-if="float != null" class="wear-mark" :style="{ left: `${float * 100}%` }" />
    </span>
    <span v-if="float != null" class="wear-float">{{ formatFloat(float, large ? 8 : 4) }}</span>
  </div>
</template>

<style scoped>
.wear {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--step--1);
  font-variant-numeric: tabular-nums;
}

.wear-id {
  min-width: 1.6em;
  font-weight: 640;
  text-decoration: none;
}

.wear-bar {
  position: relative;
  display: flex;
  flex: 1;
  gap: 1px;
  height: 4px;
}

.wear-seg {
  flex-basis: 0;
  background: var(--line);
}

.wear-seg.is-on {
  background: var(--muted);
}

.wear-mark {
  position: absolute;
  top: -3px;
  width: 2px;
  height: 10px;
  margin-left: -1px;
  background: var(--accent-edge);
}

.wear-float {
  color: var(--muted);
}

.wear--large {
  font-size: var(--step-0);
}

.wear--large .wear-bar {
  height: 6px;
}

.wear--large .wear-mark {
  top: -4px;
  height: 14px;
}

.wear--large .wear-float {
  color: var(--text);
}
</style>
