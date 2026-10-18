// Aplica as migrações de supabase/migrations que ainda não rodaram, em ordem alfabética
// (o nome começa com a data), cada uma numa transação. Uso: npm run migrar
// Lê SUPABASE_DB_URL (papel dono do banco) do .env; essa URL fica só na máquina do dono.
// O registro do que já rodou fica em interno.migracoes, num schema que a API não expõe.
import { readdir, readFile } from 'node:fs/promises'
import { connect } from './db.js'

const DIR = new URL('../supabase/migrations/', import.meta.url)

if (!process.env.SUPABASE_DB_URL) {
  console.error('Falta SUPABASE_DB_URL no .env (veja o .env.example).')
  process.exit(1)
}

const sql = connect(process.env.SUPABASE_DB_URL)

try {
  await sql`create schema if not exists interno`
  await sql`create table if not exists interno.migracoes (
    nome text primary key,
    aplicada_em timestamptz not null default now()
  )`

  const feitas = new Set((await sql`select nome from interno.migracoes`).map((r) => r.nome))
  const pendentes = (await readdir(DIR)).filter((f) => f.endsWith('.sql') && !feitas.has(f)).sort()

  for (const nome of pendentes) {
    const texto = await readFile(new URL(nome, DIR), 'utf8')
    await sql.begin(async (tx) => {
      await tx.unsafe(texto)
      await tx`insert into interno.migracoes (nome) values (${nome})`
    })
    console.log('aplicada:', nome)
  }

  console.log(pendentes.length ? `${pendentes.length} migração(ões) aplicada(s).` : 'Nada a aplicar.')
} catch (error) {
  console.error('Erro:', error.message)
  process.exitCode = 1
} finally {
  await sql.end({ timeout: 5 })
}
