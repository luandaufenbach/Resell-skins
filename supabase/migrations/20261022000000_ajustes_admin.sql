-- Ajustes da revisão de segurança da fase 6.

-- Verificação pelo id da loja. Antes, o servidor conferia o código numa loja e chamava
-- verificar_loja pelo endereço: enquanto ele lia o perfil na Steam, o dono de duas lojas não
-- verificadas podia passar o endereço de uma para a outra e verificar a loja com o inventário de
-- outra pessoa. Agora a gravação só vale para a mesma loja, com o mesmo SteamID e (pelo perfil) o
-- mesmo código, ainda válido. Se algo mudou, erra com o hint STORE_CHANGED e nada muda.
-- Começa o teste de 7 dias, a menos que o SteamID, o e-mail ou o WhatsApp já tenham usado um.
-- security definer porque lê o e-mail do dono em auth.users.
create function public.verificar_loja_id(p_loja uuid, p_por text, p_steamid text, p_codigo text default null)
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
  select * into v_loja from public.lojas where id = p_loja for update;
  if not found then
    raise exception 'loja % não encontrada', p_loja using errcode = 'P0002';
  end if;
  if v_loja.verificada_em is not null then
    return jsonb_build_object('pago_ate', v_loja.pago_ate, 'teste', null);
  end if;
  if v_loja.steamid is distinct from p_steamid
    or (p_por = 'perfil' and (
      p_codigo is null or v_loja.codigo is distinct from p_codigo or not (v_loja.codigo_expira_em > now())
    )) then
    raise exception 'a loja mudou durante a verificação' using errcode = 'P0001', hint = 'STORE_CHANGED';
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

-- A verificação pelo endereço continua para o SQL Editor do Supabase:
--   select public.verificar_loja('<slug>');
-- Ela acha a loja pelo endereço e usa a mesma regra, pelo id.
create or replace function public.verificar_loja(p_slug text, p_por text default 'admin')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_steamid text;
  v_codigo text;
begin
  select id, steamid, codigo into v_id, v_steamid, v_codigo from public.lojas where slug = p_slug;
  if not found then
    raise exception 'loja % não encontrada', p_slug;
  end if;
  return public.verificar_loja_id(v_id, p_por, v_steamid, v_codigo);
end;
$$;

revoke execute on function public.verificar_loja_id(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.verificar_loja_id(uuid, text, text, text) to service_role;

-- Registro do que cada admin fez (o pagamento também guarda quem registrou). Serve para descobrir
-- o que mudou se uma sessão de admin for roubada. Fica mesmo se a loja for apagada.
create table public.registro_admin (
  id bigint generated always as identity primary key,
  em timestamptz not null default now(),
  admin text not null,
  loja_id uuid references public.lojas (id) on delete set null,
  acao text not null check (acao in ('pagamento', 'bloqueio', 'desbloqueio', 'fundador', 'fundador_fora', 'verificar', 'observacao')),
  detalhe jsonb
);

create index registro_admin_em on public.registro_admin (em desc);

alter table public.registro_admin enable row level security;
revoke all on public.registro_admin from anon, authenticated;
