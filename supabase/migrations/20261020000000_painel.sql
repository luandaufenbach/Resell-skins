-- Fase 5: painel do revendedor. Marca, preços e plano da loja, ajustes por item, endereços antigos
-- e o bucket das imagens. Toda gravação continua passando pelo servidor, com a chave secreta.

-- Valor do plano mensal na configuração: cada loja guarda o próprio valor ao ser criada.
create function interno.valor_mensal() returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select (valor ->> 'mensal')::numeric from public.configuracao where chave = 'planos'
$$;

-- O valor padrão da coluna roda com o papel de quem insere (o servidor).
revoke execute on function interno.valor_mensal() from public;
grant execute on function interno.valor_mensal() to service_role;

alter table public.lojas
  -- Marca. Sem nome, a loja usa o nome do perfil Steam (coluna nome).
  add column nome_loja text check (char_length(nome_loja) between 1 and 40 and nome_loja !~* '(steam|valve)'),
  add column frase text check (char_length(frase) between 1 and 120),
  -- Usuários das redes ({ instagram, tiktok, youtube, discord }); o link é montado no servidor.
  add column redes jsonb not null default '{}' check (jsonb_typeof(redes) = 'object'),
  -- Caminhos no bucket marcas: <id da loja>/<tipo>-<hash>.webp.
  add column logo text check (logo ~ '^[0-9a-f-]{36}/logo-[0-9a-f]{16}\.webp$'),
  add column banner text check (banner ~ '^[0-9a-f-]{36}/banner-[0-9a-f]{16}\.webp$'),
  -- Ponto de foco do banner, em % da largura e da altura: o recorte do celular e o do computador
  -- sempre mostram esse ponto.
  add column banner_x smallint not null default 50 check (banner_x between 0 and 100),
  add column banner_y smallint not null default 50 check (banner_y between 0 and 100),
  add column cor text check (cor ~ '^[0-9a-f]{6}$'),
  add column fundo text not null default 'escuro' check (fundo in ('escuro', 'claro')),
  -- Preço do revendedor = preço Steam menos o desconto, arredondado para baixo.
  add column desconto numeric(3, 2) not null default 0.30 check (desconto between 0 and 0.80),
  add column arredondamento text not null default 'centavos'
    check (arredondamento in ('centavos', 'inteiro', 'noventa', 'cinco')),
  -- Plano e valor da loja (o admin muda na fase 6; fundador paga menos).
  add column plano text not null default 'mensal' check (plano in ('mensal', 'trimestral')),
  add column valor numeric(10, 2) default interno.valor_mensal() check (valor > 0),
  -- Muda a cada gravação do painel: entra na chave do cache da loja pública.
  add column alterada_em timestamptz not null default now();

update public.lojas set valor = interno.valor_mensal() where valor is null;

-- Ajustes por item. Sobrevivem às atualizações do inventário (o upsert só troca os dados da Steam)
-- e saem junto com o item quando ele sai do inventário.
alter table public.itens
  add column oculto boolean not null default false,
  -- Preço manual. Nulo = padrão (Steam menos o desconto da loja); o painel mostra os dois.
  add column preco numeric(12, 2) check (preco > 0),
  add column sob_consulta boolean not null default false,
  -- Custo por unidade, privado: nunca sai na loja pública.
  add column custo numeric(12, 2) check (custo >= 0),
  add column situacao text check (situacao in ('reservado', 'vendido'));

-- O custo fica na saída do item: base do relatório de lucro (fase 7).
alter table public.movimentacoes add column custo numeric(12, 2);

-- Endereços que a loja deixou de usar: redirecionam para o atual por 60 dias e ninguém pega nesse
-- tempo, para não usarem o link de uma loja conhecida para dar golpe.
create table public.enderecos_antigos (
  slug text primary key,
  loja_id uuid not null references public.lojas (id) on delete cascade,
  ate timestamptz not null
);

create index enderecos_antigos_loja on public.enderecos_antigos (loja_id);

alter table public.enderecos_antigos enable row level security;
revoke all on public.enderecos_antigos from anon, authenticated;

-- Nenhuma loja usa o endereço antigo de outra enquanto ele vale. Mesmo código do índice único
-- (23505): quem grava trata como "endereço ocupado".
create function interno.endereco_livre() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.enderecos_antigos
    where slug = new.slug and loja_id <> new.id and ate > now()
  ) then
    raise exception 'endereço % reservado', new.slug using errcode = '23505';
  end if;
  return new;
end;
$$;

revoke execute on function interno.endereco_livre() from public;

create trigger endereco_livre before insert or update of slug on public.lojas
  for each row execute function interno.endereco_livre();

-- Troca o endereço da loja numa transação: o antigo passa a redirecionar por 60 dias. Voltar a um
-- endereço antigo da própria loja é permitido. No máximo 5 endereços antigos valendo por loja.
create function public.trocar_endereco(p_loja uuid, p_slug text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_atual text;
begin
  select slug into v_atual from public.lojas where id = p_loja for update;
  if not found then
    raise exception 'loja % não encontrada', p_loja;
  end if;
  if v_atual = p_slug then
    return;
  end if;

  delete from public.enderecos_antigos where loja_id = p_loja and (slug = p_slug or ate <= now());
  if (select count(*) from public.enderecos_antigos where loja_id = p_loja) >= 5 then
    raise exception 'muitas trocas de endereço' using errcode = 'P0001', hint = 'SLUG_CHANGES';
  end if;

  insert into public.enderecos_antigos (slug, loja_id, ate) values (v_atual, p_loja, now() + interval '60 days')
  on conflict (slug) do update set loja_id = excluded.loja_id, ate = excluded.ate;

  update public.lojas set slug = p_slug, alterada_em = now() where id = p_loja;
end;
$$;

revoke execute on function public.trocar_endereco(uuid, text) from public, anon, authenticated;
grant execute on function public.trocar_endereco(uuid, text) to service_role;

-- Mesma sincronização da fase 4, com o custo do item guardado na saída.
create or replace function public.sincronizar_loja(p_loja uuid, p_itens jsonb, p_nome text, p_avatar text)
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
      select assetid, market_hash_name as nome, quantidade, dados, custo from public.itens where loja_id = p_loja
    ),
    diferencas as (
      select
        coalesce(n.assetid, a.assetid) as assetid,
        coalesce(n.nome, a.nome) as nome,
        coalesce(n.quantidade, 0) - coalesce(a.quantidade, 0) as delta,
        coalesce(n.dados, a.dados) as dados,
        a.custo
      from novos n
      full join atuais a on a.assetid = n.assetid
    )
    insert into public.movimentacoes (loja_id, sincronizacao_id, tipo, assetid, market_hash_name, quantidade, dados, custo)
    select p_loja, v_sync, case when delta > 0 then 'entrada' else 'saida' end, assetid, nome, abs(delta), dados,
      case when delta < 0 then custo end
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

-- Limpeza diária: também apaga os endereços antigos que já venceram.
create or replace function interno.limpar_cadastros() returns void
language sql
set search_path = ''
as $$
  delete from auth.users where email_confirmed_at is null and created_at < now() - interval '7 days';
  delete from public.lojas where verificada_em is null and criada_em < now() - interval '7 days';
  delete from public.enderecos_antigos where ate <= now();
$$;

revoke execute on function interno.limpar_cadastros() from public;

-- Chave Pix do dono, mostrada no painel no aviso de vencimento. Entra vazia porque o repositório é
-- público: a chave é gravada direto no banco (Table Editor do Supabase).
insert into public.configuracao (chave, valor, descricao) values
  ('pix_dono', '""', 'Chave Pix do dono (e-mail, telefone, CPF/CNPJ ou chave aleatória). Aparece no painel do revendedor no aviso de vencimento.');

-- Logo e banner das lojas. Público para leitura (as imagens aparecem na loja), só WebP e até 1 MB.
-- Quem grava é o servidor, com a chave secreta, depois de reconverter a imagem: sem políticas em
-- storage.objects, as chaves do navegador não enviam nem listam nada.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marcas', 'marcas', true, 1048576, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
