<script setup>
// Prévia do topo da loja no painel, no tema escolhido (cor e fundo), com os componentes de
// verdade. Mostra o que ainda não foi salvo; os botões não funcionam aqui (inert).
const props = defineProps({
  name: { type: String, required: true },
  avatar: { type: String, default: null },
  brand: { type: Object, required: true },
  // { cor, fundo }
  theme: { type: Object, required: true },
})

const theme = useScopedTheme(computed(() => props.theme))
const style = computed(() => themeStyle(theme.value))
const chips = ['Tudo', 'Facas', 'Rifles', 'Pistolas']
</script>

<template>
  <figure class="brand-preview">
    <figcaption>Como a loja aparece no celular</figcaption>
    <div class="frame" :style="style" inert>
      <StoreHeader :name="name" :avatar="avatar" :brand="brand" profile-url="#">
        <span class="btn btn--primary">
          <AppIcon name="chat" />
          Chamar no WhatsApp
        </span>
        <span class="btn copy-icon" aria-label="Copiar link da loja">
          <AppIcon name="link" />
        </span>
      </StoreHeader>
      <div class="frame-chips">
        <span v-for="(chip, i) in chips" :key="chip" class="chip" :aria-pressed="i === 0">{{ chip }}</span>
      </div>
    </div>
  </figure>
</template>

<style scoped>
.brand-preview {
  display: grid;
  gap: 0.5rem;
  margin: 0;
}

figcaption {
  color: var(--muted);
  font-size: var(--step--1);
}

/* Largura de celular, com o fundo e as cores do tema da loja. */
.frame {
  width: 100%;
  max-width: 390px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--radius-m);
  background: var(--bg);
  color: var(--text);
}

.frame :deep(.wrap) {
  padding-inline: 16px;
}

.copy-icon {
  width: 44px;
  padding: 0;
}

.frame-chips {
  display: flex;
  gap: 0.375rem;
  padding: 0.75rem 16px 1rem;
  overflow: hidden;
  border-top: 1px solid var(--line);
}
</style>
