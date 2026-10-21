// Ações do painel: chama a API, avisa quem chamou quando a loja muda e guarda o erro da última
// ação para mostrar perto do botão certo. Sessão vencida leva para /entrar.
export function usePanelAction(onStore = () => {}) {
  const busy = ref(null)
  const problem = ref(null)

  async function act(name, url, options = {}) {
    problem.value = null
    busy.value = name
    try {
      const result = await $fetch(url, { method: 'POST', ...options })
      if (result?.store) onStore(result.store)
      return result ?? {}
    } catch (error) {
      if (errorCode(error) === 'AUTH_REQUIRED') {
        await navigateTo('/entrar')
        return null
      }
      problem.value = { action: name, code: errorCode(error), ...error?.data?.data, ...accountMessage(error) }
      return null
    } finally {
      busy.value = null
    }
  }

  const problemFor = (...names) => (names.includes(problem.value?.action) ? problem.value : null)

  return { busy, problem, act, problemFor }
}
