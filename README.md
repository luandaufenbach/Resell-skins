# api-skins (Vitrine)

Loja de skins de CS2 gerada a partir do inventário público da Steam.
O revendedor cola o link do perfil e vê na hora uma prévia da loja, com foto, desgaste,
float, stickers, preço e botão de WhatsApp em cada item.

Feito com Nuxt 4 em JavaScript, sem TypeScript.

## Rodar na sua máquina

Precisa do Node.js 22.21+ ou 24.11+.

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

- `/` página inicial: apresenta o produto, com a loja de exemplo funcionando
- `/previa` formulário (link da Steam + WhatsApp) que gera a prévia
- `/previa/<id>` prévia da loja, vale 24 horas e fica fora do Google
- `/demo` catálogo de exemplo, funciona sem consultar a Steam (`/loja/demo` redireciona)
  (`?cor=ff5500` troca a cor de destaque e `?fundo=claro` usa o fundo claro; prévia e lojas também aceitam)
- `/cadastro`, `/entrar`, `/esqueci-senha`, `/nova-senha`, `/confirmar` conta do revendedor
- `/painel` painel do revendedor em abas: Loja (situação, verificação, "Atualizar inventário"),
  Marca (`?aba=marca`), Itens (`?aba=itens`) e Preços (`?aba=precos`), com o aviso de vencimento
- `/<slug>` loja do revendedor, pública depois da verificação e enquanto estiver paga

Para testar com um inventário de verdade, ele precisa estar público
(Steam > Editar perfil > Configurações de privacidade > Inventário: Público).

## Estrutura

```
app/
  pages/index.vue            página inicial
  pages/previa/index.vue     formulário da prévia
  pages/previa/[id].vue      prévia (loja + faixa "Prévia · Criar minha loja")
  pages/demo.vue             loja de exemplo
  pages/[slug].vue           loja do revendedor (ou "loja indisponível")
  pages/cadastro.vue, entrar.vue, esqueci-senha.vue, nova-senha.vue, confirmar.vue  conta
  pages/painel.vue           painel do revendedor, em abas (?aba=marca, itens, precos)
  components/AccountPage.vue moldura das telas de conta (formulário e, no computador, a vitrine)
  components/StoreWindow.vue vitrine de exemplo ao lado dos formulários, com o endereço da loja
  components/StoreFields.vue Steam, WhatsApp e endereço (cadastro e criação da loja no painel)
  components/PanelStatus.vue aba Loja: verificação, situação, inventário e conta
  components/PanelBrand.vue  aba Marca: logo, banner, cores, nome, frase, WhatsApp, redes, endereço
  components/BannerFocus.vue ponto de foco do banner (mira) e os recortes de celular e computador
  components/BrandPreview.vue prévia do topo da loja no tema escolhido
  components/PanelItems.vue  aba Itens: grade de cartões, busca, filtros, ordem, mostrar/ocultar
  components/ItemEditor.vue  edição de um item: preço padrão ou manual, sob consulta, custo, situação
  components/PanelPricing.vue aba Preços: desconto padrão e arredondamento, com exemplos do inventário
  components/PanelRenewal.vue aviso de vencimento com o valor do plano e a chave Pix
  components/StoreHeader.vue topo da loja: banner, logo, nome, frase, redes e ações
  components/TurnstileWidget.vue  caixa de verificação da Cloudflare (cadastro e prévia)
  components/StoreCatalog.vue  loja inteira (filtros, busca, ordenação, item aberto, eventos)
  components/HomeDemo.vue    demonstração da página inicial, com seletor de cor
  components/SkinCard.vue    card de cada skin
  components/SkinDetail.vue  ficha do item (folha no celular, janela no PC)
  components/WearMeter.vue   barra de desgaste com o float
  components/ItemPrice.vue   preço Steam riscado, preço do revendedor e economia
  utils/catalog.js           categorias, faixas de float, trava de troca, link do WhatsApp, erros
  utils/account.js           mensagens das telas de conta, formatação de telefone e datas
  utils/theme.js             cores do tema: fundo escuro/claro, cor de destaque, contraste AA
  utils/panel.js             valores em reais nos campos do painel e cores tiradas da logo
  composables/useTheme.js    aplica o tema no <html> (ou só num pedaço, na demonstração)
  assets/css/main.css        fontes, tamanhos, botões e campos
shared/utils/slug.js         endereço da loja: formato e nomes reservados (site e servidor)
shared/utils/pricing.js      preço do revendedor: desconto e arredondamento (site e servidor)
shared/utils/socials.js      redes da loja: usuário a partir do que foi digitado e o link montado
server/
  api/previa.post.js               cria a prévia (link da Steam + WhatsApp + Turnstile)
  api/previa/[id].get.js           loja da prévia (cópia do inventário), com cache de 10 min
  api/demo.get.js                  loja de exemplo
  api/configuracao.get.js          planos, preço de fundador e WhatsApp do dono
  api/conta/*                      cadastro, entrar, sair, confirmar e-mail, senha nova
  api/painel.get.js, api/painel/*  painel: loja, código de posse, verificar, atualizar, marca,
                                   imagem, endereço, preços e itens
  api/loja/[slug].get.js           loja pública, só do banco
  api/eventos.post.js              visitas, skins abertas e cliques no WhatsApp
  middleware/limit.js              limite de consultas por IP
  middleware/sessao.js             renova a sessão antes da página renderizar
  middleware/redirecionar.js       /loja/demo -> /demo
  utils/steam.js                   chamadas à Steam e tratamento de erros
  utils/inventory.js               transforma a resposta da Steam em itens do catálogo
  utils/demo.js                    dados do catálogo de exemplo
  utils/prices.js                  preço de cada item, lido do banco
  utils/previews.js                prévias: criar e ler
  utils/session.js                 sessão em cookies httpOnly, renovação, origem
  utils/account.js                 e-mail, senha e erros da Auth do Supabase
  utils/stores.js                  lojas: criar, código de posse, inventário, leitura pública
  utils/panel.js                   o que o painel pode gravar (marca, preços, itens), conferido
  utils/images.js                  logo e banner: confere, reconverte para WebP e grava no Storage
  utils/turnstile.js               confere o Turnstile na Cloudflare
  utils/limit.js                   contagem do limite por IP e por chave
scripts/
  migrar.js                        aplica as migrações (npm run migrar)
  precos.js                        job diário de preços (npm run precos)
  og.html, og.js                   imagem de compartilhamento (npm run og -> public/og.png)
supabase/migrations/               tabelas e funções do banco, com RLS
supabase/emails/                   modelos dos e-mails de conta (colar no Supabase)
.github/workflows/precos.yml       agenda o job de preços todo dia às 06:30
```

## API

`POST /api/previa` com `{ url, whatsapp, turnstile }` cria a prévia e responde `{ id }`. `url` aceita link de
perfil (`/id/apelido` ou `/profiles/7656...`), link de troca, SteamID64 ou só o apelido;
`whatsapp` vem só com números, com o 55 (ou vazio). O inventário é lido antes de gravar, e quem
cria recebe o cookie `previa_<id>`.

`GET /api/previa/<id>` responde `{ steamid, profile, items, fetchedAt, pricesOk, whatsapp, owner, expiresAt }`.
O `whatsapp` só vem para o navegador com o cookie da prévia (`owner: true`): assim ninguém usa uma
prévia com o inventário de outra pessoa e o próprio WhatsApp como se fosse uma loja.
`GET /api/demo` responde a loja de exemplo no mesmo formato, sem `whatsapp` e `expiresAt`.
`GET /api/configuracao` responde os planos, o preço de fundador e o WhatsApp do dono.

Erros vêm com `data.code`: `PRIVATE`, `RATE_LIMIT` (a Steam limitou), `NOT_FOUND`, `INVALID_INPUT`,
`STEAM_DOWN`, `INVALID_PHONE`, `EXPIRED` (410), `PREVIEW_NOT_FOUND`, `UNAVAILABLE` (banco fora) ou
`LIMIT` (429, limite por IP: criar prévia 10 por hora e 30 por dia; abrir prévia ou demo 60 por
minuto; IPv6 conta por bloco /64). Não existe rota que leia o inventário de qualquer SteamID: só
criando uma prévia. As consultas à Steam, somadas, ficam em 30 por minuto, e param por 2 minutos
quando a Steam responde 429.

A prévia guarda uma cópia do inventário lido na hora. Quando vence, o banco apaga o WhatsApp, o
SteamID e a cópia, e a linha some 7 dias depois (`interno.limpar_previas`, agendada de hora em
hora com pg_cron).

### Contas e lojas

Login, cadastro e senha passam pelo servidor, que fala com a Auth do Supabase e guarda a sessão
em cookies httpOnly (`vitrine_acesso` e `vitrine_sessao`); o navegador não recebe chave nenhuma.
O cookie `vitrine_conta` só avisa que há uma conta aberta (o topo mostra "Painel"). Gravação
(POST ou DELETE) vinda de outro site em `/api/conta` e `/api/painel` recebe 403.

Fluxo: cadastro (Steam, WhatsApp, endereço e e-mail) → link do e-mail, onde a pessoa cria a senha →
painel, que pede para conferir Steam, WhatsApp e endereço e cria a loja → código no perfil Steam →
loja no ar com 7 dias grátis. A senha não é pedida no cadastro porque o Supabase não troca a senha
nem os dados quando alguém cadastra de novo um e-mail ainda não confirmado: quem se cadastrasse
antes com o e-mail de outra pessoa ficaria com a conta.

- `POST /api/conta/cadastro` `{ steam, whatsapp, slug, email, turnstile }`: confere o endereço e o
  inventário (público e sem loja verificada) e cria a conta com uma senha provisória que ninguém
  conhece. `POST /api/conta/confirmar { token_hash, senha }` confirma o e-mail e grava a senha.
- `POST /api/conta/entrar`, `/sair`, `/recuperar`, `/nova-senha`, `/reenviar`. Cadastro,
  recuperação e reenvio respondem igual com ou sem conta para o e-mail. Login: 10 tentativas por IP
  e 5 falhas por e-mail a cada 15 minutos (a senha certa não gasta tentativa).
- `GET /api/painel` e `POST /api/painel/{loja,codigo,verificar,atualizar}`: `loja` cria a loja com
  os dados conferidos; verificar procura o código `VTR-XXXX` no XML público do perfil do SteamID da
  loja (5 tentativas a cada 10 minutos); atualizar relê a Steam no máximo a cada 10 minutos (3
  tentativas, contando as que falham) e grava o que entrou e o que saiu.
- `GET /api/loja/<slug>`: loja pública, só do banco, com a marca (`brand`) e o desconto da loja.
  Itens ocultos e o custo dos itens não saem. 404 `STORE_NOT_FOUND`; 403 `STORE_UNAVAILABLE` quando
  não está verificada ou o `pago_ate` venceu; `{ moved }` quando o endereço é antigo (a página
  redireciona com 301 enquanto ele vale, 60 dias depois da troca).

Painel (fase 5). Toda rota exige a sessão e só mexe na loja da própria conta; cada gravação marca
`lojas.alterada_em`, que entra na chave do cache da loja pública. Toda gravação na API aceita no
máximo 32 KB de corpo (8 MB no envio de imagem), conferidos antes de a rota ler
(`server/middleware/tamanho.js`). Nome e frase da loja aceitam só letras latinas, números,
pontuação e (na frase) emoji, e não podem lembrar Steam nem Valve.

- `POST /api/painel/marca` `{ name?, tagline?, whatsapp?, socials?, color?, background?, focus? }`:
  grava só os campos que vieram. Nome até 40 (sem lembrar Steam ou Valve), frase até 120, redes
  como usuário (`{ instagram, tiktok, youtube, discord }`; o link é montado no servidor), cor em hex
  e fundo `escuro` ou `claro`, foco do banner em %.
- `POST /api/painel/imagem?tipo=logo|banner` com o arquivo no corpo (até 8 MB), só com a loja
  verificada: o servidor confere o formato pelos primeiros bytes (JPEG, PNG, WebP ou GIF, até 16 MP
  na logo e 20 MP no banner; SVG e AVIF não), reconverte para WebP sem os dados da foto (logo até
  320×320, banner até 1600×900) e grava no bucket público `marcas` com o hash no nome. Um envio por
  vez por conta e dois no servidor. `DELETE` no mesmo endereço tira a imagem. Erros: `NOT_IMAGE`,
  `LOGO_SMALL`, `BANNER_SMALL`, `NOT_VERIFIED` (403), `UPLOAD_BUSY` (429), `IMAGE_TOO_LARGE` (413).
- `POST /api/painel/endereco { slug }`: troca o endereço. Com a loja verificada, o antigo
  redireciona por 60 dias e ninguém pega nesse tempo, mesmo se a loja for apagada (gatilho
  `interno.endereco_livre`, com trava no banco contra duas trocas ao mesmo tempo). No máximo 5
  endereços antigos valendo por loja (`SLUG_CHANGES`), 5 trocas por dia e 30 tentativas por hora.
- `POST /api/painel/precos { discount, rounding }`: desconto padrão em % (0 a 80) e arredondamento
  (`centavos`, `inteiro`, `noventa` ou `cinco`, sempre para baixo; veja `shared/utils/pricing.js`).
- `GET /api/painel/itens`: todos os itens com o preço Steam, o padrão e os ajustes (inclusive o
  custo, que só sai aqui). `POST /api/painel/itens/<assetid>`
  `{ hidden?, price?, ask?, cost?, status? }`: `price: null` volta ao padrão; `status` é `null`,
  `reservado` ou `vendido`. Os ajustes ficam nas atualizações do inventário e saem com o item;
  o custo fica guardado na movimentação de saída.
- `POST /api/eventos { loja, tipo, item }`: `visita`, `item` ou `whatsapp`, uma vez por visitante a
  cada 30 minutos, só de itens que existem na loja e no máximo 40 por visitante e loja nessa janela.

Verificação manual pelo admin (até o `/admin` da fase 6), no SQL Editor do Supabase:
`select public.verificar_loja('<slug>');`. Ela começa o teste de 7 dias, a menos que o SteamID, o
e-mail ou o WhatsApp já tenham usado um.

Todo dia, o banco apaga contas que não confirmaram o e-mail e lojas não verificadas com mais de 7
dias (`interno.limpar_cadastros`, pg_cron): o endereço volta a ficar livre.

## Configuração

Copie `.env.example` para `.env` e preencha as chaves do Supabase e da SteamApis
(cada variável está explicada lá). Depois, `npm run migrar` cria as tabelas e
`npm run precos` carrega os preços pela primeira vez.

Planos, preço de fundador, o WhatsApp do dono (contato da página inicial e do painel) e a chave Pix
do dono (aviso de vencimento no painel) ficam na tabela `configuracao` do Supabase (chaves
`planos`, `fundadores`, `whatsapp_dono` e `pix_dono`). Para mudar, edite a linha no Table
Editor; o site lê de novo em até 5 minutos. Cada loja guarda o próprio plano e valor (`lojas.plano`
e `lojas.valor`); a loja nova começa no mensal com o valor da configuração.

No Supabase, para os e-mails de conta: Authentication > URL Configuration > Site URL com o endereço
do site (os links dos e-mails usam ele), SMTP próprio em Authentication > Emails > SMTP Settings, e
os modelos de `supabase/emails/` colados em Authentication > Emails > Templates (Confirm signup e
Reset password, com o assunto que está no topo de cada arquivo). "Confirm email" fica ligado (o
servidor também exige o e-mail confirmado). Todas as chamadas à Auth saem do IP do servidor, então
os limites por IP da Auth (Authentication > Rate Limits) valem para o site inteiro: suba os de
login, cadastro e verificação; os limites por pessoa ficam no nosso servidor.

Com `NUXT_STEAM_API_KEY` preenchida, links
`/id/apelido` são resolvidos pela API oficial da Steam. Sem ela, funciona pelo
XML público do perfil. A chave é sua, da plataforma, nunca do revendedor.

## Hospedagem

O site roda na Render, configurado pelo `render.yaml` (serviço web Node na região virginia, a
mesma do Supabase). Cada push no `main` publica sozinho. Variáveis no painel da Render:
`NUXT_SUPABASE_URL`, `NUXT_SUPABASE_SECRET_KEY`, `NUXT_SUPABASE_PUBLISHABLE_KEY`,
`NUXT_PUBLIC_SITE_URL` (endereço do site, para a imagem de compartilhamento e o link da prévia),
`NUXT_PUBLIC_TURNSTILE_SITE_KEY` e `NUXT_TURNSTILE_SECRET_KEY`. Sem a chave do Turnstile, cadastro
e prévia respondem "tente de novo em alguns minutos". `NODE_VERSION` e `NUXT_IP_HEADER` (cabeçalho
com o IP do visitante, para o limite por IP) já vêm do `render.yaml`. O limite, os eventos já
contados e o cache (com teto de 64 MB) ficam na memória do servidor: com mais de uma instância,
cada uma contaria separado. As variáveis de banco direto
(`SUPABASE_DB_URL`, `PRECOS_DB_URL`) e a da SteamApis não vão para a Render: as migrações rodam
na máquina do dono e o job de preços no GitHub Actions.

Para testar a versão de produção na sua máquina: `npm run build` e depois
`node --env-file=.env .output/server/index.mjs`.

## Tema

As cores vêm de `app/utils/theme.js`: uma base escura (o tema padrão) ou clara e uma
cor de destaque opcional, da qual saem botões, chips ativos e foco. Toda cor de texto
passa por um ajuste automático para manter o contraste AA. A cor de cada card vem
da raridade do próprio item.

## Preços

O job diário (`scripts/precos.js`) lê a lista de preços do mercado da Steam da SteamApis
(em USD) e a PTAX do Banco Central, e grava tudo no Supabase. O preço Steam de cada item é a
mediana das vendas recentes, limitada ao menor anúncio. Sem venda recente, vira uma estimativa
(≈): menor anúncio × fator de calibração por faixa, com facas e luvas à parte, nunca acima da
última venda. Os fatores ficam com histórico na tabela `calibracao`. A loja só lê o banco: abrir
uma loja não consulta a SteamApis nem a Steam.
