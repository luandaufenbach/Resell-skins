-- Prévia da loja, gerada em /previa sem conta: guarda o SteamID e o WhatsApp informados e vale
-- 24h. Só o servidor lê e grava, com a chave secreta: RLS ligado, sem políticas e sem privilégio
-- para as chaves do navegador. O WhatsApp é dado pessoal: a prévia é apagada 7 dias depois de
-- expirar (a limpeza roda quando alguém cria uma prévia nova).
create table public.previas (
  id text primary key check (id ~ '^[A-Za-z0-9]{10}$'),
  steamid text not null check (steamid ~ '^7656119[0-9]{10}$'),
  whatsapp text check (whatsapp ~ '^[0-9]{10,15}$'),
  criada_em timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '24 hours'
);

create index previas_expira_em on public.previas (expira_em);

alter table public.previas enable row level security;
revoke all on public.previas from anon, authenticated;

-- Valores da página inicial. O WhatsApp do dono entra vazio porque o repositório é público:
-- o número é gravado direto no banco (Table Editor do Supabase).
insert into public.configuracao (chave, valor, descricao) values
  ('planos', '{"mensal": 49, "trimestral": 129}', 'Valores dos planos em reais. Cada loja guarda o próprio valor ao assinar.'),
  ('fundadores', '{"vagas": 20, "desconto": 0.20}', 'Preço de fundador: desconto (0.20 = 20%) para os primeiros assinantes, enquanto mantiverem a assinatura.'),
  ('whatsapp_dono', '""', 'WhatsApp do dono, só números com 55 e DDD (ex.: "5548999999999"). Recebe os pedidos do botão "Criar minha loja".');
