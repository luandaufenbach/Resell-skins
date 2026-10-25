-- Sem preço de fundador (decidido em 24/10/2026): todos pagam o valor do plano na configuração.
-- Nenhuma loja estava marcada como fundadora e o registro do admin não tinha ações de fundador.

drop function public.marcar_fundador(uuid, boolean);

-- Na troca de plano, o valor da loja passa a ser o do plano novo na configuração, sem desconto.
create or replace function public.registrar_pagamento(
  p_loja uuid, p_meses integer, p_valor numeric, p_observacao text, p_admin text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_loja public.lojas;
  v_plano text;
  v_ate timestamptz;
begin
  if p_meses is null or p_meses not in (1, 3) then
    raise exception 'período inválido' using errcode = '22023';
  end if;

  select * into v_loja from public.lojas where id = p_loja for update;
  if not found then
    raise exception 'loja % não encontrada', p_loja using errcode = 'P0002';
  end if;
  -- Loja não verificada não fica no ar mesmo paga: o admin verifica antes.
  if v_loja.verificada_em is null then
    raise exception 'loja não verificada' using errcode = 'P0001', hint = 'NOT_VERIFIED';
  end if;

  v_plano := case p_meses when 1 then 'mensal' else 'trimestral' end;
  -- greatest ignora o nulo: loja verificada sempre tem pago_ate, mas assim não depende disso.
  v_ate := greatest(v_loja.pago_ate, now()) + make_interval(months => p_meses);

  insert into public.pagamentos (loja_id, valor, meses, pago_ate, observacao, registrado_por)
  values (p_loja, p_valor, p_meses, v_ate, nullif(btrim(p_observacao), ''), p_admin);

  update public.lojas set
    pago_ate = v_ate,
    bloqueada_em = null,
    plano = v_plano,
    valor = case
      when v_plano = v_loja.plano then valor
      else coalesce(
        (select (c.valor ->> v_plano)::numeric from public.configuracao c where c.chave = 'planos'), valor)
    end,
    alterada_em = now()
  where id = p_loja;

  return jsonb_build_object('pago_ate', v_ate);
end;
$$;

drop function public.valor_plano(text, boolean);

-- admin_lojas devolvia a coluna fundador: o tipo de retorno muda, então a função cai e volta.
drop function public.admin_lojas(uuid);

create function public.admin_lojas(p_loja uuid default null)
returns table (
  id uuid,
  slug text,
  nome text,
  nome_loja text,
  avatar text,
  logo text,
  email text,
  whatsapp text,
  steamid text,
  verificada_em timestamptz,
  verificada_por text,
  pago_ate timestamptz,
  bloqueada_em timestamptz,
  plano text,
  valor numeric,
  inventario_em timestamptz,
  criada_em timestamptz,
  itens bigint,
  visitas bigint,
  cliques bigint,
  pagamentos bigint,
  ultimo_pagamento timestamptz,
  observacao text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    l.id, l.slug, l.nome, l.nome_loja, l.avatar, l.logo, u.email::text, l.whatsapp, l.steamid,
    l.verificada_em, l.verificada_por, l.pago_ate, l.bloqueada_em, l.plano, l.valor,
    l.inventario_em, l.criada_em,
    (select count(*) from public.itens i where i.loja_id = l.id),
    e.visitas, e.cliques, p.total, p.ultimo,
    o.texto
  from public.lojas l
  left join auth.users u on u.id = l.dono
  left join lateral (
    select
      count(*) filter (where ev.tipo = 'visita') as visitas,
      count(*) filter (where ev.tipo = 'whatsapp') as cliques
    from public.eventos ev
    where ev.loja_id = l.id and ev.em > now() - interval '30 days'
  ) e on true
  left join lateral (
    select count(*) as total, max(pg.pago_em) as ultimo from public.pagamentos pg where pg.loja_id = l.id
  ) p on true
  left join public.observacoes o on o.loja_id = l.id
  where p_loja is null or l.id = p_loja
  order by l.pago_ate nulls last, l.criada_em
$$;

revoke execute on function public.admin_lojas(uuid) from public, anon, authenticated;
grant execute on function public.admin_lojas(uuid) to service_role;

alter table public.lojas drop column fundador;

delete from public.configuracao where chave = 'fundadores';

alter table public.registro_admin
  drop constraint registro_admin_acao_check,
  add constraint registro_admin_acao_check
    check (acao in ('pagamento', 'bloqueio', 'desbloqueio', 'verificar', 'observacao'));
