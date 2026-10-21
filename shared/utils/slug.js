// Endereço da loja (dominio.com/<slug>). Usado no cadastro, no servidor e para saber se uma página
// é de loja. O banco repete o formato e a trava de Steam/Valve (tabela lojas).

// Rotas do site e nomes que alguém poderia usar para se passar pelo site.
export const RESERVED_SLUGS = new Set([
  'admin', 'ajuda', 'api', 'app', 'assets', 'assinatura', 'blog', 'cadastro', 'cadastrar', 'cdn',
  'checkout', 'conta', 'confirmar', 'contato', 'dashboard', 'demo', 'email', 'entrar', 'esqueci-senha',
  'exemplo', 'faq', 'favicon', 'help', 'inventario', 'lgpd', 'login', 'logout', 'loja', 'lojas',
  'nova-senha', 'nuxt', 'og', 'pagamento', 'pagamentos', 'painel', 'perfil', 'pix', 'planos', 'preco',
  'precos', 'previa', 'previas', 'privacidade', 'public', 'registro', 'robots', 'sair', 'senha',
  'signup', 'sitemap', 'sobre', 'static', 'status', 'suporte', 'termos', 'usuario', 'vitrine', 'www',
])

const FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** null se o endereço serve; senão o código do problema (SLUG_INVALID ou SLUG_RESERVED). */
export function slugProblem(slug) {
  const value = String(slug ?? '')
  if (value.length < 3 || value.length > 30 || !FORMAT.test(value)) return 'SLUG_INVALID'
  if (RESERVED_SLUGS.has(value) || /steam|valve/.test(lookalike(value))) return 'SLUG_RESERVED'
  return null
}

/**
 * Texto que lembra Steam ou Valve ("Steam Skins", "St3am", "Ｓｔｅａｍ", "S.t.e.a.m"), com a mesma
 * troca de letras do endereço. Letras de outros alfabetos parecidas com as latinas ("Ѕteam") ficam
 * de fora antes, na lista de caracteres aceitos (server/utils/panel.js).
 */
export function looksLikeSteam(text) {
  const base = String(text ?? '')
    .normalize('NFKC')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
  // Letras soltas separadas por espaço ou pontuação viram uma palavra só ("s t e a m"). "CS Team"
  // continua separado: só junta quando dos dois lados há uma letra sozinha.
  const joined = base.replace(/(?<=(?:^|[^a-z0-9|@])[a-z0-9|@])[^a-z0-9|@]+(?=[a-z0-9|@](?:[^a-z0-9|@]|$))/g, '')
  return [base, joined].some((value) => /steam|valve/.test(lookalike(value.replace(/[^a-z0-9|@]+/g, '-'))))
}

// Troca o que costuma imitar letras ("st3am", "stearn", "va1ve") antes de procurar Steam e Valve:
// endereço parecido com o da Steam lembra golpe. O hífen fica: sem ele, "cs-team" viraria "csteam".
function lookalike(value) {
  return value
    .replace(/rn/g, 'm')
    .replace(/vv/g, 'w')
    .replace(/3/g, 'e')
    .replace(/[4@]/g, 'a')
    .replace(/5/g, 's')
    .replace(/0/g, 'o')
    .replace(/[1i|]/g, 'l')
    .replace(/7/g, 't')
}

/** Sugestão de endereço a partir de um nome ("Skins do Zé!" -> "skins-do-ze"). Vazio se não der. */
export function slugify(name) {
  const slug = String(name ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/steam|valve/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/, '')
  return slugProblem(slug) ? '' : slug
}
