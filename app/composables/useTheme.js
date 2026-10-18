// Tema da página atual. A loja troca as opções (cor e fundo); as outras páginas usam o padrão.
export function useTheme() {
  const options = useState('tema', () => ({}))
  const theme = computed(() => buildTheme(options.value))
  return { options, theme }
}

// Aplica o tema no <html>, já na resposta do servidor, para a página não piscar com outra cor.
// Usado no app.vue e no error.vue (a página de erro não passa pelo app.vue).
export function useThemeHead() {
  const { theme } = useTheme()
  useHead(() => ({
    htmlAttrs: { style: themeStyle(theme.value) },
    meta: [{ name: 'theme-color', content: theme.value.bg }],
  }))
  return theme
}
