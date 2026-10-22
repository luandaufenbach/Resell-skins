-- Fase 6: administração (/admin). Fundador, bloqueio manual, observações do admin e as funções que
-- a tela usa. Quem chama é só o servidor, com a chave secreta, depois de conferir que o e-mail da
-- sessão está na lista de admins (NUXT_ADMIN_EMAILS).

alter table public.lojas
  -- Fundador paga o plano com o desconto da configuração (fundadores) enquanto mantiver a assinatura.
  add column fundador boolean not null default false,
  -- Bloqueio manual pelo admin: a loja sai do ar mesmo paga. Registrar um pagamento desbloqueia.
  add column bloqueada_em timestamptz;

-- Quem registrou o pagamento (e-mail do admin), para conferir depois quando houver mais de um.
alter table public.pagamentos
  add column registrado_por text,
  add constraint pagamentos_observacao check (char_length(observacao) between 1 and 300);

-- Observações do admin sobre a loja, uma por loja. Ficam fora de lojas porque o revendedor lê a
-- própria linha.
create table public.observacoes (
  loja_id uuid primary key references public.lojas (id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 1000),
  alterada_em timestamptz not null default now()
);

alter table public.observacoes enable row level security;
revoke all on public.observacoes from anon, authenticated;

-- Valor do plano para a loja: o da configuração, com o desconto de fundador quando for o caso.
create function public.valor_plano(p_plano text, p_fundador boolean) returns numeric
language sql
stable
set search_path = ''
as $$
  select round(
    (p.valor ->> p_plano)::numeric * case
      when p_fundador then 1 - coalesce(
        (select (f.valor ->> 'desconto')::numeric from public.configuracao f where f.chave = 'fundadores'), 0)
      else 1
    end,
    2)
  from public.configuracao p
  where p.chave = 'planos'
$$;

-- Registra um pagamento numa transação: soma o período a partir do vencimento ou de hoje, o que for
-- maior (quem paga adiantado não perde dias; quem paga atrasado não paga pelos dias fora do ar),
-- tira o bloqueio e põe a loja no plano do período (1 mês = mensal, 3 = trimestral). Na troca de
-- plano, o valor da loja passa a ser o do plano novo na configuração.
create function public.registrar_pagamento(
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
      else coalesce(public.valor_plano(v_plano, v_loja.fundador), valor)
    end,
    alterada_em = now()
  where id = p_loja;

  return jsonb_build_object('pago_ate', v_ate);
end;
$$;

-- Marca ou desmarca o fundador e acerta o valor da loja (plano da configuração com ou sem o
-- desconto). Recusa marcar além das vagas da configuração.
create function public.marcar_fundador(p_loja uuid, p_fundador boolean)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_vagas integer;
begin
  perform 1 from public.lojas where id = p_loja for update;
  if not found then
    raise exception 'loja % não encontrada', p_loja using errcode = 'P0002';
  end if;

  if p_fundador then
    -- Duas marcações ao mesmo tempo não passam das vagas.
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('fundadores', 0));
    select (valor ->> 'vagas')::integer into v_vagas from public.configuracao where chave = 'fundadores';
    if v_vagas is not null and (select count(*) from public.lojas where fundador and id <> p_loja) >= v_vagas then
      raise exception 'vagas de fundador esgotadas' using errcode = 'P0001', hint = 'FOUNDERS_FULL';
    end if;
  end if;

  update public.lojas set
    fundador = p_fundador,
    valor = coalesce(public.valor_plano(plano, p_fundador), valor),
    alterada_em = now()
  where id = p_loja;
end;
$$;

-- Lista do admin: cada loja com o e-mail do dono, itens, visitas e cliques no WhatsApp em 30 dias,
-- pagamentos e a observação. Com p_loja, só aquela loja.
-- security definer porque lê o e-mail em auth.users.
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
  fundador boolean,
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
    l.verificada_em, l.verificada_por, l.pago_ate, l.bloqueada_em, l.plano, l.valor, l.fundador,
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

revoke execute on function
  public.valor_plano(text, boolean),
  public.registrar_pagamento(uuid, integer, numeric, text, text),
  public.marcar_fundador(uuid, boolean),
  public.admin_lojas(uuid)
from public, anon, authenticated;

grant execute on function
  public.valor_plano(text, boolean),
  public.registrar_pagamento(uuid, integer, numeric, text, text),
  public.marcar_fundador(uuid, boolean),
  public.admin_lojas(uuid)
to service_role;
