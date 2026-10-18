-- Limpeza das prévias por agendamento no próprio banco (pg_cron), sem depender de alguém criar
-- uma prévia nova. De hora em hora: quando a prévia vence, saem o WhatsApp e o SteamID (a tela
-- "esta prévia expirou" só precisa do id e da data); 7 dias depois, a linha inteira.
create extension if not exists pg_cron;

alter table public.previas alter column steamid drop not null;

create function interno.limpar_previas() returns void
language sql
set search_path = ''
as $$
  update public.previas set whatsapp = null, steamid = null
  where expira_em <= now() and (whatsapp is not null or steamid is not null);
  delete from public.previas where expira_em < now() - interval '7 days';
$$;

revoke execute on function interno.limpar_previas() from public;

select cron.schedule('limpar-previas', '7 * * * *', 'select interno.limpar_previas()');
select interno.limpar_previas();
