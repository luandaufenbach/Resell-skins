# Fases

Uma fase por sessão. Começar com um plano curto e esperar aprovação antes de escrever código.
As decisões de produto, preço e design estão no [CLAUDE.md](../CLAUDE.md).
Até 22/10/2026 o produto se chamava Vitrine; o registro das fases abaixo mantém o nome antigo.
Em 24/10/2026 saiu o preço de fundador: todos pagam o valor do plano. Onde o registro abaixo cita o
fundador, vale só como histórico.

Toda fase só está pronta quando, além do critério dela:

- foi testada no navegador em 375px e 1280px;
- os agentes indicados na fase rodaram e os problemas apontados foram corrigidos ou aceitos pelo dono;
- nenhuma chave está no código e variáveis novas estão no `.env.example`;
- o commit foi feito, em português, no padrão dos commits existentes e sem o Claude como coautor.

## Fase 0: preparar o projeto (concluída)

- [x] CLAUDE.md com o contexto do produto e as decisões.
- [x] docs/fases.md com as fases, checklists e critérios de pronto.
- [x] Agentes design-reviewer e security-reviewer em `.claude/agents/`.

## Fase 1: catálogo (sem banco) (concluída)

- [x] Esconder itens permanentemente não trocáveis (não trocável e sem data de liberação).
- [x] Mostrar "Disponível em dd/mm" nos itens com trava temporária.
- [x] Trocar textos específicos ("pronto para mandar nos grupos") por textos genéricos, incluindo
      as meta tags.
- [x] Filtro de segundo nível por arma em todas as categorias (Facas → Karambit, Butterfly…), só
      com o que existe no inventário e com contagem. Nomes em inglês.
- [x] Busca também encontra o nome em português.
- [x] Filtros de desgaste e StatTrak.
- [x] Refatorar o CSS para o tema ser derivado de uma cor de destaque e de claro/escuro, sem mudar
      o visual padrão.
- [x] Testar outra cor pela URL da demo (ex.: `/loja/demo?cor=ff5500`).
- [x] Corrigir o contraste que já está abaixo de AA no tema atual: ★ na cor da raridade (4,24:1)
      e "StatTrak™" (4,33:1) sobre o fundo padrão.
- [x] Rodar o design-reviewer.

**Pronto quando:**

- Medalhas, moedas e troféus sem data de liberação não aparecem; pins trocáveis aparecem; itens
  com trava mostram a data.
- Nenhum texto nem meta tag cita grupos ou um canal específico.
- O filtro de arma lista só armas presentes, com a contagem certa, e combina com categoria,
  desgaste, StatTrak e busca.
- Buscar pelo nome em português de um item da demo encontra o item.
- Prints do tema padrão antes e depois da refatoração são iguais em 375px e 1280px.
- `?cor=` muda o tema da demo e o contraste continua AA em escuro, claro e numa cor berrante.

## Fase 2: preços (concluída)

Antes de começar: projeto no Supabase criado e chaves no `.env`.

- [x] Agente de pesquisa compara APIs gratuitas de preço: cobertura de itens, moeda (de
      preferência BRL), frequência de atualização, limites e termos de uso.
- [x] Apresentar a comparação ao dono e esperar a escolha (SteamApis, aprovada em 17/10/2026).
- [x] Tabela de preços no Supabase e agendamento da atualização diária (definir onde o
      agendamento roda, já que a hospedagem só é escolhida antes da fase 4). GitHub Actions, 06:30.
- [x] Conversão para BRL pela PTAX quando a lista vier em outra moeda.
- [x] Calibração para itens sem mediana de vendas na lista: fator por faixa, com facas e luvas separadas.
      Mostrar ao dono o fator e o erro médio de cada faixa antes de ativar. Guardar o histórico.
      Fatores aprovados pelo dono em 18/10/2026.
- [x] Itens acima do teto do mercado da Steam ficam sem preço Steam.
- [x] Cards e ficha do item: preço Steam riscado, preço do revendedor e economia; estimativa com "≈".
- [x] Na prévia: preço do revendedor = preço Steam menos 30%, com a indicação "preço de exemplo".
- [x] Rodar o design-reviewer e o security-reviewer.

**Pronto quando:**

- A escolha da API e os fatores de calibração foram aprovados pelo dono.
- Abrir uma loja ou prévia não faz nenhuma consulta de preço externa.
- Item com venda recente aparece sem "≈"; item estimado aparece com "≈".
- O riscado some quando o preço do revendedor é maior ou igual ao preço Steam e quando não há
  preço Steam.
- A tabela de preços se atualiza sozinha no agendamento definido.

## Fase 3: página inicial e prévia

- [x] Página inicial em `/`, para o revendedor que recebeu o link. Seções sugeridas (adaptar, não
      seguir como modelo pronto):
  1. Abertura: o que é em uma frase, botão "Ver como fica minha loja" (vai para `/previa`) e a
     loja de demonstração funcionando de verdade, com componentes reais, não um print. Se couber,
     um seletor de cor que muda a demonstração na hora.
  2. Como funciona: cola o link da Steam → vê a loja na hora → 7 dias grátis → Pix.
  3. O que a loja mostra: foto, float, stickers, preço Steam riscado x seu preço, filtros, sua
     marca e sua cor, sempre com pedaços reais da interface, não ícones genéricos.
  4. Segurança, em destaque: "Não pedimos login da Steam. Usamos só o seu inventário público."
  5. Preço: 7 dias grátis, depois R$ 49/mês ou R$ 129 por trimestre via Pix, sem fidelidade.
     Preço de fundador para os 20 primeiros.
  6. Perguntas frequentes: preciso entrar com a Steam? meu inventário precisa ser público? como
     pago? posso cancelar? o que acontece se eu parar de pagar?
  7. Contato pelo WhatsApp do dono e rodapé com o aviso de não afiliação à Valve.
- [x] Só anunciar o que já existe. Nada de depoimentos até haver clientes reais.
- [x] Imagem e título de compartilhamento (Open Graph) bem feitos: é a primeira coisa que o
      revendedor vê quando recebe o link no WhatsApp.
- [x] Mover o formulário atual da `/` para `/previa`.
- [x] Prévia em `/previa/<id>`: expira em 24h, fica fora do Google e tem uma faixa fixa
      "Prévia · Criar minha loja".
- [x] Remover a rota pública `/loja/<steamid>`.
- [x] Limite de consultas por IP nas rotas que leem inventário e preço (a rota pública devolve preços
      de qualquer inventário; apontado na revisão de segurança da fase 2). Criar prévia: 10 por hora;
      abrir prévia ou demo: 60 por minuto. A rota que lia qualquer inventário foi removida.
- [x] Até existir cadastro (fase 4), o botão "Criar minha loja" abre o WhatsApp do dono com uma
      mensagem pronta.
- [x] Rodar o design-reviewer. Rodou também o security-reviewer, porque a fase criou a tabela de
      prévias com WhatsApp e mexeu nas rotas públicas. Os achados foram corrigidos; o que depende
      da hospedagem ficou na fase 4.

**Pronto quando:**

- O link de `/` colado no WhatsApp mostra imagem e título corretos.
- A demonstração da página inicial usa os componentes reais e reage ao seletor de cor (se houver).
- Nenhuma seção anuncia algo que ainda não existe.
- `/previa` gera `/previa/<id>`; depois de 24h o link mostra que expirou; a página tem `noindex`.
- `/loja/<steamid>` não responde mais.
- Preços e WhatsApp do dono vêm da configuração, não do código.

## Fase 4: contas e lojas

Antes de começar: site publicado na Render (no ar desde 18/10/2026 em
https://vitrine-6ov4.onrender.com, veja o CLAUDE.md), Resend e Turnstile criados e chaves nos
lugares indicados abaixo.

Contas (guia passado ao dono em 19/10/2026; as chaves nunca vão para o chat):

- Turnstile (Cloudflare): widget "Vitrine", modo Managed, hostname `vitrine-6ov4.onrender.com`
  (mais o domínio próprio, quando houver). Site Key e Secret Key só na Render, em
  `NUXT_PUBLIC_TURNSTILE_SITE_KEY` e `NUXT_TURNSTILE_SECRET_KEY`. Em desenvolvimento, as chaves de
  teste públicas da Cloudflare, que sempre passam.
- Resend: a chave (permissão "Sending access") vai só no SMTP do Supabase (Authentication > Emails >
  SMTP Settings: host `smtp.resend.com`, porta 465, usuário `resend`, remetente
  `onboarding@resend.dev`). Quem manda os e-mails de conta é o Supabase, então ela não vai no `.env`
  nem na Render. Sem domínio verificado, o Resend só entrega para o e-mail da própria conta, o que
  basta para testar. Com o domínio, verificar no Resend e trocar o remetente.
- E-mail sem domínio (24/10/2026): o SMTP do Supabase passou para o Gmail `revenda.skins@gmail.com`
  (host `smtp.gmail.com`, porta 465, usuário o e-mail completo, senha de app com verificação em duas
  etapas; cerca de 500 e-mails por dia). O Supabase avisa que o Gmail pode cair mais no spam. Testado
  pelo dono: o e-mail chegou. Com o domínio, voltar para o Resend.
- Chave publishable do Supabase: passa a se chamar `NUXT_SUPABASE_PUBLISHABLE_KEY` (no `.env` e na
  Render, salva com "Save only"), para não ir para o navegador.
- Supabase, para os links dos e-mails: Authentication > URL Configuration > Site URL
  `https://vitrine-6ov4.onrender.com` (depois, o domínio próprio). Os modelos de
  `supabase/emails/` vão em Authentication > Emails > Templates (Confirm signup e Reset password),
  com o assunto escrito no topo de cada arquivo. Os links sempre abrem o site publicado, mesmo
  quando o cadastro foi feito no computador do dono.
- Pendentes com o dono: colar o link de `/` no WhatsApp e escolher o nome do domínio.

Plano aprovado pelo dono em 19/10/2026:

- Telas: `/cadastro`, `/entrar`, esqueci a senha, nova senha, confirmação do e-mail e um `/painel`
  mínimo (situação da loja, verificação, atualizar inventário, sair). O painel completo é da fase 5.
- Cadastro: link da Steam, WhatsApp, endereço da loja (slug), e-mail e Turnstile. Vindo da prévia,
  Steam e WhatsApp já vêm preenchidos. A senha (mínimo 8) é criada no link do e-mail, e a loja no
  painel, depois de conferir os dados (mudado na revisão de segurança: o Supabase guarda a senha e
  os dados do primeiro cadastro de um e-mail não confirmado, que pode ser de outra pessoa).
- Tudo passa pelo nosso servidor: sessão em cookie httpOnly, limite de login por IP e por e-mail,
  mensagens que não revelam se o e-mail já tem conta. O navegador não recebe chave do Supabase.
- E-mails de conta em português, com os modelos guardados no repositório; o dono cola no Supabase.
- Banco com RLS em todas as tabelas: lojas, itens, sincronizações, movimentações, eventos, pagamentos
  (sem tela até a fase 6) e testes grátis já usados. O revendedor só lê a própria loja; toda gravação
  passa pelo servidor.
- Verificação: código `VTR-XXXX` gerado no servidor, com validade de 24h, procurado no XML público do
  SteamID salvo na loja.
- Slug: minúsculas, números e hífen; recusa os nomes reservados e os que contêm "steam" ou "valve".
- Loja em `/<slug>` lê só o banco. Eventos enviados pelo navegador, contados uma vez por visitante a
  cada 30 minutos.
- "Criar minha loja" (prévia e página inicial) leva ao cadastro. A demo vai para `/demo`, e
  `/loja/demo` redireciona.

Decisões (o dono mandou seguir com a recomendação em 19/10/2026):

1. A prévia guarda uma cópia do inventário no banco por 24h, em vez de reler a Steam a cada 10
   minutos: na Render grátis o servidor dorme e perde o cache. A cópia é apagada junto com a prévia.
   Se aprovado, atualizar a seção Steam do CLAUDE.md.
2. Os 7 dias grátis contam a partir da verificação, não do cadastro, e o SteamID só fica ocupado
   quando a loja é verificada: quem cadastra o inventário de outra pessoa sem conseguir verificar não
   gasta o teste dela nem trava o SteamID.
3. Verificação manual pelo admin: por enquanto um comando pronto no SQL Editor do Supabase; o botão
   no `/admin` vem na fase 6, com o resto da administração.
4. Intervalo mínimo de 10 minutos entre duas atualizações do inventário.

- [x] Cadastro com verificação de e-mail, recuperação de senha e Turnstile. Testado com contas
      `@vitrine.test` criadas pela API de admin. Em 24/10/2026 o e-mail chegou pelo Gmail; falta um
      cadastro de verdade do começo ao fim (modelos em `supabase/emails/`, Site URL no Supabase).
- [x] Limite de tentativas no login (10 por IP e 5 por e-mail a cada 15 minutos).
- [x] Confirmação em outro aparelho (25/10/2026, achado no teste do dono): a tela "Confira seu
      e-mail" ficava parada no computador depois de confirmar no celular, e o F5 voltava ao formulário.
      Agora ela pergunta ao servidor a cada 5 segundos, sobrevive ao F5 (cookie de 24h) e, confirmado,
      pede a senha criada no celular para continuar no computador.
- [x] Turnstile também na geração de prévia (`POST /api/previa`), como pede o CLAUDE.md.
- [x] Na Render: preencher `NUXT_PUBLIC_SITE_URL` com o endereço do site e testar o limite com um
      `true-client-ip` falsificado (o `render.yaml` já usa esse cabeçalho, que a Cloudflare na
      frente da Render troca pelo IP real). O limite conta na memória: manter uma instância só.
- [x] Gerar uma prévia pelo site publicado: a Steam às vezes bloqueia IPs de datacenter. Em 18/10
      a prévia de um inventário de 625 itens saiu em 2,4 s pela Render.
- [ ] Domínio próprio (.com.br) comprado e ligado à Render depois do primeiro assinante (decidido em
      24/10/2026). Com ele: hostname no Turnstile, Site URL do Supabase, `NUXT_PUBLIC_SITE_URL` e
      remetente do Resend.
- [x] Cache em memória com teto: driver lru-cache, 64 MB (só em produção; em desenvolvimento o
      Nitro guarda o cache em `.nuxt/cache`). A prévia guarda uma cópia do inventário por 24h.
- [x] Com o site no ar, colar o link de `/` no WhatsApp e conferir imagem e título (fase 3).
      Conferido em 20/10/2026: título e descrição certos; no computador o WhatsApp mostra a imagem
      como miniatura quadrada e cortava o texto dela. A imagem virou um mosaico só de skins.
- [x] Tabelas com RLS: lojas, itens, sincronizações, movimentações do inventário, eventos,
      pagamentos e testes grátis usados. Testado: uma conta não lê nem altera a loja de outra.
- [x] Verificação de posse pelo código no perfil Steam; verificação manual pelo admin com
      `select public.verificar_loja('<slug>');` no SQL Editor.
- [x] Lojas em `dominio.com/<slug>`, respeitando os nomes reservados. A demo passa a ser `/demo`.
- [x] O botão "Criar minha loja" da prévia leva ao cadastro já preenchido com a Steam e o WhatsApp.
- [x] Teste de 7 dias (um por SteamID, por e-mail e por WhatsApp), bloqueio automático no
      vencimento, página "loja indisponível".
- [x] Atualização manual do inventário com intervalo mínimo, gravando entradas e saídas.
- [x] Gravar eventos (visita na loja, visita no item, clique no WhatsApp), ainda sem telas.
- [x] Rodar o security-reviewer (e o design-reviewer, pelas telas novas). Corrigidos: senha criada
      na confirmação e dados conferidos no painel, limite de tentativas em "Atualizar inventário",
      eventos só de itens da loja e com teto por visitante, login contando só as falhas por e-mail,
      pagamentos fora do alcance do revendedor, e-mail confirmado exigido no servidor, limpeza de
      cadastros e lojas não verificadas após 7 dias, endereços parecidos com "steam". Do design:
      aviso de confiança contradizia o campo de senha, erro longe do campo no celular, conta aberta
      sem atalho para o painel, textos e detalhes de toque. O que ficou para depois está em "Depois".

**Pronto quando:**

- Dá para criar conta, confirmar o e-mail, entrar, sair e recuperar a senha, com e-mails saindo
  pelo SMTP próprio.
- Toda tabela tem RLS ligado e um usuário não consegue ler nem alterar dados de outra loja.
- A loja só fica pública depois de verificada; o mesmo SteamID não abre uma segunda loja.
- Slug reservado é recusado.
- Uma loja com `pago_ate` vencido mostra "loja indisponível".
- Visitar a loja não consulta a Steam; atualizar o inventário grava o que entrou e o que saiu.

## Fase 5: painel do revendedor

Plano aprovado pelo dono em 20/10/2026:

- `/painel` em abas: Loja (situação, verificação, inventário e aviso de vencimento), Marca, Itens e
  Preços. Cada mudança grava na hora e aparece na loja pública (o cache da loja muda junto).
- Marca: nome (até 40, sem "steam"/"valve"), endereço, frase (até 120), WhatsApp, redes, logo,
  banner, cor de destaque e claro/escuro, com prévia do topo da loja no tema escolhido. A loja
  ganha um topo novo com banner, logo, nome, frase, redes e WhatsApp.
- Redes: Instagram, TikTok, YouTube e Discord. O revendedor digita só o usuário (ou o código do
  convite) e o servidor monta o link: nenhum link livre na loja.
- Uploads passam pelo servidor, que decodifica e reconverte para WebP com o `sharp` (apaga os dados
  da foto, como a localização), recusa SVG, o que não é imagem e arquivos acima de 8 MB. Logo até
  320×320 com transparência; banner até 1600 px de largura, com ponto de foco e prévia do recorte
  no celular e no computador. Bucket público `marcas` no Storage, só WebP.
- Cor de destaque: até 3 sugestões tiradas da logo, mais o seletor livre.
- Itens: busca e filtros (todos, ocultos, preço manual, reservados, vendidos), ocultar/mostrar na
  lista e edição com preço padrão, manual ou "sob consulta", "voltar ao padrão", custo e situação.
  Ocultos nem saem do servidor; reservados e vendidos ganham etiqueta. O custo nunca sai na loja
  pública e fica guardado na saída do item (base do relatório de lucro da fase 7).
- Preços: desconto padrão de 0% a 80% (30% por padrão) e arredondamento, com exemplo de um item do
  inventário. Prévia e demo seguem com os 30% da configuração.
- Aviso de vencimento a partir de 5 dias antes (teste e plano pago): data, valor do plano da loja,
  chave Pix com botão de copiar e WhatsApp do dono para o comprovante. Fica também com a loja fora
  do ar.

Decisões (o dono aprovou as recomendações em 20/10/2026):

1. Trocar o endereço: o antigo redireciona para o novo por 60 dias e ninguém pode pegá-lo nesse
   tempo (evita que alguém pegue o link de uma loja conhecida para dar golpe).
2. Arredondamento: sem arredondar (R$ 123,47), real inteiro (R$ 123), final ,90 (R$ 122,90) ou
   múltiplo de 5 (R$ 120), sempre para baixo, para a economia nunca ficar menor que a prometida.
   Preço baixo demais para o arredondamento fica com os centavos.
3. Redes: Instagram, TikTok, YouTube e Discord.
4. Cada loja guarda plano e valor; as que existem e as novas começam no mensal com o valor da
   configuração. Fundador e troca de plano ficam no `/admin` (fase 6). A chave Pix vai na tabela
   `configuracao` (`pix_dono`).
5. Dependência nova: `sharp`, para converter as imagens em WebP no servidor.

- [x] Marca: nome, slug, logo, banner (recorte e ponto de foco, convertido para WebP), frase, redes
      sociais, WhatsApp, cor de destaque (sugerida a partir da logo), claro/escuro.
- [x] Itens: ocultar/mostrar, preço manual, custo, reservado/vendido. O preço manual não apaga o
      padrão (Steam menos o desconto da loja): o painel mostra os dois e tem "voltar ao padrão"
      (pedido do dono em 18/10/2026).
- [x] Desconto padrão e arredondamento da loja.
- [x] Aviso de vencimento 5 dias antes, com a chave Pix do dono e o valor do plano do revendedor.
      A chave Pix vai em `configuracao.pix_dono` (Table Editor do Supabase); vazia, o aviso leva
      ao WhatsApp do dono.
- [x] Rodar o design-reviewer e o security-reviewer. Corrigidos do design: nome da skin esmagado
      pelo preço na lista de itens, topo da loja alto demais (banner 3:1 no celular e 6:1 no
      computador, nome menor com banner, "Copiar link" só com ícone no celular), item vendido com
      preço e "chame no WhatsApp", foco do banner mudando ao rolar a página (agora só um toque parado
      muda), anel de foco cortado nas abas e chips, toques menores que 44px, exemplos de preço com
      itens de preço manual, contornos abaixo de 3:1, cor escolhida sem nome, "Salvar" fora da tela
      na edição do item, aviso de vencimento repetido em todas as abas (agora uma linha fora da aba
      Loja). Da segurança: teto de 32 KB no corpo de toda gravação da API (antes, alguns POSTs de
      100 MB derrubariam o servidor), um envio de imagem por conta e dois no servidor, teto de
      pixels menor e AVIF fora, imagens só com a loja verificada, nome e frase só com letras
      latinas e trava de Steam/Valve com NFKC e letras soltas ("Ѕteam", "Ｓｔｅａｍ", "S.t.e.a.m"),
      trava no banco contra a corrida na reserva do endereço antigo, reserva só para loja verificada
      e mantida se a loja for apagada, limite também para as tentativas de trocar o endereço, chave
      Pix só quando o aviso aparece.

- [x] Ajuste pedido pelo dono em 21/10/2026: a aba Itens virou uma grade de cartões (uma coluna no
      celular, até quatro no computador), com filtros de categoria, arma e situação (inclusive
      "Sem preço") e ordem por raridade, preço, nome ou float. As abas Loja e Preços se dividem
      em colunas no computador, e o aviso de vencimento põe a chave Pix ao lado do texto.

**Pronto quando:**

- Cada mudança no painel aparece na loja pública.
- Logo e banner enviados viram WebP no tamanho certo; arquivos que não são imagem são recusados.
- O custo do item nunca chega ao visitante da loja.
- O aviso de vencimento aparece a partir de 5 dias antes, com o valor do plano daquela loja.

## Fase 6: admin

Plano aprovado pelo dono em 21/10/2026:

- Admin: e-mails em `NUXT_ADMIN_EMAILS` (no `.env` e na Render), conferidos no servidor em toda
  página `/admin` e rota `/api/admin`, com sessão e e-mail confirmado. Entra pelo `/entrar` de
  sempre; o painel mostra o botão "Admin" só para quem está na lista.
- Banco: `lojas.fundador` e `lojas.bloqueada_em`, observações numa tabela à parte (o revendedor lê a
  própria linha de `lojas`), `registrar_pagamento` numa transação e `admin_lojas` com o e-mail do
  dono, itens, visitas e cliques em 30 dias.
- Tela `/admin` em abas: Lojas (busca, filtros que também são o resumo, lista da mais urgente para a
  menos, detalhe com as ações) e Pagamentos (por mês, com o total).

Decisões (o dono aprovou as recomendações em 21/10/2026):

1. Pagamento de 3 meses numa loja mensal passa a loja para o trimestral (e o contrário), com o
   valor do plano na configuração e o desconto de fundador, se for: o aviso de vencimento mostra o
   valor certo.
2. Quem não é admin recebe 404 (e não 403), para não revelar que o `/admin` existe.
3. Ficam para "Depois": desfazer um pagamento lançado errado, tirar o fundador sozinho de quem
   cancelou e avisar o admin quando o revendedor troca o WhatsApp ou o endereço.

- [x] Lista de lojas: status, teste/pago até, plano e valor, fundador ou não, verificada ou não,
      última atualização, número de itens, visitas e cliques no WhatsApp em 30 dias. O número
      grande de cada linha é quantos dias faltam para o vencimento (ou quantos passaram), com a
      faixa da esquerda na cor da urgência; o filtro "Cobrar" junta as vencidas e as que vencem em
      até 5 dias.
- [x] Ações: registrar pagamento (período de 1 ou 3 meses e valor recebido), bloquear/desbloquear
      manualmente, marcar como fundador, verificar loja, abrir loja, observações. Registrar
      pagamento e bloquear pedem confirmação. Loja bloqueada mostra "loja indisponível", e o painel
      do revendedor diz que ela foi suspensa, com o WhatsApp do dono e sem a chave Pix.
- [x] Botão "Cobrar no WhatsApp" com a mensagem pronta (vencimento, valor do plano da loja, chave
      Pix do dono e pedido do comprovante), na lista e no detalhe.
- [x] Histórico de pagamentos (data, valor, período, observação) e total recebido no mês. O total é a
      soma das mesmas linhas da lista, no horário de Brasília. Cada pagamento guarda o e-mail do
      admin que registrou.
- [x] Rodar o security-reviewer (duas rodadas) e o design-reviewer, pela tela nova.
      Corrigidos da segurança:
      - Verificação de posse pelo id da loja, conferindo o SteamID e o código. Antes, ela gravava
        pelo endereço, e quem tivesse duas lojas não verificadas podia trocar o endereço entre elas
        durante a leitura do perfil e verificar o inventário de outra pessoa. Vinha da fase 4.
      - Registro de toda ação do admin (`registro_admin`).
      - Limite de 60 gravações a cada 10 minutos por admin.
      - Origem conferida também dentro de cada rota.
      - Caminhos com "." e ".." e com outras maiúsculas.
      - Painel e admin fora de iframe.
      - Nome do perfil Steam sem caracteres que invertem o texto.
      - Ajustes do Supabase Auth documentados no README.
      Corrigidos do design:
      - Borda dos campos com 3:1 também sobre a superfície (vale para o site todo).
      - Cor de prazo no tema (`--warn`).
      - Anel de foco no chip ativo.
      - Caixa de observação na fonte Saira.
      - Frase de confiança no formulário de criar loja do painel (vinha da fase 4).
      - Loja bloqueada sem "Cobrar".
      - Blocos alinhados no celular.
      - Coluna Situação em 1024px.
      - Dados do detalhe no celular.
      - Contorno dos botões no detalhe.
      - Setas e mês vazio em Pagamentos.
      - Áreas de toque de 24px.
      - "Ver todas" no celular.
      O que ficou para o dono decidir está em "Depois".

**Pronto quando:**

- Registrar um pagamento soma o período a partir do vencimento ou de hoje, o que for maior, e
  desbloqueia a loja.
- Quem não está na lista de e-mails de admin recebe erro em toda página `/admin` e rota
  `/api/admin`, checado no servidor.
- O total do mês bate com o histórico de pagamentos.

## Fase 7: retenção (depois)

- [ ] Estatísticas por item para o revendedor.
- [ ] Histórico de vendas: o que saiu do inventário vira "Foi venda? Por quanto?".
- [ ] Relatório de lucro mensal com base no custo.
- [ ] Exclusão dos dados 60 dias após a suspensão.

**Pronto quando:**

- O revendedor vê visitas e cliques por item.
- Um item que saiu do inventário pode ser marcado como venda com valor, e o relatório mensal mostra
  o lucro sobre o custo.
- Lojas suspensas há mais de 60 dias têm os dados apagados automaticamente.

## Depois

Ideias que surgirem durante as fases e ficaram fora do escopo.

- Bordas dos chips (`--line`) abaixo de 3:1: 1,6:1 no escuro, cerca de 1,5:1 no claro. As dos campos
  de texto foram corrigidas na fase 3 (`--field-line`).
- Áreas de toque: busca, botão Filtros e ordenação com 42px, chips com 36px, Fechar da ficha com 40px;
  o link do rodapé da loja tem 20px de altura (abaixo de 24px).
- O resumo conta unidades ("50 itens no inventário") e o chip Tudo conta cards (32). Unificar.
- Fases Doppler gema (Ruby, Sapphire, Black Pearl, Emerald) valem várias vezes o preço Steam, que
  é o mesmo para todas as fases: esconder o riscado nelas.
- Página de ajuda: citar a fonte do câmbio (PTAX/Banco Central do Brasil, licença ODbL).
- Ordenar a loja por preço (menor e maior).
- Fonte: no primeiro carregamento o título aparece numa fonte de reserva larga antes da Saira.
  Pré-carregar o arquivo da fonte.
- Campo com erro no formulário da prévia: com o foco, a borda volta para a cor de foco e perde o
  vermelho do erro.
- Páginas de termos e de privacidade (LGPD) antes do primeiro revendedor: o cadastro guarda e-mail,
  WhatsApp e SteamID.
- Revisão de segurança da fase 4, aceitos por enquanto:
  - O WhatsApp entra na trava de "um teste grátis" sem ser verificado: alguém pode gastar o teste do
    número de outra pessoa (ou fugir da trava trocando o número). Decidir se o WhatsApp só sinaliza
    para o admin em vez de negar o teste.
  - Quem errar 5 senhas num e-mail trava o login dele por 15 minutos. Trocar o bloqueio por
    Turnstile depois do limite.
  - Os limites por IP da Auth do Supabase valem para o site inteiro (todas as chamadas saem do
    servidor): subir os limites no painel do Supabase e registrar os valores aqui.
  - Eventos gravam uma linha cada; com muito tráfego, agregar por dia.
- Revisão de segurança da fase 5, aceitos por enquanto:
  - Trocar o WhatsApp e o endereço da loja não pede a senha de novo: quem roubar a sessão troca o
    número em silêncio. Pedir a senha ou registrar a mudança para o admin (fase 6).
  - Imagens de loja apagada ficam no bucket `marcas` (o SQL não apaga arquivos do Storage). A
    exclusão da fase 7 precisa apagar `marcas/<id da loja>/` pela API do Storage.
  - Quando uma loja for apagada (fase 7), o endereço atual dela fica livre na hora; os antigos
    continuam reservados. Reservar também o atual ao apagar.
  - Arquivo acima de 8 MB recebe 413 antes de ser lido, e o navegador mostra erro de rede em vez
    da mensagem (o painel confere o tamanho antes de enviar).
- Admin (fase 6), deixado para depois:
  - Desfazer um pagamento lançado errado (volta o vencimento e sai do total do mês). Por enquanto,
    corrigir no Table Editor do Supabase: apagar a linha em `pagamentos` e acertar `lojas.pago_ate`.
  - Avisar o admin quando o revendedor troca o WhatsApp ou o endereço da loja (pendente da fase 5).
  - A lista do admin traz todas as lojas de uma vez (até 1000, o teto da API do Supabase).
    Paginar quando passar de algumas centenas.
- Revisão de segurança da fase 6, à espera da decisão do dono:
  - Segundo fator (TOTP do Supabase) para entrar no admin: hoje basta a senha. Com ele,
    `requireAdmin` confere `aal2`.
  - "Sair de todos os aparelhos": hoje "Sair" encerra só a sessão do navegador onde foi clicado, e
    uma sessão roubada continua valendo até 30 dias.
  - Eventos (visitas e cliques) de uma loja recém-bloqueada ainda contam por até 5 minutos (cache da
    loja em `eventos.post.js`). A loja pública sai do ar na hora.
- Cadastro confirmado em outro aparelho (25/10/2026), deixado para depois:
  - Resolvido em 25/10/2026. Já existia: o limite de e-mails da Auth (60 s entre envios) só vale
    para e-mail com conta, e o 429 chegava à tela em `/recuperar`, `/reenviar` e no cadastro.
    Pedindo duas vezes seguidas, dava para saber se um e-mail tem conta (o tempo de resposta também
    denunciava). Agora o 429 da Auth vira resposta normal e vai para o log, `/recuperar` e
    `/reenviar` respondem sem esperar a Auth, e o cadastro espera no mínimo 3 s por ela e grava o
    cookie de cadastro em andamento sempre (com um id inventado quando a Auth não devolve a conta).
    O limite do `GET /api/conta/cadastro` conta por cookie, e não pelo id da conta (o contador
    mostrava quando dois cadastros do mesmo e-mail tinham o mesmo id). O limite por IP da Auth
    (`over_request_rate_limit`) continua aparecendo como "Muitas tentativas": vem antes de ela olhar
    a conta. Ficou de propósito: `EMAIL_FAILED` quando o SMTP recusa o envio, que só acontece com o
    SMTP quebrado para todo mundo.
- Revisão de segurança da enumeração de contas (25/10/2026), deixado para depois:
  - Login: a Auth só roda o bcrypt quando acha o e-mail, então o `LOGIN_FAILED` de e-mail sem conta
    deve voltar mais rápido (não medido). Dar um tempo mínimo ao `LOGIN_FAILED` com o `atLeast`.
  - O limite de e-mails do projeto na Auth responde com o mesmo 429 do intervalo de 60 s e agora
    fica só no log: esgotado, o cadastro mostra "Confira seu e-mail" e nada chega. Dá para esgotar
    de propósito pelo `/reenviar` (sem Turnstile), e o mesmo vale para o limite diário do Gmail
    (cerca de 500), que leva ao `EMAIL_FAILED`. Subir o limite de e-mails do Supabase até o do
    Gmail, pôr Turnstile em `/recuperar` e `/reenviar` e criar um alerta para essas linhas do log.
  - Telas de conta: o `<label>` envolve o campo de senha, o botão "Mostrar" e a dica, e o leitor de
    tela lê tudo como nome do campo. Separar o rótulo com `for`/`id`.
  - "Usar outro e-mail" depois de recarregar a página volta com Steam, WhatsApp e endereço vazios.
