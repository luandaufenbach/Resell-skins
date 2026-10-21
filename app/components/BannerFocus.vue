<script setup>
// Ponto de foco do banner: toque (ou setas do teclado) no que nunca pode ser cortado. A mira é a
// do jogo. Embaixo, os dois recortes reais: o do celular (3:1) e o do computador (6:1), os mesmos
// do StoreHeader. No toque, só um toque parado muda o ponto: arrastar o dedo rola a página.
const props = defineProps({
  src: { type: String, required: true },
  x: { type: Number, default: 50 },
  y: { type: Number, default: 50 },
})
// `move` a cada mudança (prévia ao vivo); `commit` quando a pessoa solta ou para de usar as setas.
const emit = defineEmits(['move', 'commit'])

const area = ref(null)
let dragging = false
let touchStart = null
let keyTimer

const clamp = (v) => Math.round(Math.min(100, Math.max(0, v)))

function fromPointer(event) {
  const box = area.value.getBoundingClientRect()
  emit('move', { x: clamp(((event.clientX - box.left) / box.width) * 100), y: clamp(((event.clientY - box.top) / box.height) * 100) })
}

function onDown(event) {
  if (event.pointerType !== 'mouse') {
    touchStart = { x: event.clientX, y: event.clientY }
    return
  }
  dragging = true
  area.value.setPointerCapture(event.pointerId)
  fromPointer(event)
}

function onMove(event) {
  if (dragging) fromPointer(event)
}

function onUp(event) {
  if (touchStart) {
    const still = Math.hypot(event.clientX - touchStart.x, event.clientY - touchStart.y) < 10
    touchStart = null
    if (!still) return
    fromPointer(event)
    emit('commit')
    return
  }
  if (!dragging) return
  dragging = false
  emit('commit')
}

// A página começou a rolar: o toque não vale.
function onCancel() {
  touchStart = null
  if (dragging) {
    dragging = false
    emit('commit')
  }
}

const STEP = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }
function onKey(event) {
  const step = STEP[event.key]
  if (!step) return
  event.preventDefault()
  emit('move', { x: clamp(props.x + step[0]), y: clamp(props.y + step[1]) })
  clearTimeout(keyTimer)
  keyTimer = setTimeout(() => emit('commit'), 600)
}
onBeforeUnmount(() => clearTimeout(keyTimer))

const position = computed(() => `${props.x}% ${props.y}%`)
const valueText = computed(() => `${props.x}% da esquerda e ${props.y}% do topo`)
</script>

<template>
  <div class="banner-focus">
    <div
      ref="area"
      class="focus-area"
      tabindex="0"
      role="slider"
      aria-label="Ponto de foco do banner (setas para mover)"
      :aria-valuenow="x"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuetext="valueText"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onCancel"
      @keydown="onKey"
    >
      <img :src="src" alt="" draggable="false" />
      <span class="crosshair" :style="{ left: `${x}%`, top: `${y}%` }" aria-hidden="true">
        <i /><i /><i /><i />
      </span>
    </div>

    <div class="crops" aria-hidden="true">
      <figure>
        <div class="crop crop--phone" :style="{ backgroundImage: `url(${src})`, backgroundPosition: position }" />
        <figcaption>No celular</figcaption>
      </figure>
      <figure>
        <div class="crop crop--desktop" :style="{ backgroundImage: `url(${src})`, backgroundPosition: position }" />
        <figcaption>No computador</figcaption>
      </figure>
    </div>
  </div>
</template>

<style scoped>
.banner-focus {
  display: grid;
  gap: 0.75rem;
}

/* A área tem o tamanho exato da imagem: a posição do toque vira % da imagem. O banner tem no máximo
   16:9, então a imagem inteira cabe sem ficar alta demais. */
.focus-area {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-s);
  cursor: crosshair;
  touch-action: pan-y;
  user-select: none;
}

.focus-area img {
  width: 100%;
  height: auto;
  pointer-events: none;
}

/* Mira do jogo: quatro traços com um vão no meio, brancos com contorno escuro para aparecer em
   qualquer imagem. */
.crosshair {
  position: absolute;
  width: 34px;
  height: 34px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.crosshair i {
  position: absolute;
  background: #fff;
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.85);
}

.crosshair i:nth-child(1),
.crosshair i:nth-child(2) {
  left: 16px;
  width: 2px;
  height: 11px;
}

.crosshair i:nth-child(1) {
  top: 0;
}

.crosshair i:nth-child(2) {
  bottom: 0;
}

.crosshair i:nth-child(3),
.crosshair i:nth-child(4) {
  top: 16px;
  width: 11px;
  height: 2px;
}

.crosshair i:nth-child(3) {
  left: 0;
}

.crosshair i:nth-child(4) {
  right: 0;
}

.crops {
  display: grid;
  grid-template-columns: 1fr 1.6fr;
  gap: 0.75rem;
  align-items: end;
}

.crops figure {
  display: grid;
  gap: 0.25rem;
  margin: 0;
}

.crop {
  border-radius: var(--radius-s);
  background-color: var(--stage);
  background-size: cover;
}

.crop--phone {
  aspect-ratio: 3 / 1;
}

.crop--desktop {
  aspect-ratio: 6 / 1;
}

figcaption {
  color: var(--muted);
  font-size: var(--step--1);
}
</style>
