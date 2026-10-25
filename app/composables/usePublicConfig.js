// Valores públicos da configuração (planos e WhatsApp do dono), lidos uma vez por página. Quando o banco falha, os campos vêm nulos.
export function usePublicConfig() {
  return useFetch('/api/configuracao', { key: 'configuracao' })
}
