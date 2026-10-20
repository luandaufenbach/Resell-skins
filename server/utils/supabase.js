// Acesso ao Supabase. Só o servidor usa: o navegador não recebe nenhuma chave.

/** API do banco com a chave secreta (ignora o RLS). Para gravar e para o que é público. */
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

/**
 * Chamada como o revendedor: chave publishable mais o token da sessão dele. No banco o RLS vale,
 * então ele só enxerga a própria loja. Sem token, é a API de Auth (cadastro, login, senha).
 */
export function supabaseAs(token, path, { headers, ...options } = {}) {
  const { supabaseUrl, supabasePublishableKey } = useRuntimeConfig()
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('NUXT_SUPABASE_URL ou NUXT_SUPABASE_PUBLISHABLE_KEY ausente')
  }

  return $fetch(path, {
    baseURL: supabaseUrl,
    headers: {
      apikey: supabasePublishableKey,
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    timeout: 8000,
    // Login, cadastro e troca de token não podem ser repetidos sozinhos: o token de renovação vale
    // uma vez só.
    retry: 0,
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

/** Erro do banco ou da Auth: { status, code } (code é o error_code da Auth ou o SQLSTATE do banco). */
export function supabaseError(error) {
  return {
    status: error?.response?.status ?? error?.statusCode ?? 0,
    code: error?.data?.error_code ?? error?.data?.code ?? null,
  }
}

/** Banco fora do ar: 503 para a tela mostrar "tente de novo em alguns minutos". */
export function unavailable(scope, error) {
  console.error(`[${scope}] banco indisponível:`, error?.message)
  return createError({
    statusCode: 503,
    statusMessage: 'Banco indisponível',
    data: { code: 'UNAVAILABLE' },
  })
}
