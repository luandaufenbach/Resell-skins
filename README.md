# api-skins (Vitrine)

Catálogo de skins de CS2 gerado a partir do inventário público da Steam.
O revendedor cola o link do perfil e recebe uma página para mandar a quem quiser comprar,
com foto, desgaste, float, stickers e botão de WhatsApp em cada item.

Feito com Nuxt 4 em JavaScript, sem TypeScript.

## Rodar na sua máquina

Precisa do Node.js 20 ou mais novo.

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

- `/` página do revendedor (colar o link da Steam)
- `/loja/demo` catálogo de exemplo, funciona sem consultar a Steam
  (`?cor=ff5500` troca a cor de destaque e `?fundo=claro` usa o fundo claro)
- `/loja/<steamid>?w=5548999999999` catálogo real, com WhatsApp opcional

Para testar com um inventário de verdade, ele precisa estar público
(Steam > Editar perfil > Configurações de privacidade > Inventário: Público).

## Estrutura

```
app/
  pages/index.vue            página do revendedor
  pages/loja/[steamid].vue   catálogo (filtros, busca, ordenação, item aberto)
  components/SkinCard.vue    card de cada skin
  components/SkinDetail.vue  ficha do item (folha no celular, janela no PC)
  components/WearMeter.vue   barra de desgaste com o float
  utils/catalog.js           categorias, faixas de float, trava de troca, link do WhatsApp, erros
  utils/theme.js             cores do tema: fundo escuro/claro, cor de destaque, contraste AA
  composables/useTheme.js    aplica o tema no <html>
  assets/css/main.css        fontes, tamanhos, botões e campos
server/
  api/resolve.get.js               link da Steam -> SteamID64
  api/inventory/[steamid].get.js   inventário + perfil, com cache de 10 min
  utils/steam.js                   chamadas à Steam e tratamento de erros
  utils/inventory.js               transforma a resposta da Steam em itens do catálogo
  utils/demo.js                    dados do catálogo de exemplo
```

## API

`GET /api/resolve?url=<link>` aceita link de perfil (`/id/apelido` ou `/profiles/7656...`),
link de troca, SteamID64 ou só o apelido. Responde `{ "steamid": "7656..." }`.

`GET /api/inventory/<steamid>` responde `{ steamid, profile, items, fetchedAt }`.
Erros vêm com `data.code`: `PRIVATE`, `RATE_LIMIT`, `NOT_FOUND`, `INVALID_INPUT` ou `STEAM_DOWN`.

## Configuração opcional

Copie `.env.example` para `.env`. Com `NUXT_STEAM_API_KEY` preenchida, links
`/id/apelido` são resolvidos pela API oficial da Steam. Sem ela, funciona pelo
XML público do perfil. A chave é sua, da plataforma, nunca do revendedor.

## Tema

As cores vêm de `app/utils/theme.js`: uma base escura (o tema padrão) ou clara e uma
cor de destaque opcional, da qual saem botões, chips ativos e foco. Toda cor de texto
passa por um ajuste automático para manter o contraste AA. A cor de cada card vem
da raridade do próprio item.
