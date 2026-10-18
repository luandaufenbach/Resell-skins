<script setup>
const theme = useThemeHead()
</script>

<template>
  <NuxtLoadingIndicator :color="theme.accentEdge" :height="2" />
  <NuxtPage />
</template>
