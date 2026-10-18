-- Preços do mercado da Steam (lista diária da SteamApis, em USD), câmbio PTAX e calibração.
-- O job de preços (scripts/precos.js) grava os dados crus e chama interno.calibrar() e
-- interno.recalcular_precos(). A loja só lê preco_steam_brl e estimado, pela função
-- precos_por_nome, com a chave secreta. RLS ligado e sem políticas em todas as tabelas.

-- Funções internas ficam num schema que a API do Supabase não expõe.
create schema if not exists interno;

-- PTAX de venda do Banco Central (série SGS 1), um valor por dia útil.
create table public.cambio (
  data date primary key,
  usd_brl numeric(10, 4) not null check (usd_brl > 0),
  criado_em timestamptz not null default now()
);

create table public.precos (
  market_hash_name text primary key,
  menor_anuncio_usd numeric(12, 2),   -- menor anúncio atual; null = nenhum anúncio
  mediana_recente_usd numeric(12, 2), -- mediana das vendas recentes; null = sem venda recente
  vendas_recentes integer not null default 0,
  ultima_venda_usd numeric(12, 2),
  ultima_venda_em timestamptz,
  atualizado_em timestamptz not null, -- quando a SteamApis atualizou o item
  -- Calculados por interno.recalcular_precos():
  preco_steam_brl numeric(12, 2),     -- o que a loja mostra; null = sem preço Steam
  estimado boolean not null default false
);

-- Histórico dos fatores. Fator = mediana de (mediana das vendas ÷ menor anúncio) nos itens que
-- têm os dois; erro_medio = erro relativo médio da estimativa nesses mesmos itens.
create table public.calibracao (
  id bigint generated always as identity primary key,
  calculado_em timestamptz not null default now(),
  grupo text not null check (grupo in ('facas_luvas', 'demais')),
  faixa text not null check (faixa in ('ate_10', '10_100', '100_1000', 'acima_1000')),
  fator numeric(8, 4) not null,
  erro_medio numeric(8, 4) not null,
  amostras integer not null
);

create index calibracao_recente on public.calibracao (grupo, faixa, calculado_em desc);

alter table public.cambio enable row level security;
alter table public.precos enable row level security;
alter table public.calibracao enable row level security;

-- A estimativa (itens sem venda recente) só vale depois que o dono aprova os fatores.
insert into public.configuracao (chave, valor, descricao) values
  ('calibracao_aprovada', 'false', 'Quando true, itens sem venda recente ganham preço estimado (≈) pelo fator de calibração.');

-- Facas e luvas são os únicos itens com ★ no nome.
create function interno.grupo(nome text) returns text
language sql immutable
as $$ select case when nome like '★%' then 'facas_luvas' else 'demais' end $$;

-- Faixa de preço em reais.
create function interno.faixa(brl numeric) returns text
language sql immutable
as $$
  select case
    when brl < 10 then 'ate_10'
    when brl < 100 then '10_100'
    when brl < 1000 then '100_1000'
    else 'acima_1000'
  end
$$;

create function interno.calibrar() returns void
language sql
set search_path = ''
as $$
  with cambio as (
    select usd_brl from public.cambio order by data desc limit 1
  ),
  base as (
    select
      interno.grupo(p.market_hash_name) as grupo,
      interno.faixa(p.menor_anuncio_usd * (select usd_brl from cambio)) as faixa,
      p.mediana_recente_usd / p.menor_anuncio_usd as razao
    from public.precos p
    where p.mediana_recente_usd > 0 and p.menor_anuncio_usd > 0
  ),
  fatores as (
    select grupo, faixa, percentile_cont(0.5) within group (order by razao) as fator, count(*) as amostras
    from base
    group by grupo, faixa
  )
  insert into public.calibracao (grupo, faixa, fator, erro_medio, amostras)
  select f.grupo, f.faixa, f.fator, avg(abs(f.fator / b.razao - 1)), f.amostras
  from fatores f
  join base b using (grupo, faixa)
  group by f.grupo, f.faixa, f.fator, f.amostras
$$;

-- Preço Steam de cada item, sempre conservador para não inflar a economia mostrada na loja:
-- com venda recente, a mediana das vendas, limitada ao menor anúncio atual;
-- sem venda recente, menor anúncio × fator (≈), limitado à última venda, só com a calibração aprovada;
-- acima do teto do mercado da Steam, ou sem anúncio e sem venda, fica sem preço.
create function interno.recalcular_precos() returns void
language sql
set search_path = ''
as $$
  with cambio as (
    select usd_brl from public.cambio order by data desc limit 1
  ),
  regras as (
    select
      (select (valor #>> '{}')::numeric from public.configuracao where chave = 'teto_steam_usd') as teto_usd,
      coalesce((select (valor #>> '{}')::boolean from public.configuracao where chave = 'calibracao_aprovada'), false) as aprovada
  ),
  fatores as (
    select distinct on (grupo, faixa) grupo, faixa, fator
    from public.calibracao
    order by grupo, faixa, calculado_em desc
  ),
  calculo as (
    select
      p.market_hash_name,
      case
        when p.mediana_recente_usd > 0 then
          least(p.mediana_recente_usd, coalesce(nullif(p.menor_anuncio_usd, 0), p.mediana_recente_usd))
        when p.menor_anuncio_usd > 0 and (select aprovada from regras) then
          least(p.menor_anuncio_usd * f.fator, coalesce(p.ultima_venda_usd, p.menor_anuncio_usd * f.fator))
      end as usd,
      coalesce(p.mediana_recente_usd, 0) <= 0 as estimado
    from public.precos p
    left join fatores f
      on f.grupo = interno.grupo(p.market_hash_name)
      and f.faixa = interno.faixa(p.menor_anuncio_usd * (select usd_brl from cambio))
  )
  update public.precos p
  set
    preco_steam_brl = case
      when c.usd is null or c.usd >= (select teto_usd from regras) then null
      else round(c.usd * (select usd_brl from cambio), 2)
    end,
    estimado = c.usd is not null and c.usd < (select teto_usd from regras) and c.estimado
  from calculo c
  where c.market_hash_name = p.market_hash_name
$$;

-- Leitura da loja: preço Steam dos itens de um inventário. Só o servidor (chave secreta) executa.
create function public.precos_por_nome(nomes text[])
returns table (market_hash_name text, preco_steam_brl numeric, estimado boolean)
language sql stable
set search_path = ''
as $$
  select p.market_hash_name, p.preco_steam_brl, p.estimado
  from public.precos p
  where p.market_hash_name = any (nomes) and p.preco_steam_brl is not null
$$;

revoke execute on function public.precos_por_nome(text[]) from public, anon, authenticated;
grant execute on function public.precos_por_nome(text[]) to service_role;
