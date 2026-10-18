// Acesso ao banco pela API do Supabase, com a chave secreta (ignora o RLS). Só o servidor usa.

export function supabase(path, { headers, ...options } = {}) {
  const { supabaseUrl, supabaseSecretKey } = useRuntimeConfig()
  if (!supabaseUrl || !supabaseSecretKey) throw new Error('NUXT_SUPABASE_URL ou NUXT_SUPABASE_SECRET_KEY ausente')

  return $fetch(path, {
    baseURL: supabaseUrl,
    headers: { apikey: supabaseSecretKey, Authorization: `Bearer ${supabaseSecretKey}`, ...headers },
    timeout: 8000,
    retry: 1,
    ...options,
  })
}

/** Valores da tabela de configuração: { chave: valor } só com as chaves pedidas. */
export async function readConfig(keys) {
  const rows = await supabase('/rest/v1/configuracao', {
    query: { chave: `in.(${keys.join(',')})`, select: 'chave,valor' },
  })
  return Object.fromEntries(rows.map((row) => [row.chave, row.valor]))
}
