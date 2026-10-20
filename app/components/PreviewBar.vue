<script setup>
// Faixa da prévia. Avisa a quem receber o link que não é uma loja verificada. Fica presa no pé
// da tela enquanto se rola a loja e, no fim da página, volta ao lugar dela, sem cobrir os últimos
// itens.
const props = defineProps({
  expiresAt: { type: String, required: true },
  // Quem criou a prévia vai para o cadastro já preenchido; quem só recebeu o link, para o início.
  createTo: { type: [String, Object], default: '/' },
})

// Data fixa (e não "faltam X horas") para o servidor e o navegador mostrarem o mesmo texto.
const until = computed(() =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
    .format(new Date(props.expiresAt))
    .replace(', ', ' às '),
)
</script>

<template>
  <aside class="preview-bar" aria-label="Prévia">
    <div class="wrap preview-inner">
      <p class="preview-text">
        <strong>Prévia</strong>
        <span>Loja não verificada. Vale até {{ until }}.</span>
      </p>
      <NuxtLink class="btn btn--primary" :to="createTo">Criar minha loja</NuxtLink>
    </div>
  </aside>
</template>

<style scoped>
.preview-bar {
  position: sticky;
  bottom: 0;
  z-index: 6;
  border-top: 1px solid var(--line);
  background: var(--surface);
}

.preview-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-block: 0.625rem calc(0.625rem + env(safe-area-inset-bottom));
}

.preview-text {
  display: grid;
  line-height: 1.25;
}

.preview-text strong {
  font-size: var(--step-1);
  font-stretch: var(--narrow);
  font-weight: 760;
}

.preview-text span {
  color: var(--muted);
  font-size: var(--step--1);
}

@media (min-width: 48rem) {
  .preview-text {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
  }
}
</style>
