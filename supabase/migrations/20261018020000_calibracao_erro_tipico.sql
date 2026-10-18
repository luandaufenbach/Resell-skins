-- O erro médio é puxado por poucos itens muito fora da curva (venda bem abaixo do anúncio).
-- O erro típico (mediana) mostra melhor o erro esperado de cada faixa.
alter table public.calibracao add column erro_tipico numeric(8, 4);

create or replace function interno.calibrar() returns void
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
  insert into public.calibracao (grupo, faixa, fator, erro_medio, erro_tipico, amostras)
  select
    f.grupo,
    f.faixa,
    f.fator,
    avg(abs(f.fator / b.razao - 1)),
    percentile_cont(0.5) within group (order by abs(f.fator / b.razao - 1)),
    f.amostras
  from fatores f
  join base b using (grupo, faixa)
  group by f.grupo, f.faixa, f.fator, f.amostras
$$;
