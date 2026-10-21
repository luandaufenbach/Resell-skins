// Itens da loja no painel (com os ajustes e o custo), lidos só no navegador e quando a aba precisa.
// Itens e Preços usam a mesma lista (mesma chave).
export function usePanelItems() {
  const result = useFetch('/api/painel/itens', { key: 'painel-itens', server: false, lazy: true })

  /** Troca os ajustes de um item na lista, depois de salvar. O `data` do useFetch é raso: troca a lista. */
  function patchItem(id, settings) {
    const current = result.data.value
    if (!current?.items) return
    result.data.value = {
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, ...settings } : item)),
    }
  }

  return { ...result, patchItem }
}
