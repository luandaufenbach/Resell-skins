-- Valores que mudam sem deploy. Só o servidor lê, com a chave secreta: RLS ligado e nenhuma
-- política, então a chave publishable não enxerga nada.
create table public.configuracao (
  chave text primary key,
  valor jsonb not null,
  descricao text not null
);

alter table public.configuracao enable row level security;

insert into public.configuracao (chave, valor, descricao) values
  ('desconto_padrao', '0.30', 'Desconto padrão do preço do revendedor sobre o preço Steam (0.30 = 30%).'),
  ('teto_steam_usd', '1800', 'Teto de preço do mercado da Steam, em USD. Acima dele o item fica sem preço Steam.');
