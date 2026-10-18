-- Ajustes da revisão de segurança da fase 2.

-- Defesa em profundidade: além do RLS sem políticas, as chaves do navegador (anon e
-- authenticated) não têm privilégio nenhum nas tabelas de preço e configuração.
revoke all on public.configuracao, public.cambio, public.precos, public.calibracao from anon, authenticated;
revoke execute on all functions in schema interno from public;
alter function interno.grupo(text) set search_path = '';
alter function interno.faixa(numeric) set search_path = '';

-- Papel do job diário de preços, só com o que ele usa: assim o secret do GitHub não dá acesso
-- ao banco inteiro. A senha não fica aqui (o repositório é público); é definida à parte e vai no
-- secret PRECOS_DB_URL.
create role job_precos nologin;
grant usage on schema public, interno to job_precos;
grant select, insert, update on public.precos, public.cambio to job_precos;
grant select, insert on public.calibracao to job_precos;
grant select on public.configuracao to job_precos;
grant execute on function interno.grupo(text), interno.faixa(numeric), interno.calibrar(), interno.recalcular_precos()
  to job_precos;

create policy job_precos on public.precos for all to job_precos using (true) with check (true);
create policy job_precos on public.cambio for all to job_precos using (true) with check (true);
create policy job_precos on public.calibracao for all to job_precos using (true) with check (true);
create policy job_precos on public.configuracao for select to job_precos using (true);

-- Mesmo cálculo de antes, com duas travas a mais:
-- item que não aparece na lista há 7 dias fica sem preço (a SteamApis deixou de mandar);
-- estimativa só para item com alguma venda registrada, para um anúncio isolado de um item que
-- nunca vendeu não virar "preço Steam".
create or replace function interno.recalcular_precos() returns void
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
        when p.atualizado_em < now() - interval '7 days' then null
        when p.mediana_recente_usd > 0 then
          least(p.mediana_recente_usd, coalesce(nullif(p.menor_anuncio_usd, 0), p.mediana_recente_usd))
        when p.menor_anuncio_usd > 0 and p.ultima_venda_usd > 0 and (select aprovada from regras) then
          least(p.menor_anuncio_usd * f.fator, p.ultima_venda_usd)
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
