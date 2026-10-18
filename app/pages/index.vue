<script setup>
// Página inicial: apresenta o produto ao revendedor que recebeu o link. Só fala do que já
// existe. Preços e WhatsApp do dono vêm da tabela de configuração.
const { data: demo } = await useFetch('/api/demo')
const { data: config } = await usePublicConfig()

const owner = computed(() => config.value?.ownerWhatsapp || null)
const createLink = computed(() => (owner.value ? createStoreLink(owner.value) : null))
const askLink = computed(() =>
  owner.value
    ? `https://wa.me/${owner.value}?text=${encodeURIComponent('Olá! Tenho uma dúvida sobre a Vitrine.')}`
    : null,
)

// ---- Preço
const plans = computed(() => config.value?.plans ?? {})
const founders = computed(() => config.value?.founders ?? {})
const hasPlans = computed(() => plans.value.monthly && plans.value.quarterly)

// "R$ 49" quando é inteiro, "R$ 39,20" quando tem centavos.
function money(value) {
  const rounded = Math.round(value * 100) / 100
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
  }).format(rounded)
}
const founderPrice = (value) => money(value * (1 - founders.value.discount))

// ---- O que a loja mostra: duas skins da demo, uma com stickers e outra com trava de troca.
const SPECIMENS = ['StatTrak™ AK-47 | Redline (Field-Tested)', '★ Flip Knife | Tiger Tooth (Factory New)']
const specimens = computed(() =>
  SPECIMENS.map((name) => demo.value?.items.find((i) => i.marketName === name)).filter(Boolean),
)
const specimenOpen = ref(null)

// ---- Compartilhamento: é a primeira coisa que o revendedor vê ao receber o link.
const origin = useSiteUrl()
const shareTitle = 'Vitrine: sua loja de skins de CS2 a partir do inventário'
const shareText =
  'Cole o link do seu perfil da Steam e veja na hora as suas skins numa loja com foto, float, stickers e preço. Sem login da Steam.'

useSeoMeta({
  title: shareTitle,
  description: shareText,
  ogTitle: shareTitle,
  ogDescription: shareText,
  ogType: 'website',
  ogSiteName: 'Vitrine',
  ogLocale: 'pt_BR',
  ogUrl: `${origin}/`,
  ogImage: `${origin}/og.png`,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageType: 'image/png',
  ogImageAlt: 'Quatro skins de CS2 da loja de exemplo e o texto: Seu inventário vira uma loja de skins',
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <div class="home">
    <header class="wrap top">
      <NuxtLink to="/" class="wordmark display">Vitrine</NuxtLink>
      <a v-if="createLink" class="btn" :href="createLink" target="_blank" rel="noopener">
        <AppIcon name="chat" />
        Criar minha loja
      </a>
    </header>

    <main>
      <!-- Abertura: a loja de exemplo funcionando, ao lado do que é o produto -->
      <section class="wrap hero">
        <div class="hero-copy">
          <h1 class="display hero-title">Seu inventário vira uma loja de skins</h1>
          <p class="lead">
            Cole o link do seu perfil da Steam e veja as suas skins numa loja com foto, float, stickers e o
            preço da Steam riscado ao lado do preço da loja. Quem abrir o link chama você no WhatsApp.
          </p>
          <div class="hero-actions">
            <NuxtLink to="/previa" class="btn btn--primary btn--large">Ver como fica minha loja</NuxtLink>
          </div>
          <p class="hero-note">A prévia é grátis, não precisa de conta e vale 24 horas.</p>
        </div>

        <HomeDemo v-if="demo" class="hero-demo" :store="demo" />
      </section>

      <!-- Como funciona: é uma sequência de verdade, por isso os números -->
      <section class="wrap block" aria-labelledby="como-funciona">
        <h2 id="como-funciona" class="display block-title">Como funciona</h2>
        <ol class="steps">
          <li>
            <span class="step-n" aria-hidden="true">1</span>
            <h3>Cole o link da Steam</h3>
            <p>O link do seu perfil ou o seu link de troca. O inventário precisa estar público.</p>
          </li>
          <li>
            <span class="step-n" aria-hidden="true">2</span>
            <h3>Veja a loja na hora</h3>
            <p>A prévia mostra as suas skins como o cliente vai ver, com preço e filtros.</p>
          </li>
          <li>
            <span class="step-n" aria-hidden="true">3</span>
            <h3>Use 7 dias grátis</h3>
            <p>Crie a sua loja e use por uma semana sem pagar nada.</p>
          </li>
          <li>
            <span class="step-n" aria-hidden="true">4</span>
            <h3>Pague por Pix</h3>
            <p>Depois do teste, mensal ou trimestral. Sem cartão e sem fidelidade.</p>
          </li>
        </ol>
      </section>

      <!-- O que a loja mostra: pedaços reais da interface, explicados ao lado -->
      <section class="wrap block anatomy" aria-labelledby="o-que-mostra">
        <h2 id="o-que-mostra" class="display block-title">O que a loja mostra</h2>

        <ul v-if="specimens.length" class="specimens">
          <li v-for="item in specimens" :key="item.id">
            <SkinCard :item="item" @open="specimenOpen = $event" />
          </li>
        </ul>
        <SkinDetail :item="specimenOpen" demo :copy-link="false" @close="specimenOpen = null" />

        <dl class="features">
          <div>
            <dt>Foto e raridade</dt>
            <dd>A foto de cada skin sobre a cor da raridade, como no inventário do jogo.</dd>
          </div>
          <div>
            <dt>Float e desgaste</dt>
            <dd>O float exato na escala de desgaste, de Nova de Fábrica a Veterana de Guerra.</dd>
          </div>
          <div>
            <dt>Stickers e chaveiros</dt>
            <dd>O que está aplicado na arma, com o nome de cada um na ficha da skin.</dd>
          </div>
          <div>
            <dt>Preço</dt>
            <dd>
              O preço da Steam riscado, o preço da loja e a economia. Quando o valor da Steam é estimado a
              partir do menor anúncio, ele aparece com ≈.
            </dd>
          </div>
          <div>
            <dt>Trava de troca</dt>
            <dd>Skin que ainda não pode ser trocada mostra a data em que fica disponível.</dd>
          </div>
          <div>
            <dt>Filtros e busca</dt>
            <dd>Por categoria, arma, desgaste e StatTrak. A busca acha o nome em português e em inglês.</dd>
          </div>
          <div>
            <dt>Pedido pelo WhatsApp</dt>
            <dd>Cada skin tem um botão que abre o seu WhatsApp com o nome e o float do item.</dd>
          </div>
          <div>
            <dt>Cor da loja</dt>
            <dd>Cada loja tem uma cor de destaque, em fundo escuro ou claro. Teste na loja de exemplo, no topo.</dd>
          </div>
        </dl>
      </section>

      <!-- Segurança: o nicho tem muito golpe, então isto vem grande -->
      <section class="trust-band" aria-labelledby="seguranca">
        <div class="wrap trust-inner">
          <h2 id="seguranca" class="display trust-title">
            Não pedimos login da Steam. Usamos só o seu inventário público.
          </h2>
          <div class="trust-text">
            <p>
              A loja é montada com o mesmo inventário que qualquer pessoa vê no seu perfil. Ninguém da
              Vitrine vai pedir a sua senha, o código do Steam Guard ou uma chave de API. Se alguém pedir em
              nosso nome, é golpe.
            </p>
            <p>
              Não temos acesso às suas trocas e não mexemos em nenhum item. A venda continua entre você e o
              seu cliente.
            </p>
          </div>
        </div>
      </section>

      <!-- Preço -->
      <section class="wrap block pricing" aria-labelledby="preco">
        <h2 id="preco" class="display block-title">Preço</h2>
        <div class="pricing-body">
          <p class="pricing-lead">7 dias grátis para testar. Depois, pagamento por Pix, sem fidelidade.</p>

          <dl v-if="hasPlans" class="plans">
            <div class="plan">
              <dt>Mensal</dt>
              <dd>
                <span class="plan-price">{{ money(plans.monthly) }}</span>
                <span class="plan-per">por mês</span>
              </dd>
            </div>
            <div class="plan">
              <dt>Trimestral</dt>
              <dd>
                <span class="plan-price">{{ money(plans.quarterly) }}</span>
                <span class="plan-per">a cada 3 meses, {{ money(plans.quarterly / 3) }} por mês</span>
              </dd>
            </div>
          </dl>
          <p v-else class="pricing-lead">Peça os valores pelo WhatsApp.</p>

          <p v-if="hasPlans && founders.seats && founders.discount" class="founders">
            <strong>Os {{ founders.seats }} primeiros assinantes viram fundadores</strong> e pagam
            {{ founderPrice(plans.monthly) }} por mês, ou {{ founderPrice(plans.quarterly) }} no trimestral,
            enquanto mantiverem a assinatura.
          </p>

          <div class="pricing-actions">
            <a v-if="createLink" class="btn btn--primary btn--large" :href="createLink" target="_blank" rel="noopener">
              <AppIcon name="chat" />
              Criar minha loja
            </a>
            <NuxtLink to="/previa" class="btn btn--large">Ver como fica minha loja</NuxtLink>
          </div>
        </div>
      </section>

      <!-- Perguntas frequentes -->
      <section class="wrap block" aria-labelledby="perguntas">
        <h2 id="perguntas" class="display block-title">Perguntas frequentes</h2>
        <div class="faq">
          <details>
            <summary>Preciso entrar com a minha conta da Steam?</summary>
            <p>
              Não. A Vitrine nunca pede login, senha, código do Steam Guard nem chave de API. A loja é montada
              só com o seu inventário público.
            </p>
          </details>
          <details>
            <summary>Meu inventário precisa ser público?</summary>
            <p>
              Precisa. Na Steam, abra Editar perfil, depois Configurações de privacidade, e deixe Inventário
              como Público. Sem isso não dá para ler as suas skins.
            </p>
          </details>
          <details>
            <summary>De onde vem o preço da Steam?</summary>
            <p>
              Da mediana das vendas recentes no mercado da Steam, convertida para reais pela cotação do Banco
              Central e atualizada todo dia. Quando a lista não traz essa mediana, o valor é estimado a partir
              do menor anúncio e aparece com ≈.
            </p>
          </details>
          <details>
            <summary>Como eu pago?</summary>
            <p>
              Por Pix. Depois dos 7 dias grátis, você escolhe o plano
              <template v-if="hasPlans">
                (mensal de {{ money(plans.monthly) }} ou trimestral de {{ money(plans.quarterly) }})
              </template>
              e paga por Pix. Não tem cartão nem boleto.
            </p>
          </details>
          <details>
            <summary>Posso cancelar?</summary>
            <p>
              Pode, quando quiser. Não tem fidelidade nem multa: é só não renovar. Quem tem preço de fundador e
              cancela paga o valor cheio se voltar depois.
            </p>
          </details>
          <details>
            <summary>O que acontece se eu parar de pagar?</summary>
            <p>
              No vencimento a loja sai do ar e o link mostra que ela está indisponível. Os seus dados ficam
              guardados por 60 dias: se você voltar nesse prazo, não precisa montar nada de novo.
            </p>
          </details>
        </div>
      </section>

      <!-- Contato -->
      <section class="wrap block contact" aria-labelledby="duvidas">
        <h2 id="duvidas" class="display block-title">Ficou alguma dúvida?</h2>
        <div class="contact-body">
          <p class="pricing-lead">Fale com a gente pelo WhatsApp.</p>
          <div class="pricing-actions">
            <a v-if="askLink" class="btn btn--primary" :href="askLink" target="_blank" rel="noopener">
              <AppIcon name="chat" />
              Chamar no WhatsApp
            </a>
            <NuxtLink to="/loja/demo" class="btn">Abrir a loja de exemplo</NuxtLink>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 1rem;
}

/* ---- Abertura */
.hero {
  display: grid;
  gap: 2.5rem;
  padding-top: 2rem;
  padding-bottom: 3.5rem;
}

.hero-copy {
  display: grid;
  gap: 1.25rem;
  align-content: start;
  max-width: 34rem;
}

.hero-title {
  font-size: clamp(2.75rem, 11vw, 5.5rem);
}

.lead {
  color: var(--muted);
  font-size: var(--step-1);
  line-height: 1.45;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.hero-note {
  color: var(--muted);
  font-size: var(--step--1);
}

@media (min-width: 64rem) {
  .hero {
    grid-template-columns: minmax(0, 26rem) minmax(0, 1fr);
    gap: 3.5rem;
    padding-top: 3.5rem;
    padding-bottom: 5rem;
  }

  .hero-copy {
    padding-top: 3.25rem;
  }
}

/* ---- Blocos: título à esquerda, conteúdo à direita no computador */
.block {
  display: grid;
  gap: 1.5rem;
  padding-top: 2.5rem;
  padding-bottom: 3.5rem;
  border-top: 1px solid var(--line);
}

.block-title {
  font-size: clamp(2.25rem, 8vw, 3.5rem);
}

@media (min-width: 64rem) {
  .block {
    grid-template-columns: minmax(0, 22rem) minmax(0, 1fr);
    gap: 3.5rem;
    padding-top: 3.5rem;
    padding-bottom: 5rem;
  }
}

/* ---- Como funciona */
.steps {
  display: grid;
  gap: 1.5rem;
  padding: 0;
  list-style: none;
}

.steps li {
  display: grid;
  grid-template-columns: 2.5rem 1fr;
  column-gap: 0.75rem;
  align-items: baseline;
}

.step-n {
  grid-row: span 2;
  font-size: var(--step-3);
  font-stretch: var(--narrow);
  font-weight: 760;
  line-height: 1;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.steps h3 {
  font-size: var(--step-1);
  font-stretch: var(--semi);
  font-weight: 640;
}

.steps p {
  color: var(--muted);
}

@media (min-width: 48rem) {
  .steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 2rem;
  }
}

@media (min-width: 80rem) {
  .steps {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .steps li {
    grid-template-columns: 1fr;
    row-gap: 0.5rem;
  }

  .step-n {
    grid-row: auto;
    font-size: clamp(2.5rem, 4vw, 3.5rem);
  }
}

/* ---- O que a loja mostra */
.anatomy {
  grid-template-areas: 'title' 'specimens' 'features';
}

.anatomy .block-title {
  grid-area: title;
}

.specimens {
  grid-area: specimens;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  align-self: start;
}

.features {
  grid-area: features;
  display: grid;
  margin: 0;
}

.features > div {
  display: grid;
  gap: 0.25rem;
  padding-block: 0.875rem;
  border-bottom: 1px solid var(--line);
}

.features > div:first-child {
  padding-top: 0;
}

.features dt {
  font-stretch: var(--semi);
  font-weight: 640;
}

.features dd {
  margin: 0;
  color: var(--muted);
}

@media (min-width: 48rem) {
  .features > div {
    grid-template-columns: 12rem 1fr;
    gap: 1.5rem;
  }
}

@media (min-width: 64rem) {
  .anatomy {
    grid-template-columns: minmax(0, 22rem) minmax(0, 1fr);
    grid-template-areas:
      'title features'
      'specimens features';
    row-gap: 2rem;
  }

  .specimens {
    gap: 0.75rem;
  }

  .features > div {
    grid-template-columns: 11rem 1fr;
  }
}

/* ---- Segurança */
.trust-band {
  border-block: 1px solid var(--line);
  background: var(--stage);
}

.trust-inner {
  display: grid;
  gap: 1.5rem;
  padding-top: 3rem;
  padding-bottom: 3.5rem;
}

.trust-title {
  max-width: 22ch;
  font-size: clamp(2.25rem, 8.5vw, 4.5rem);
}

.trust-text {
  display: grid;
  gap: 0.875rem;
  max-width: 40rem;
  color: var(--muted);
  font-size: var(--step-1);
  line-height: 1.45;
}

@media (min-width: 64rem) {
  .trust-inner {
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
    align-items: end;
    gap: 3.5rem;
    padding-top: 5rem;
    padding-bottom: 5rem;
  }
}

/* ---- Preço */
.pricing {
  border-top: 0;
}

.pricing-body,
.contact-body {
  display: grid;
  gap: 1.25rem;
  max-width: 40rem;
}

.pricing-lead {
  font-size: var(--step-1);
}

.plans {
  display: grid;
  margin: 0;
  border-top: 1px solid var(--line);
}

.plan {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 1rem;
  padding-block: 1rem;
  border-bottom: 1px solid var(--line);
}

.plan dt {
  font-size: var(--step-1);
  font-stretch: var(--semi);
  font-weight: 640;
}

/* Preço em cima e o período embaixo, alinhados à direita como numa lista de preços. */
.plan dd {
  display: grid;
  justify-items: end;
  gap: 0.25rem;
  margin: 0;
  text-align: right;
}

.plan-price {
  font-size: var(--step-3);
  font-stretch: var(--narrow);
  font-weight: 760;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.plan-per {
  color: var(--muted);
  font-size: var(--step--1);
}

.founders {
  color: var(--muted);
}

.founders strong {
  color: var(--text);
  font-weight: 640;
}

.pricing-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/* ---- Perguntas frequentes */
.faq {
  display: grid;
  max-width: 48rem;
  border-top: 1px solid var(--line);
}

.faq details {
  border-bottom: 1px solid var(--line);
}

.faq summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 52px;
  padding-block: 0.75rem;
  font-size: var(--step-1);
  font-stretch: var(--semi);
  font-weight: 620;
  cursor: pointer;
  list-style: none;
}

.faq summary::-webkit-details-marker {
  display: none;
}

/* Sinal de + que vira − ao abrir. */
.faq summary::after {
  content: '+';
  flex: none;
  width: 1.5rem;
  color: var(--muted);
  font-size: var(--step-2);
  font-weight: 400;
  line-height: 1;
  text-align: center;
}

.faq details[open] summary::after {
  content: '−';
}

.faq details p {
  max-width: 40rem;
  padding-bottom: 1.25rem;
  color: var(--muted);
}
</style>
