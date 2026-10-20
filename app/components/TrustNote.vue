<template>
  <div class="trust">
    <AppIcon name="lock" />
    <div>
      <p class="trust-title">Não pedimos login da Steam. Usamos só o seu inventário público.</p>
      <p class="trust-body">Nenhum campo pede a senha da Steam, código do Steam Guard ou chave de API.</p>
    </div>
  </div>
</template>

<style scoped>
.trust {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-left: 3px solid var(--accent-edge);
  border-radius: 0 var(--radius-m) var(--radius-m) 0;
  background: var(--surface);
}

.trust svg {
  width: 20px;
  height: 20px;
  margin-top: 0.125rem;
}

.trust-title {
  font-weight: 620;
  line-height: 1.35;
}

.trust-body {
  margin-top: 0.25rem;
  color: var(--muted);
  font-size: var(--step--1);
}
</style>
