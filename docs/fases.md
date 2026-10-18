# Fases

Uma fase por sessão. Começar com um plano curto e esperar aprovação antes de escrever código.
As decisões de produto, preço e design estão no [CLAUDE.md](../CLAUDE.md).

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

Antes de começar: hospedagem escolhida (com uso comercial permitido no plano), Resend e Turnstile
criados e chaves no `.env`.

- [ ] Cadastro com verificação de e-mail, recuperação de senha e Turnstile.
- [ ] Limite de tentativas no login.
- [ ] Turnstile também na geração de prévia (`POST /api/previa`), como pede o CLAUDE.md.
- [ ] Na hospedagem: preencher `NUXT_PUBLIC_SITE_URL` e `NUXT_IP_HEADER` e testar o limite com um
      cabeçalho de IP falsificado (com dois proxies, como Cloudflare na frente da hospedagem, o
      último valor do x-forwarded-for é o do proxy). O limite por IP conta na memória do servidor;
      se a hospedagem rodar mais de uma instância, mover a contagem para um lugar compartilhado.
- [ ] Cache em memória sem teto: cada inventário lido fica guardado até o servidor reiniciar.
      Limitar o tamanho (driver lru-cache do unstorage) ou usar armazenamento externo, conforme a
      hospedagem. Com isso, decidir também se a prévia guarda uma cópia da loja por 24h em vez de
      reler a Steam a cada 10 minutos.
- [ ] Com o site no ar, colar o link de `/` no WhatsApp e conferir imagem e título (fase 3).
- [ ] Tabelas com RLS: lojas, itens, sincronizações, movimentações do inventário, eventos,
      pagamentos.
- [ ] Verificação de posse pelo código no perfil Steam; verificação manual pelo admin.
- [ ] Lojas em `dominio.com/<slug>`, respeitando os nomes reservados. A demo passa a ser `/demo`.
- [ ] O botão "Criar minha loja" da prévia leva ao cadastro já preenchido com a Steam e o WhatsApp.
- [ ] Teste de 7 dias (um por SteamID, por e-mail e por WhatsApp), bloqueio automático no
      vencimento, página "loja indisponível".
- [ ] Atualização manual do inventário com intervalo mínimo, gravando entradas e saídas.
- [ ] Gravar eventos (visita na loja, visita no item, clique no WhatsApp), ainda sem telas.
- [ ] Rodar o security-reviewer.

**Pronto quando:**

- Dá para criar conta, confirmar o e-mail, entrar, sair e recuperar a senha, com e-mails saindo
  pelo SMTP próprio.
- Toda tabela tem RLS ligado e um usuário não consegue ler nem alterar dados de outra loja.
- A loja só fica pública depois de verificada; o mesmo SteamID não abre uma segunda loja.
- Slug reservado é recusado.
- Uma loja com `pago_ate` vencido mostra "loja indisponível".
- Visitar a loja não consulta a Steam; atualizar o inventário grava o que entrou e o que saiu.

## Fase 5: painel do revendedor

- [ ] Marca: nome, slug, logo, banner (recorte e ponto de foco, convertido para WebP), frase, redes
      sociais, WhatsApp, cor de destaque (sugerida a partir da logo), claro/escuro.
- [ ] Itens: ocultar/mostrar, preço manual, custo, reservado/vendido.
- [ ] Desconto padrão e arredondamento da loja.
- [ ] Aviso de vencimento 5 dias antes, com a chave Pix do dono e o valor do plano do revendedor.
- [ ] Rodar o design-reviewer e o security-reviewer.

**Pronto quando:**

- Cada mudança no painel aparece na loja pública.
- Logo e banner enviados viram WebP no tamanho certo; arquivos que não são imagem são recusados.
- O custo do item nunca chega ao visitante da loja.
- O aviso de vencimento aparece a partir de 5 dias antes, com o valor do plano daquela loja.

## Fase 6: admin

- [ ] Lista de lojas: status, teste/pago até, plano e valor, fundador ou não, verificada ou não,
      última atualização, número de itens, visitas e cliques no WhatsApp em 30 dias.
- [ ] Ações: registrar pagamento (período de 1 ou 3 meses e valor recebido), bloquear/desbloquear
      manualmente, marcar como fundador, verificar loja, abrir loja, observações.
- [ ] Botão "Cobrar no WhatsApp" com a mensagem pronta.
- [ ] Histórico de pagamentos (data, valor, período, observação) e total recebido no mês.
- [ ] Rodar o security-reviewer.

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
