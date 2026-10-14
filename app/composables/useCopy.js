// Copia um texto e deixa `copied` verdadeiro por 2 segundos.
export function useCopy() {
  const copied = ref(false)
  let timer

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return false
    }
    copied.value = true
    clearTimeout(timer)
    timer = setTimeout(() => (copied.value = false), 2000)
    return true
  }

  onBeforeUnmount(() => clearTimeout(timer))
  return { copied, copy }
}
