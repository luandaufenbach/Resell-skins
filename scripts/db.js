// Conexão dos scripts com o Postgres do Supabase. O TLS é verificado contra a CA do Supabase
// (supabase/prod-ca-2021.crt, válida até 2031); sem isso, quem interceptasse a rede poderia se
// passar pelo banco e pegar a senha.
import { readFileSync } from 'node:fs'
import postgres from 'postgres'

const CA = readFileSync(new URL('../supabase/prod-ca-2021.crt', import.meta.url), 'utf8')

export function connect(url) {
  return postgres(url, { ssl: { ca: CA, rejectUnauthorized: true }, max: 1, prepare: false, onnotice: () => {} })
}

/** Mensagem de erro que pode ir para log público: sem host, usuário nem corpo de resposta. */
export function safeError(error) {
  return error.code ? `código ${error.code}` : error.message
}
