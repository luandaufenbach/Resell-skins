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
- `/loja/demo` catálogo de exemplo, funciona sem consultar a Steam
  (`?cor=ff5500` troca a cor de destaque e `?fundo=claro` usa o fundo claro; a prévia também aceita)

Para testar com um inventário de verdade, ele precisa estar público
(Steam > Editar perfil > Configurações de privacidade > Inventário: Público).

## Estrutura

```
app/
  pages/index.vue            página inicial
  pages/previa/index.vue     formulário da prévia
  pages/previa/[id].vue      prévia (loja + faixa "Prévia · Criar minha loja")
  pages/loja/demo.vue        loja de exemplo
  components/StoreCatalog.vue  loja inteira (filtros, busca, ordenação, item aberto)
  components/HomeDemo.vue    demonstração da página inicial, com seletor de cor
  components/SkinCard.vue    card de cada skin
  components/SkinDetail.vue  ficha do item (folha no celular, janela no PC)
  components/WearMeter.vue   barra de desgaste com o float
  components/ItemPrice.vue   preço Steam riscado, preço do revendedor e economia
  utils/catalog.js           categorias, faixas de float, trava de troca, link do WhatsApp, erros
  utils/theme.js             cores do tema: fundo escuro/claro, cor de destaque, contraste AA
  composables/useTheme.js    aplica o tema no <html> (ou só num pedaço, na demonstração)
  assets/css/main.css        fontes, tamanhos, botões e campos
server/
  api/previa.post.js               cria a prévia (link da Steam + WhatsApp)
  api/previa/[id].get.js           loja da prévia, com cache de 10 min
  api/demo.get.js                  loja de exemplo
  api/configuracao.get.js          planos, preço de fundador e WhatsApp do dono
  middleware/limit.js              limite de consultas por IP
  utils/steam.js                   chamadas à Steam e tratamento de erros
  utils/inventory.js               transforma a resposta da Steam em itens do catálogo
  utils/demo.js                    dados do catálogo de exemplo
  utils/prices.js                  preço de cada item, lido do banco
  utils/previews.js                prévias: criar, ler e apagar as vencidas
  utils/limit.js                   contagem do limite por IP
scripts/
  migrar.js                        aplica as migrações (npm run migrar)
  precos.js                        job diário de preços (npm run precos)
  og.html, og.js                   imagem de compartilhamento (npm run og -> public/og.png)
supabase/migrations/               tabelas e funções do banco, com RLS
.github/workflows/precos.yml       agenda o job de preços todo dia às 06:30
```

## API

`POST /api/previa` com `{ url, whatsapp }` cria a prévia e responde `{ id }`. `url` aceita link de
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

Quando a prévia vence, o banco apaga o WhatsApp e o SteamID dela, e a linha some 7 dias depois
(`interno.limpar_previas`, agendada de hora em hora com pg_cron).

## Configuração

Copie `.env.example` para `.env` e preencha as chaves do Supabase e da SteamApis
(cada variável está explicada lá). Depois, `npm run migrar` cria as tabelas e
`npm run precos` carrega os preços pela primeira vez.

Planos, preço de fundador e o WhatsApp do botão "Criar minha loja" ficam na tabela
`configuracao` do Supabase (chaves `planos`, `fundadores` e `whatsapp_dono`). Para mudar,
edite a linha no Table Editor; o site lê de novo em até 5 minutos.

Na hospedagem, preencha `NUXT_PUBLIC_SITE_URL` (endereço do site, para a imagem de
compartilhamento e o link da prévia) e `NUXT_IP_HEADER` (cabeçalho com o IP do visitante,
para o limite por IP). O limite conta na memória do servidor: com mais de uma instância,
cada uma conta separado.

Com `NUXT_STEAM_API_KEY` preenchida, links
`/id/apelido` são resolvidos pela API oficial da Steam. Sem ela, funciona pelo
XML público do perfil. A chave é sua, da plataforma, nunca do revendedor.

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
