<script setup>
// Caixa de verificação do Cloudflare Turnstile (cadastro e prévia). O token (v-model) vale uma vez
// só: depois de um envio com erro, o formulário chama reset() para receber outro.
const token = defineModel({ type: String, default: '' })

const { turnstileSiteKey } = useRuntimeConfig().public
const { theme } = useTheme()
const box = ref(null)
const failed = ref(false)
let widgetId = null

onMounted(async () => {
  try {
    const turnstile = await loadTurnstile()
    if (!box.value) return
    widgetId = turnstile.render(box.value, {
      sitekey: turnstileSiteKey,
      theme: theme.value.scheme === 'light' ? 'light' : 'dark',
      language: 'pt-br',
      size: 'flexible',
      callback: (value) => (token.value = value),
      'expired-callback': () => (token.value = ''),
      'error-callback': () => {
        token.value = ''
      },
    })
  } catch {
    failed.value = true
  }
})

onBeforeUnmount(() => {
  if (widgetId != null) window.turnstile?.remove(widgetId)
})

defineExpose({
  reset() {
    token.value = ''
    if (widgetId != null) window.turnstile?.reset(widgetId)
  },
})
</script>

<script>
// O script da Cloudflare carrega uma vez só, mesmo com o formulário montado de novo.
let loading = null

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => resolve(window.turnstile)
    script.onerror = () => {
      loading = null
      script.remove()
      reject(new Error('Turnstile não carregou'))
    }
    document.head.append(script)
  })
  return loading
}
</script>

<template>
  <div class="turnstile">
    <div ref="box" class="turnstile-box" />
    <p v-if="failed" class="turnstile-failed" role="alert">
      A verificação de segurança não carregou. Confira a internet e recarregue a página.
    </p>
  </div>
</template>

<style scoped>
/* Altura da caixa da Cloudflare reservada, para o botão abaixo não pular quando ela aparece. */
.turnstile-box {
  min-height: 65px;
}

.turnstile-failed {
  color: var(--alert);
  font-size: var(--step--1);
}
</style>
