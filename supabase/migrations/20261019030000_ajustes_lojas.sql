-- Ajustes da revisão de segurança da fase 4.

-- Pagamentos são do admin: o revendedor não lê as linhas (nem a observação). O painel só precisa
-- saber se existe algum pagamento, e o servidor descobre isso com a chave secreta.
drop policy dono on public.pagamentos;
revoke select on public.pagamentos from authenticated;

-- Limpeza diária, no próprio banco:
-- conta que nunca confirmou o e-mail sai depois de 7 dias, levando o WhatsApp e o SteamID que
-- ficaram nos dados do cadastro;
-- loja que nunca foi verificada sai depois de 7 dias e libera o endereço. A conta continua: o
-- painel pede os dados de novo para criar outra.
create function interno.limpar_cadastros() returns void
language sql
set search_path = ''
as $$
  delete from auth.users where email_confirmed_at is null and created_at < now() - interval '7 days';
  delete from public.lojas where verificada_em is null and criada_em < now() - interval '7 days';
$$;

revoke execute on function interno.limpar_cadastros() from public;

select cron.schedule('limpar-cadastros', '17 6 * * *', 'select interno.limpar_cadastros()');
