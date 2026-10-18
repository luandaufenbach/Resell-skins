const SCOPED = Symbol('tema-local')

// Tema da página atual. A loja troca as opções (cor e fundo); as outras páginas usam o padrão.
// Dentro de um tema local (a demonstração da página inicial), devolve o tema local.
export function useTheme() {
  const scoped = inject(SCOPED, null)
  if (scoped) return scoped
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

// Tema só de um pedaço da página: os componentes dentro dele (cards, ficha) usam este tema, e
// quem chama aplica `themeStyle(theme)` no elemento que envolve o pedaço. `options` é um ref
// (ou computed) com { cor, fundo }.
export function useScopedTheme(options) {
  const theme = computed(() => buildTheme(unref(options)))
  provide(SCOPED, { options, theme })
  return theme
}
