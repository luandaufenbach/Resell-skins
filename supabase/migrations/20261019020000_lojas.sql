-- Fase 4: lojas dos revendedores e o que gira em volta delas.
-- Toda tabela tem RLS. O revendedor (papel authenticated, com o token da sessão dele) só lê as
-- linhas da própria loja; toda gravação passa pelo servidor, com a chave secreta. A chave anon não
-- enxerga nada.

create table public.lojas (
  id uuid primary key default gen_random_uuid(),
  -- Uma loja por conta.
  dono uuid not null unique references auth.users (id) on delete cascade,
  -- Endereço da loja (dominio.com/<slug>). Os nomes reservados ficam no código
  -- (shared/utils/slug.js); aqui ficam o formato e a trava contra nomes parecidos com Steam e Valve.
  slug text not null unique check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 30 and slug !~ '(steam|valve)'
  ),
  steamid text not null check (steamid ~ '^7656119[0-9]{10}$'),
  whatsapp text not null check (whatsapp ~ '^[0-9]{12,15}$'),
  -- Nome e avatar do perfil Steam, relidos a cada atualização do inventário.
  nome text,
  avatar text,
  -- Código de posse que o revendedor cola no perfil Steam. Vale 24h.
  codigo text check (codigo ~ '^VTR-[A-Z0-9]{4}$'),
  codigo_expira_em timestamptz,
  verificada_em timestamptz,
  verificada_por text check (verificada_por in ('perfil', 'admin')),
  -- Até quando a loja fica no ar. Nulo até a verificação: o teste de 7 dias começa nela.
  pago_ate timestamptz,
  inventario_em timestamptz,
  criada_em timestamptz not null default now()
);

-- O SteamID só fica ocupado quando a loja é verificada: quem cadastra o inventário de outra pessoa
-- sem conseguir verificar não trava o SteamID dela.
create unique index lojas_steamid_verificada on public.lojas (steamid) where verificada_em is not null;

-- Itens do inventário como a loja mostra (server/utils/inventory.js), sem preço: o preço vem da
-- tabela de preços a cada leitura. Itens empilhados (caixas, chaves) usam o assetid do primeiro.
create table public.itens (
  loja_id uuid not null references public.lojas (id) on delete cascade,
  assetid text not null,
  market_hash_name text not null,
  quantidade integer not null check (quantidade > 0),
  dados jsonb not null,
  primary key (loja_id, assetid)
);

-- Cada atualização do inventário. A primeira (inicial) vira a base e não gera movimentações.
create table public.sincronizacoes (
  id bigint generated always as identity primary key,
  loja_id uuid not null references public.lojas (id) on delete cascade,
  feita_em timestamptz not null default now(),
  total integer not null,
  entraram integer not null default 0,
  sairam integer not null default 0,
  inicial boolean not null default false
);

create index sincronizacoes_loja on public.sincronizacoes (loja_id, feita_em desc);

-- O que entrou e saiu em cada atualização: base do relatório de vendas. `dados` guarda o item
-- como estava, porque o que saiu não existe mais no inventário.
create table public.movimentacoes (
  id bigint generated always as identity primary key,
  loja_id uuid not null references public.lojas (id) on delete cascade,
  sincronizacao_id bigint not null references public.sincronizacoes (id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'saida')),
  assetid text not null,
  market_hash_name text not null,
  quantidade integer not null check (quantidade > 0),
  dados jsonb not null
);

create index movimentacoes_loja on public.movimentacoes (loja_id, sincronizacao_id);

-- Visitas na loja, visitas no item e cliques no WhatsApp. Sem IP nem nada do visitante.
create table public.eventos (
  id bigint generated always as identity primary key,
  loja_id uuid not null references public.lojas (id) on delete cascade,
  tipo text not null check (tipo in ('visita', 'item', 'whatsapp')),
  assetid text,
  em timestamptz not null default now()
);

create index eventos_loja on public.eventos (loja_id, em desc);

-- Pagamentos registrados pelo admin (tela na fase 6). Ficam mesmo se a loja for apagada, para o
-- total recebido não mudar.
create table public.pagamentos (
  id bigint generated always as identity primary key,
  loja_id uuid references public.lojas (id) on delete set null,
  valor numeric(10, 2) not null check (valor > 0),
  meses integer not null check (meses in (1, 3)),
  pago_em timestamptz not null default now(),
  -- Vencimento da loja depois deste pagamento.
  pago_ate timestamptz not null,
  observacao text
);

create index pagamentos_loja on public.pagamentos (loja_id, pago_em desc);

-- Um teste grátis por SteamID, por e-mail e por WhatsApp. Guarda o sha256 de "tipo:valor" e não o
-- valor, porque a linha fica depois que a loja é apagada.
create table public.testes_usados (
  hash text primary key check (hash ~ '^[0-9a-f]{64}$'),
  usado_em timestamptz not null default now()
);

alter table public.lojas enable row level security;
alter table public.itens enable row level security;
alter table public.sincronizacoes enable row level security;
alter table public.movimentacoes enable row level security;
alter table public.eventos enable row level security;
alter table public.pagamentos enable row level security;
alter table public.testes_usados enable row level security;

revoke all on public.lojas, public.itens, public.sincronizacoes, public.movimentacoes, public.eventos,
  public.pagamentos, public.testes_usados from anon, authenticated;
grant select on public.lojas, public.itens, public.sincronizacoes, public.movimentacoes, public.eventos,
  public.pagamentos to authenticated;

create policy dono on public.lojas for select to authenticated using (dono = (select auth.uid()));
create policy dono on public.itens for select to authenticated
  using (loja_id in (select id from public.lojas where dono = (select auth.uid())));
create policy dono on public.sincronizacoes for select to authenticated
  using (loja_id in (select id from public.lojas where dono = (select auth.uid())));
create policy dono on public.movimentacoes for select to authenticated
  using (loja_id in (select id from public.lojas where dono = (select auth.uid())));
create policy dono on public.eventos for select to authenticated
  using (loja_id in (select id from public.lojas where dono = (select auth.uid())));
create policy dono on public.pagamentos for select to authenticated
  using (loja_id in (select id from public.lojas where dono = (select auth.uid())));

-- Verifica a loja e começa o teste de 7 dias, se o SteamID, o e-mail e o WhatsApp ainda não
-- usaram um. Se já usaram, a loja fica verificada mas vencida (pago_ate = agora) até o pagamento.
-- Se outra loja verificada já tem o SteamID, falha pelo índice único e nada muda.
-- Chamada pelo servidor quando o código aparece no perfil. Verificação manual pelo admin, no SQL
-- Editor do Supabase:  select public.verificar_loja('<slug>');
-- security definer porque lê o e-mail do dono em auth.users.
create function public.verificar_loja(p_slug text, p_por text default 'admin')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loja public.lojas;
  v_hashes text[];
  v_teste boolean;
  v_pago_ate timestamptz;
begin
  select * into v_loja from public.lojas where slug = p_slug for update;
  if not found then
    raise exception 'loja % não encontrada', p_slug;
  end if;
  if v_loja.verificada_em is not null then
    return jsonb_build_object('pago_ate', v_loja.pago_ate, 'teste', null);
  end if;

  select array_agg(encode(sha256(convert_to(v, 'UTF8')), 'hex')) into v_hashes
  from unnest(array[
    'steamid:' || v_loja.steamid,
    'whatsapp:' || v_loja.whatsapp,
    'email:' || lower((select email from auth.users where id = v_loja.dono))
  ]) v
  where v is not null;

  v_teste := not exists (select 1 from public.testes_usados where hash = any (v_hashes));
  insert into public.testes_usados (hash) select unnest(v_hashes) on conflict do nothing;

  update public.lojas set
    verificada_em = now(),
    verificada_por = p_por,
    codigo = null,
    codigo_expira_em = null,
    pago_ate = case when v_teste then now() + interval '7 days' else now() end
  where id = v_loja.id
  returning pago_ate into v_pago_ate;

  return jsonb_build_object('pago_ate', v_pago_ate, 'teste', v_teste);
end;
$$;

-- Troca os itens da loja pelos lidos agora e grava o que entrou e o que saiu, tudo numa transação.
-- `p_itens` é a lista de itens normalizados (id = assetid, marketName, quantity).
create function public.sincronizar_loja(p_loja uuid, p_itens jsonb, p_nome text, p_avatar text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_sync bigint;
  v_inicial boolean;
  v_entraram integer := 0;
  v_sairam integer := 0;
begin
  -- Trava a loja: duas atualizações ao mesmo tempo gravariam as mesmas movimentações duas vezes.
  perform 1 from public.lojas where id = p_loja for update;
  if not found then
    raise exception 'loja % não encontrada', p_loja;
  end if;

  v_inicial := not exists (select 1 from public.sincronizacoes where loja_id = p_loja);

  insert into public.sincronizacoes (loja_id, total, inicial)
  values (p_loja, jsonb_array_length(p_itens), v_inicial)
  returning id into v_sync;

  if not v_inicial then
    with novos as (
      select x ->> 'id' as assetid, x ->> 'marketName' as nome, (x ->> 'quantity')::integer as quantidade, x as dados
      from jsonb_array_elements(p_itens) x
    ),
    atuais as (
      select assetid, market_hash_name as nome, quantidade, dados from public.itens where loja_id = p_loja
    ),
    diferencas as (
      select
        coalesce(n.assetid, a.assetid) as assetid,
        coalesce(n.nome, a.nome) as nome,
        coalesce(n.quantidade, 0) - coalesce(a.quantidade, 0) as delta,
        coalesce(n.dados, a.dados) as dados
      from novos n
      full join atuais a on a.assetid = n.assetid
    )
    insert into public.movimentacoes (loja_id, sincronizacao_id, tipo, assetid, market_hash_name, quantidade, dados)
    select p_loja, v_sync, case when delta > 0 then 'entrada' else 'saida' end, assetid, nome, abs(delta), dados
    from diferencas
    where delta <> 0;

    select
      coalesce(sum(quantidade) filter (where tipo = 'entrada'), 0),
      coalesce(sum(quantidade) filter (where tipo = 'saida'), 0)
    into v_entraram, v_sairam
    from public.movimentacoes
    where sincronizacao_id = v_sync;
  end if;

  delete from public.itens
  where loja_id = p_loja and assetid not in (select x ->> 'id' from jsonb_array_elements(p_itens) x);

  insert into public.itens (loja_id, assetid, market_hash_name, quantidade, dados)
  select p_loja, x ->> 'id', x ->> 'marketName', (x ->> 'quantity')::integer, x
  from jsonb_array_elements(p_itens) x
  on conflict (loja_id, assetid) do update set
    market_hash_name = excluded.market_hash_name,
    quantidade = excluded.quantidade,
    dados = excluded.dados;

  update public.sincronizacoes set entraram = v_entraram, sairam = v_sairam where id = v_sync;
  update public.lojas set
    inventario_em = now(),
    nome = coalesce(p_nome, nome),
    avatar = coalesce(p_avatar, avatar)
  where id = p_loja;

  return jsonb_build_object(
    'total', jsonb_array_length(p_itens),
    'entraram', v_entraram,
    'sairam', v_sairam,
    'inicial', v_inicial
  );
end;
$$;

revoke execute on function public.verificar_loja(text, text), public.sincronizar_loja(uuid, jsonb, text, text)
  from public, anon, authenticated;
grant execute on function public.verificar_loja(text, text), public.sincronizar_loja(uuid, jsonb, text, text)
  to service_role;

-- A prévia guarda uma cópia do inventário por 24h, em vez de reler a Steam a cada 10 minutos: na
-- hospedagem grátis o servidor dorme e perde o cache. A cópia sai junto com o WhatsApp e o SteamID.
alter table public.previas add column perfil jsonb, add column itens jsonb, add column lido_em timestamptz;

create or replace function interno.limpar_previas() returns void
language sql
set search_path = ''
as $$
  update public.previas set whatsapp = null, steamid = null, perfil = null, itens = null
  where expira_em <= now() and (whatsapp is not null or steamid is not null or itens is not null);
  delete from public.previas where expira_em < now() - interval '7 days';
$$;

revoke execute on function interno.limpar_previas() from public;
