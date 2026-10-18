<script setup>
useThemeHead()
</script>

<template>
  <!-- Cor pela variável do tema: o servidor e o navegador desenham igual, mesmo com ?cor na loja. -->
  <NuxtLoadingIndicator color="var(--accent-edge)" :height="2" />
  <NuxtPage />
  <SiteFooter />
</template>
