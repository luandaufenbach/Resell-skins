<script setup>
// Aba "Marca" do painel: logo e banner (com ponto de foco), cores, nome, frase, WhatsApp, redes e
// endereço. Imagens, cores e foco gravam na hora; os textos, no botão Salvar. A prévia ao lado
// (no celular, depois das cores) mostra o que ainda não foi salvo.
const props = defineProps({
  store: { type: Object, required: true },
  host: { type: String, required: true },
})
const emit = defineEmits(['update'])

const { busy, act, problemFor } = usePanelAction((store) => emit('update', store))
const brand = computed(() => props.store.brand)

// ---- Logo e banner
const MAX_UPLOAD = 8 * 1024 * 1024
const localProblem = ref(null)

async function upload(kind, event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  localProblem.value = null
  if (!file) return
  if (file.size > MAX_UPLOAD) {
    localProblem.value = { action: kind, ...accountMessage({ data: { code: 'IMAGE_TOO_LARGE' } }) }
    return
  }
  await act(kind, `/api/painel/imagem?tipo=${kind}`, {
    body: file,
    headers: { 'content-type': file.type || 'application/octet-stream' },
  })
}

function removeImage(kind) {
  localProblem.value = null
  return act(kind, `/api/painel/imagem?tipo=${kind}`, { method: 'DELETE' })
}

const imageProblem = (kind) => (localProblem.value?.action === kind ? localProblem.value : problemFor(kind))

// Ponto de foco: a prévia muda junto; grava quando a pessoa solta.
const focus = reactive({ ...brand.value.focus })
watch(
  () => brand.value.banner,
  () => Object.assign(focus, brand.value.focus),
)
const saveFocus = () => act('foco', '/api/painel/marca', { body: { focus: { x: focus.x, y: focus.y } } })

// ---- Cores: gravam sozinhas, um instante depois da última mudança.
const PRESETS = [
  { hex: 'ff7a1a', label: 'Laranja' },
  { hex: '2bc26b', label: 'Verde' },
  { hex: '3d8bff', label: 'Azul' },
  { hex: 'ff4f8b', label: 'Rosa' },
  { hex: 'ffcf33', label: 'Amarelo' },
]
const color = ref(brand.value.theme.cor)
const background = ref(brand.value.theme.fundo)
const logoSuggestions = ref([])

async function readLogoColors() {
  logoSuggestions.value = []
  if (!brand.value.logo) return
  try {
    logoSuggestions.value = await logoColors(brand.value.logo)
  } catch {
    // Sem as cores da logo (imagem não carregou), ficam só as prontas.
  }
}
onMounted(readLogoColors)
watch(() => brand.value.logo, readLogoColors)

let colorTimer
watch([color, background], () => {
  clearTimeout(colorTimer)
  colorTimer = setTimeout(
    () => act('cor', '/api/painel/marca', { body: { color: color.value, background: background.value } }),
    500,
  )
})
onBeforeUnmount(() => clearTimeout(colorTimer))

const baseAccent = computed(() => buildTheme({ fundo: background.value }).accent)
const customColor = computed({
  get: () => `#${color.value ?? 'ff7a1a'}`,
  set: (value) => (color.value = value.replace('#', '').toLowerCase()),
})
const PRESET_NAMES = Object.fromEntries(PRESETS.map((p) => [p.hex, p.label]))
// Nome da cor escolhida, escrito ao lado das amostras: no celular não há "title" ao passar o mouse.
const colorName = computed(() => {
  if (!color.value) return 'Padrão'
  if (PRESET_NAMES[color.value]) return PRESET_NAMES[color.value]
  const origin = logoSuggestions.value.includes(color.value) ? 'Da logo' : 'Outra cor'
  return `${origin}, #${color.value.toUpperCase()}`
})
const isCustom = computed(
  () => color.value && !PRESETS.some((p) => p.hex === color.value) && !logoSuggestions.value.includes(color.value),
)

// ---- Nome e contato
const info = reactive({
  name: brand.value.name ?? '',
  tagline: brand.value.tagline ?? '',
  whatsapp: formatPhone(props.store.whatsapp),
  socials: Object.fromEntries(SOCIALS.map((s) => [s.id, props.store.handles?.[s.id] ?? ''])),
})
const infoSaved = ref(false)
const infoLocal = ref(null)

// Usuário de cada rede como vai ficar ('' vazio, null quando não serve).
const handles = computed(() => Object.fromEntries(SOCIALS.map((s) => [s.id, socialHandle(s.id, info.socials[s.id])])))

async function saveInfo() {
  infoLocal.value = null
  infoSaved.value = false
  const whatsapp = normalizePhone(info.whatsapp)
  const badNetwork = SOCIALS.find((s) => handles.value[s.id] === null)
  if (whatsapp.length < 12) infoLocal.value = accountMessage({ data: { code: 'INVALID_PHONE' } })
  else if (badNetwork) infoLocal.value = { ...accountMessage({ data: { code: 'SOCIAL_INVALID' } }), network: badNetwork.id }
  if (infoLocal.value) return

  const result = await act('info', '/api/painel/marca', {
    body: { name: info.name, tagline: info.tagline, whatsapp, socials: handles.value },
  })
  if (!result) return
  info.socials = Object.fromEntries(SOCIALS.map((s) => [s.id, handles.value[s.id] ?? '']))
  // Depois do watch abaixo, que apaga o "Salvo" quando o formulário muda.
  await nextTick()
  infoSaved.value = true
}

const infoProblem = computed(() => infoLocal.value ?? problemFor('info'))
const fieldProblem = (field) => (infoProblem.value?.field === field ? infoProblem.value : null)
const networkProblem = (id) => (infoProblem.value?.network === id ? infoProblem.value : null)
watch(info, () => (infoSaved.value = false), { deep: true })

// ---- Endereço
const slug = ref(props.store.slug)
const slugSaved = ref(false)
const slugLocal = ref(null)

async function saveSlug() {
  slugLocal.value = null
  slugSaved.value = false
  const code = slugProblem(slug.value)
  if (code) {
    slugLocal.value = accountMessage({ data: { code } })
    return
  }
  if (await act('endereco', '/api/painel/endereco', { body: { slug: slug.value } })) slugSaved.value = true
}
const slugError = computed(() => slugLocal.value ?? problemFor('endereco'))

// ---- Prévia: o que está na tela, salvo ou não.
const previewBrand = computed(() => ({
  ...brand.value,
  name: info.name,
  tagline: info.tagline.trim() || null,
  focus: { ...focus },
  socials: socialLinks(Object.fromEntries(Object.entries(handles.value).filter(([, h]) => h))),
}))
const previewName = computed(() => info.name.trim() || props.store.name || props.store.slug)
const previewTheme = computed(() => ({ cor: color.value, fundo: background.value }))
</script>

<template>
  <div class="brand">
    <!-- Logo e banner -->
    <section class="brand-block" aria-labelledby="imagens">
      <h2 id="imagens" class="block-title">Logo e banner</h2>
      <p v-if="!store.verified" class="field-hint">
        Logo e banner ficam liberados depois que você verificar o inventário, na aba Loja.
      </p>

      <div class="image-row">
        <div class="logo-box" :class="{ 'is-empty': !brand.logo }">
          <img v-if="brand.logo" :src="brand.logo" alt="Logo atual" width="88" height="88" />
          <span v-else>Sem logo</span>
        </div>
        <div class="image-actions">
          <label class="btn file-btn" :class="{ 'is-busy': busy === 'logo' }">
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" :disabled="busy === 'logo' || !store.verified" @change="upload('logo', $event)" />
            {{ busy === 'logo' ? 'Enviando…' : brand.logo ? 'Trocar logo' : 'Enviar logo' }}
          </label>
          <button v-if="brand.logo" class="link-button" type="button" :disabled="busy === 'logo'" @click="removeImage('logo')">
            Tirar a logo
          </button>
          <p class="field-hint">PNG, JPG ou WebP, até 8 MB. Quadrada e com fundo transparente fica melhor.</p>
        </div>
      </div>
      <FormProblem v-if="imageProblem('logo')" :problem="imageProblem('logo')" />

      <div class="banner-row">
        <p v-if="brand.banner" class="field-hint">
          Toque no que nunca pode ser cortado. O banner é recortado em volta desse ponto.
        </p>
        <BannerFocus
          v-if="brand.banner"
          :src="brand.banner"
          :x="focus.x"
          :y="focus.y"
          @move="Object.assign(focus, $event)"
          @commit="saveFocus"
        />
        <div class="image-actions">
          <label class="btn file-btn" :class="{ 'is-busy': busy === 'banner' }">
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" :disabled="busy === 'banner' || !store.verified" @change="upload('banner', $event)" />
            {{ busy === 'banner' ? 'Enviando…' : brand.banner ? 'Trocar banner' : 'Enviar banner' }}
          </label>
          <button v-if="brand.banner" class="link-button" type="button" :disabled="busy === 'banner'" @click="removeImage('banner')">
            Tirar o banner
          </button>
          <p class="field-hint">Imagem larga, com pelo menos 600 px de largura (1600 × 400 fica bom). Até 8 MB.</p>
        </div>
      </div>
      <FormProblem v-if="imageProblem('banner') || problemFor('foco')" :problem="imageProblem('banner') || problemFor('foco')" />
    </section>

    <!-- Cores -->
    <section class="brand-block" aria-labelledby="cores">
      <h2 id="cores" class="block-title">Cores</h2>

      <fieldset class="control">
        <legend>Cor de destaque</legend>
        <p class="field-hint">Botões, filtros ativos e a etiqueta de reservado. O contraste do texto se ajusta sozinho.</p>
        <div v-if="logoSuggestions.length" class="swatch-group">
          <span class="swatch-group-label">Da sua logo</span>
          <div class="swatches">
            <label v-for="hex in logoSuggestions" :key="hex" class="swatch" :title="`#${hex}`">
              <input v-model="color" type="radio" name="cor" :value="hex" />
              <span class="swatch-dot" :style="{ background: `#${hex}` }" />
              <span class="visually-hidden">Cor da logo #{{ hex }}</span>
            </label>
          </div>
        </div>
        <div class="swatch-group">
          <span v-if="logoSuggestions.length" class="swatch-group-label">Outras</span>
          <div class="swatches">
            <label class="swatch" title="Padrão">
              <input v-model="color" type="radio" name="cor" :value="null" />
              <span class="swatch-dot swatch-dot--base" :style="{ background: baseAccent }" />
              <span class="visually-hidden">Padrão</span>
            </label>
            <label v-for="p in PRESETS" :key="p.hex" class="swatch" :title="p.label">
              <input v-model="color" type="radio" name="cor" :value="p.hex" />
              <span class="swatch-dot" :style="{ background: `#${p.hex}` }" />
              <span class="visually-hidden">{{ p.label }}</span>
            </label>
            <label class="swatch swatch--custom" :class="{ 'is-on': isCustom }" title="Outra cor">
              <input v-model="customColor" type="color" />
              <span class="swatch-dot" :style="{ background: isCustom ? `#${color}` : undefined }" />
              <span class="visually-hidden">Outra cor</span>
            </label>
          </div>
        </div>
        <p class="color-name" aria-live="polite">Escolhida: {{ colorName }}</p>
      </fieldset>

      <fieldset class="control">
        <legend>Fundo</legend>
        <div class="modes">
          <label class="mode">
            <input v-model="background" type="radio" name="fundo" value="escuro" />
            <span>Escuro</span>
          </label>
          <label class="mode">
            <input v-model="background" type="radio" name="fundo" value="claro" />
            <span>Claro</span>
          </label>
        </div>
      </fieldset>
      <p v-if="busy === 'cor'" class="field-hint" role="status">Salvando as cores…</p>
      <FormProblem v-if="problemFor('cor')" :problem="problemFor('cor')" />
    </section>

    <BrandPreview class="brand-preview" :name="previewName" :avatar="store.avatar" :brand="previewBrand" :theme="previewTheme" />

    <!-- Nome e contato -->
    <form class="brand-block" aria-labelledby="nome" novalidate @submit.prevent="saveInfo">
      <h2 id="nome" class="block-title">Nome e contato</h2>

      <label class="field">
        <span class="field-label">Nome da loja</span>
        <input
          v-model="info.name"
          class="input"
          maxlength="40"
          :placeholder="store.name || 'Nome da sua loja'"
          :aria-invalid="fieldProblem('nome') ? 'true' : undefined"
        />
        <span class="field-hint">Vazio, a loja usa o nome do seu perfil na Steam.</span>
      </label>
      <FormProblem v-if="fieldProblem('nome')" :problem="fieldProblem('nome')" />

      <label class="field">
        <span class="field-label">Frase <span class="field-optional">(opcional)</span></span>
        <input
          v-model="info.tagline"
          class="input"
          maxlength="120"
          placeholder="Uma linha sobre a sua loja"
          :aria-invalid="fieldProblem('frase') ? 'true' : undefined"
        />
        <span class="field-hint">{{ info.tagline.length }}/120</span>
      </label>
      <FormProblem v-if="fieldProblem('frase')" :problem="fieldProblem('frase')" />

      <label class="field">
        <span class="field-label">WhatsApp para pedidos</span>
        <input
          v-model="info.whatsapp"
          class="input"
          type="tel"
          inputmode="tel"
          autocomplete="tel"
          placeholder="(48) 99999-9999"
          :aria-invalid="fieldProblem('whatsapp') ? 'true' : undefined"
        />
        <span class="field-hint">Os botões de pedir da loja abrem este número.</span>
      </label>
      <FormProblem v-if="fieldProblem('whatsapp')" :problem="fieldProblem('whatsapp')" />

      <fieldset class="control socials">
        <legend>Redes <span class="field-optional">(opcional)</span></legend>
        <p class="field-hint">Digite só o usuário ou cole o link do seu perfil. A loja monta o link.</p>
        <template v-for="s in SOCIALS" :key="s.id">
          <label class="social">
            <span class="social-name">{{ s.label }}</span>
            <span class="input social-input" :class="{ 'is-invalid': handles[s.id] === null }">
              <span class="social-prefix" aria-hidden="true">{{ s.prefix }}</span>
              <input
                v-model="info.socials[s.id]"
                autocapitalize="none"
                autocomplete="off"
                spellcheck="false"
                :aria-label="`${s.label}: usuário`"
                :aria-invalid="handles[s.id] === null ? 'true' : undefined"
              />
            </span>
          </label>
          <FormProblem v-if="networkProblem(s.id)" :problem="networkProblem(s.id)" />
        </template>
      </fieldset>

      <FormProblem v-if="infoProblem && !infoProblem.field && !infoProblem.network" :problem="infoProblem" />
      <div class="save-row">
        <button class="btn btn--primary" type="submit" :disabled="busy === 'info'">
          {{ busy === 'info' ? 'Salvando…' : 'Salvar' }}
        </button>
        <p v-if="infoSaved" class="done" role="status">Salvo. A loja já mostra as mudanças.</p>
      </div>
    </form>

    <!-- Endereço -->
    <form class="brand-block" aria-labelledby="endereco" novalidate @submit.prevent="saveSlug">
      <h2 id="endereco" class="block-title">Endereço da loja</h2>
      <label class="field">
        <span class="field-label">Endereço</span>
        <span class="input slug-input" :class="{ 'is-invalid': slugError }">
          <span class="social-prefix" aria-hidden="true">{{ host }}/</span>
          <input
            :value="slug"
            autocapitalize="none"
            autocomplete="off"
            spellcheck="false"
            maxlength="30"
            aria-label="Endereço da loja"
            :aria-invalid="slugError ? 'true' : undefined"
            @input="slug = cleanSlug($event.target.value)"
          />
        </span>
        <span class="field-hint">
          O endereço antigo continua levando para a loja por 60 dias e ninguém pode usá-lo nesse tempo. Depois, ele
          fica livre.
        </span>
      </label>
      <FormProblem v-if="slugError" :problem="slugError" />
      <div class="save-row">
        <button class="btn" type="submit" :disabled="busy === 'endereco' || slug === store.slug">
          {{ busy === 'endereco' ? 'Trocando…' : 'Trocar endereço' }}
        </button>
        <p v-if="slugSaved" class="done" role="status">Pronto. A loja agora fica em {{ host }}/{{ store.slug }}.</p>
      </div>
    </form>
  </div>
</template>

<style scoped>
.brand {
  display: grid;
  gap: 2rem;
  max-width: 34rem;
}

.brand-block {
  display: grid;
  gap: 1rem;
  align-content: start;
}

.brand-block:not(:first-child) {
  padding-top: 1.5rem;
  border-top: 1px solid var(--line);
}

.block-title {
  font-size: var(--step-2);
  font-stretch: var(--semi);
  font-weight: 680;
  line-height: 1.15;
}

/* Computador: formulário à esquerda e prévia presa à direita. */
@media (min-width: 64rem) {
  .brand {
    grid-template-columns: minmax(0, 40rem) minmax(0, 26rem);
    column-gap: 3.5rem;
    max-width: none;
  }

  .brand > .brand-block {
    grid-column: 1;
  }

  .brand-preview {
    position: sticky;
    top: 1.5rem;
    grid-column: 2;
    grid-row: 1 / span 4;
    align-self: start;
  }

}

/* ---- Imagens */
.image-row {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.logo-box {
  display: grid;
  flex: none;
  place-items: center;
  width: 88px;
  height: 88px;
  border-radius: var(--radius-m);
  background: var(--surface);
}

.logo-box img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.logo-box.is-empty {
  border: 1px dashed var(--field-line);
  background: transparent;
  color: var(--muted);
  font-size: var(--step--1);
}

.banner-row {
  display: grid;
  gap: 0.75rem;
}

.image-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
}

.image-actions .field-hint {
  width: 100%;
}

/* O input de arquivo fica dentro do botão: o rótulo é o alvo de toque. */
.file-btn {
  position: relative;
}

.file-btn input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.file-btn:focus-within {
  outline: 2px solid var(--accent-edge);
  outline-offset: 2px;
}

.file-btn.is-busy,
.file-btn:has(input:disabled) {
  opacity: 0.7;
}

.file-btn:has(input:disabled) input {
  cursor: default;
}

.link-button {
  min-height: 44px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--text);
  font-size: var(--step-0);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.link-button:disabled {
  color: var(--muted);
  cursor: default;
}

/* ---- Cores */
.control {
  display: grid;
  gap: 0.625rem;
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

.control legend {
  padding: 0;
  margin-bottom: 0.25rem;
  font-weight: 560;
}

.swatch-group {
  display: grid;
  gap: 0.375rem;
}

.swatch-group-label {
  color: var(--muted);
  font-size: var(--step--1);
}

.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.swatch {
  position: relative;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  cursor: pointer;
}

.swatch input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

/* A borda aparece em qualquer cor, inclusive nas escuras como o fundo do painel. */
.swatch-dot {
  width: 30px;
  height: 30px;
  border: 1px solid var(--field-line);
  border-radius: var(--radius-s);
}

.color-name {
  color: var(--muted);
  font-size: var(--step--1);
}

.swatch input:checked + .swatch-dot,
.swatch--custom.is-on .swatch-dot {
  outline: 2px solid var(--text);
  outline-offset: 3px;
}

.swatch input:focus-visible + .swatch-dot {
  outline: 2px solid var(--accent-edge);
  outline-offset: 3px;
}

/* "Outra cor": quadrado tracejado com um +, até a pessoa escolher. */
.swatch--custom .swatch-dot {
  display: grid;
  place-items: center;
  border: 1px dashed var(--field-line);
}

.swatch--custom:not(.is-on) .swatch-dot::after {
  content: '+';
  color: var(--muted);
  font-size: var(--step-1);
  line-height: 1;
}

.modes {
  display: inline-flex;
  justify-self: start;
  border: 1px solid var(--field-line);
  border-radius: var(--radius-m);
}

.mode {
  position: relative;
}

.mode input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.mode span {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 1.1rem;
  font-stretch: var(--semi);
  font-weight: 600;
}

.mode input:checked + span {
  background: var(--accent);
  color: var(--accent-ink);
}

.mode:first-child input:checked + span {
  border-radius: var(--radius-m) 0 0 var(--radius-m);
}

.mode:last-child input:checked + span {
  border-radius: 0 var(--radius-m) var(--radius-m) 0;
}

.mode input:focus-visible + span {
  outline: 2px solid var(--accent-edge);
  outline-offset: 2px;
}

/* ---- Redes e endereço: campo com o começo do link fixo à esquerda. */
.socials {
  gap: 0.75rem;
}

.social {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
}

.social-name {
  font-stretch: var(--semi);
  font-weight: 600;
}

.social-input,
.slug-input {
  display: flex;
  align-items: center;
  padding: 0;
  overflow: hidden;
}

.social-input:focus-within,
.slug-input:focus-within {
  border-color: var(--accent-edge);
  outline: 2px solid var(--accent-edge);
  outline-offset: 0;
}

.social-input.is-invalid,
.slug-input.is-invalid {
  border-color: var(--alert);
}

.social-prefix {
  flex: none;
  padding-left: 0.875rem;
  color: var(--muted);
  white-space: nowrap;
}

.slug-input .social-prefix {
  max-width: 55%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.social-input input,
.slug-input input {
  flex: 1;
  min-width: 0;
  min-height: 46px;
  padding: 0 0.875rem 0 0.125rem;
  border: 0;
  background: none;
  outline: none;
}

.save-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
}

.done {
  font-weight: 560;
}
</style>
