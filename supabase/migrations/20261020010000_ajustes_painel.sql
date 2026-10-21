-- Ajustes da revisão de segurança da fase 5.

-- A reserva do endereço antigo vale mesmo depois que a loja for apagada: quem pegasse o endereço
-- herdaria os links que a loja divulgou. A linha fica sem loja até vencer.
alter table public.enderecos_antigos alter column loja_id drop not null;
alter table public.enderecos_antigos drop constraint enderecos_antigos_loja_id_fkey;
alter table public.enderecos_antigos add constraint enderecos_antigos_loja_id_fkey
  foreign key (loja_id) references public.lojas (id) on delete set null;

-- Trava por endereço (advisory lock da transação): enquanto uma loja troca de endereço, outra que
-- tenta pegar o endereço antigo espera o fim da troca e então enxerga a reserva. Sem isso, uma
-- tentativa no meio da troca passaria pelo gatilho antes de a reserva ser gravada. As funções
-- rodam com o papel do servidor, que não usa o schema interno: a trava é chamada direto.
create or replace function interno.endereco_livre() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('endereco:' || new.slug, 0));
  if exists (
    select 1 from public.enderecos_antigos
    where slug = new.slug and loja_id is distinct from new.id and ate > now()
  ) then
    raise exception 'endereço % reservado', new.slug using errcode = '23505';
  end if;
  return new;
end;
$$;

-- Só loja verificada reserva o endereço antigo: loja que nunca ficou pública não tem link
-- divulgado para proteger, e reservar daria a uma conta descartável vários endereços.
create or replace function public.trocar_endereco(p_loja uuid, p_slug text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_atual text;
  v_verificada boolean;
begin
  select slug, verificada_em is not null into v_atual, v_verificada from public.lojas where id = p_loja for update;
  if not found then
    raise exception 'loja % não encontrada', p_loja;
  end if;
  if v_atual = p_slug then
    return;
  end if;

  -- Sempre na mesma ordem, para duas trocas cruzadas não travarem uma à outra.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('endereco:' || s, 0))
  from unnest(array[v_atual, p_slug]) s
  order by s;

  delete from public.enderecos_antigos where loja_id = p_loja and (slug = p_slug or ate <= now());
  if v_verificada then
    if (select count(*) from public.enderecos_antigos where loja_id = p_loja) >= 5 then
      raise exception 'muitas trocas de endereço' using errcode = 'P0001', hint = 'SLUG_CHANGES';
    end if;
    insert into public.enderecos_antigos (slug, loja_id, ate) values (v_atual, p_loja, now() + interval '60 days')
    on conflict (slug) do update set loja_id = excluded.loja_id, ate = excluded.ate;
  end if;

  update public.lojas set slug = p_slug, alterada_em = now() where id = p_loja;
end;
$$;

-- O default de valor não precisa ler acima do papel do servidor, que já lê a configuração.
alter function interno.valor_mensal() security invoker;
