# Vitrine

Nome provisório. Assinatura mensal para revendedores brasileiros de skins de CS2. O revendedor
ganha uma loja online gerada a partir do inventário público da Steam, com a marca dele, preços e
botão de WhatsApp, em `dominio.com/<slug-da-loja>`. Os clientes do revendedor abrem a loja pelo
celular, vindo de WhatsApp, Instagram e Discord.

Foco: coletar o inventário e gerar um catálogo bonito. Não inchar de funcionalidades.

O roteiro está em [docs/fases.md](docs/fases.md).

## Forma de trabalhar

- Uma fase por sessão, seguindo o docs/fases.md. Começar com um plano curto e esperar aprovação
  antes de escrever código.
- Nada fora do escopo da fase. Ideias novas vão para a seção "Depois" do docs/fases.md.
- Testar no navegador, em celular (375px) e desktop (1280px), antes de considerar pronto.
- Ao criar telas novas, usar a skill frontend-design. Ao fim de cada fase com interface, rodar o
  agente design-reviewer. O security-reviewer roda nas fases indicadas no docs/fases.md.
- Commit no fim da fase, mensagem em português no padrão dos commits existentes (curta,
  minúscula, sem acento: "pagina do catalogo", "api do inventario da steam").
- O Claude não aparece como contribuidor: nada de `Co-Authored-By` nem menção ao Claude nos
  commits.
- Contas externas (Supabase, Resend, Turnstile, domínio, hospedagem) o dono cria e coloca as
  chaves no `.env`. Nunca colocar chaves no código. Variável nova vai documentada no `.env.example`.

## Rodar

Node 22.21+ ou 24.11+ (o Nuxt 4.6 avisa em versões anteriores). `npm install` e `npm run dev`,
depois http://localhost:3000. No app do Claude, o servidor sobe pela configuração `dev` do
`.claude/launch.json`.
Hoje existem `/` (página inicial), `/previa` (formulário), `/previa/<id>` (prévia de 24h) e
`/loja/demo` (catálogo de exemplo, sem consultar a Steam). A estrutura de pastas está no README.

## Confiança (regra inegociável)

- O nicho tem muito golpe. Nunca pedir login da Steam, senha, Steam Guard, API key nem nada além
  de dados públicos. Não usar a logo da Steam nem nomes ou domínios parecidos com "Steam".
- Isso é argumento de venda e aparece na interface: "Não pedimos login da Steam. Usamos só o seu
  inventário público."
- Posse do inventário: no último passo do cadastro, o sistema mostra um código (ex.: `VTR-4F7K`)
  com botão de copiar e um link para editar o perfil na Steam. O revendedor cola o código no
  resumo ou no nome do perfil e clica em "Verificar"; o sistema lê o XML público do perfil e
  confirma. Depois ele pode apagar o código. A tela explica que isso prova que o inventário é
  dele sem pedir login. O admin também pode verificar manualmente. A loja só fica pública depois
  de verificada.
- Uma loja por SteamID (único no banco).

## Páginas

| Rota | O que é |
| --- | --- |
| `/` | Página inicial: apresenta o produto ao revendedor (o link que o dono divulga) |
| `/previa` | Formulário (link da Steam + WhatsApp) que gera a prévia |
| `/previa/<id>` | Prévia da loja, expira em 24h |
| `/demo` | Loja de demonstração |
| `/cadastro`, `/entrar`, `/painel`, `/admin` | Conta do revendedor e administração |
| `/<slug>` | Loja do revendedor |

Nomes reservados para slug: todas as rotas acima, mais `api`, `loja`, `ajuda`, `termos`,
`privacidade` e outros parecidos.

## Modelo de negócio

- Pagamento por fora (Pix), sem gateway. O admin registra cada pagamento à mão.
- Fluxo: página inicial → prévia de 24h sem conta → cadastro → 7 dias grátis → Pix → admin
  registra o pagamento.
- Planos: mensal R$ 49 e trimestral R$ 129. Fundadores (os 20 primeiros assinantes) têm 20% de
  desconto enquanto mantiverem a assinatura; se cancelarem e voltarem, pagam o valor cheio.
- Os valores dos planos ficam em configuração, não no código, e cada loja guarda o próprio valor.
- Cada loja tem `pago_ate`. Ao registrar um pagamento, o admin escolhe o período (1 ou 3 meses) e
  informa o valor recebido. O período é somado a partir do vencimento ou de hoje, o que for maior.
  No vencimento a loja é bloqueada automaticamente e mostra "loja indisponível".
- Um teste grátis por SteamID, por e-mail e por WhatsApp.
- Loja suspensa não é apagada: os dados ficam guardados por 60 dias.
- O WhatsApp de contato e a chave Pix do dono ficam em configuração.

## Stack e convenções

- Nuxt 4, JavaScript sem TypeScript, `<script setup>`. Seguir o estilo do código existente: nomes
  e comentários em português, comentários curtos que explicam o porquê.
- Supabase: Postgres com RLS em todas as tabelas; Auth com e-mail e senha, verificação de e-mail
  e recuperação de senha; Storage para logo e banner.
- E-mail transacional por SMTP próprio (ex.: Resend). O SMTP padrão do Supabase é só para teste.
- Cloudflare Turnstile no cadastro e na geração de prévia. Limite de tentativas no login.
- Admin: lista de e-mails em variável de ambiente, checada no servidor em toda página `/admin` e
  rota `/api/admin`.
- Hospedagem: Render (decidido em 18/10/2026), serviço web Node na região virginia, a mesma do
  Supabase (us-east-1). Configuração em `render.yaml`; cada push no main publica sozinho. Plano
  grátis para testar (dorme depois de 15 min sem visita); Starter (US$ 7/mês) a partir do primeiro
  revendedor pagante. O código conta com um servidor único e sempre ligado (limite por IP e cache
  em memória). Vercel Hobby proíbe uso comercial. Domínio próprio (.com.br) comprado antes do
  primeiro revendedor, para os links das lojas não mudarem depois.

## Steam

- O visitante da loja nunca dispara consulta à Steam. O inventário fica salvo no banco e o
  revendedor clica em "Atualizar inventário" (com intervalo mínimo). A prévia usa o cache atual
  de 10 minutos.
- Cada atualização grava o que entrou e o que saiu do inventário (base do relatório de vendas).
- Esconder itens permanentemente não trocáveis: não trocável e sem data de liberação (medalhas,
  moedas, troféus). Item com trava temporária aparece com "Disponível em dd/mm". Não filtrar por
  tipo: pins são da mesma categoria das medalhas e são trocáveis.

## Preços

- Fonte: lista de preços do mercado da Steam da SteamApis (plano grátis, uma consulta por dia),
  salva no banco. Escolhida porque os termos permitem integrar os dados em aplicações; é proibido
  redistribuir os dados brutos ou dar acesso direto a eles. As APIs gratuitas pesquisadas proíbem
  uso comercial ou não têm licença.
- Nunca consultar preço durante uma visita, nem consultar a Steam a partir do servidor (IPs de
  datacenter levam bloqueio).
- O preço exibido como "Steam" é a mediana das vendas recentes no mercado da Steam, convertida para
  BRL pela PTAX do Banco Central quando vier em outra moeda.
- Item sem mediana de vendas na lista (a janela de vendas do plano grátis é curta): estimativa =
  menor anúncio × fator, nunca acima da última venda; sem nenhuma venda registrada, fica sem preço.
  O fator é a mediana de (mediana de vendas ÷ menor anúncio) nos itens que têm os dois, por faixa
  de preço (até R$ 10, R$ 10–100, R$ 100–1.000, acima de R$ 1.000) e separado para facas e luvas.
  Recalculado a cada atualização, guardando o histórico.
- Valor estimado aparece com "≈" na frente; mediana de vendas aparece sem. O texto da estimativa
  descreve o método ("estimado a partir do menor anúncio"), nunca afirma que não houve venda.
- Itens acima do teto de preço do mercado da Steam (cerca de US$ 1.800) não mostram preço Steam.
- Preço do revendedor = preço Steam menos o desconto padrão da loja (30% por padrão), com
  arredondamento configurável. Pode ser trocado por item; opção "sob consulta".
- Exibir o preço Steam riscado, o preço do revendedor e a % de economia. Esconder o riscado quando
  o preço do revendedor for maior ou igual ao preço Steam, ou quando não houver preço Steam (float
  baixo, pattern raro e stickers fazem o preço fugir da referência).
- Campo privado de custo por item (base do relatório de lucro).

## Design

- Manter a identidade atual: fonte Saira, fundo cinza-azulado, cantos pequenos, cor de raridade
  nos cards.
- O tema de cada loja é gerado a partir de uma cor de destaque e de um fundo escuro ou claro. O
  resto da paleta é derivado, com contraste AA garantido automaticamente.
- Celular primeiro (375px). Referências: inventário do CS2, CSFloat, Skinport, Buff. Muita
  informação na tela, foto da skin como protagonista.
- Referências ao CS2: usar as imagens dos próprios itens (skins, facas, luvas, agentes como itens)
  e a linguagem visual do jogo (cores de raridade, escala de desgaste com float, tipografia
  condensada).
- Não usar arte oficial da Valve (renders de personagens, key art, logo do CS2 ou da Steam): é
  risco de direitos e lembra site de golpe.
- Não usar:
  - Inter/Roboto
  - degradê roxo/azul, vidro fosco, brilho neon
  - emoji como ícone, ✨
  - capa centralizada com mancha de cor
  - três cards iguais de "recursos"
  - cantos muito arredondados com sombra borrada
  - depoimentos inventados, contadores falsos, frases de marketing vazias
  - clichês "gamer": silhueta de soldado, fumaça, glitch, fundo de mapa desfocado
- Textos diretos e genéricos ("sua loja", "seu link"), sem assumir onde o link será divulgado.
- Rodapé de todas as páginas: "Não somos afiliados à Valve nem à Steam."
