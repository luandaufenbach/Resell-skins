// Mensagens das telas de conta e do painel para os códigos de erro da API. `field` diz qual campo
// marcar no formulário. Erros da Steam (link, inventário privado) usam as mensagens da loja.

const MESSAGES = {
  INVALID_EMAIL: { field: 'email', title: 'Confira o e-mail', body: 'Use um endereço completo, como nome@gmail.com.' },
  WEAK_PASSWORD: { field: 'senha', title: 'Senha curta demais', body: 'Use pelo menos 8 caracteres.' },
  INVALID_PHONE: {
    field: 'whatsapp',
    title: 'Confira o WhatsApp',
    body: 'Use o DDD e o número, como (48) 99999-9999.',
  },
  SLUG_INVALID: {
    field: 'slug',
    title: 'Confira o endereço',
    body: 'Use de 3 a 30 letras minúsculas, números ou hífen, sem acento e sem espaço.',
  },
  SLUG_RESERVED: {
    field: 'slug',
    title: 'Esse endereço não está disponível',
    body: 'Ele é usado pelo site ou lembra o nome da Steam ou da Valve. Escolha outro.',
  },
  SLUG_TAKEN: { field: 'slug', title: 'Esse endereço já tem dono', body: 'Escolha outro endereço para a sua loja.' },
  STEAM_TAKEN: {
    field: 'steam',
    title: 'Este inventário já tem uma loja',
    body: 'Cada inventário da Steam abre uma loja só. Se a loja é sua e você não a criou, fale com a gente.',
  },
  CAPTCHA: {
    title: 'A verificação de segurança falhou',
    body: 'Espere a caixa de verificação ficar marcada e envie de novo.',
  },
  LOGIN_FAILED: { title: 'E-mail ou senha não conferem', body: 'Confira os dois. Se esqueceu a senha, crie uma nova.' },
  EMAIL_NOT_CONFIRMED: {
    title: 'Falta confirmar o e-mail',
    body: 'Abra o link que mandamos no cadastro. Se não achar, peça outro abaixo.',
  },
  LINK_EXPIRED: {
    title: 'Este link venceu ou já foi usado',
    body: 'Os links do e-mail valem uma vez só e por pouco tempo. Peça outro.',
  },
  LIMIT: { title: 'Muitas tentativas seguidas', body: 'Espere alguns minutos e tente de novo.' },
  EMAIL_FAILED: {
    field: 'email',
    title: 'Não conseguimos mandar o e-mail',
    body: 'Confira se o endereço está certo. Se estiver, tente de novo em alguns minutos.',
  },
  UNAVAILABLE: { title: 'Não deu para concluir agora', body: 'Tente de novo em alguns minutos.' },
  CODE_NOT_FOUND: {
    title: 'O código ainda não aparece no seu perfil',
    body: 'Confira se salvou o perfil na Steam com o código no resumo ou no nome. A Steam pode levar um minuto para mostrar a mudança.',
  },
  CODE_EXPIRED: { title: 'O código venceu', body: 'Gere um código novo e cole no perfil.' },
  TOO_SOON: {
    title: 'O inventário foi lido há pouco',
    body: 'Dá para atualizar de novo 10 minutos depois da última leitura.',
  },
}

/** "5548999999999" -> "(48) 99999-9999". Número de fora do Brasil fica como veio. */
export function formatPhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  const local = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : null
  if (!local) return digits
  const [ddd, number] = [local.slice(0, 2), local.slice(2)]
  return `(${ddd}) ${number.slice(0, -4)}-${number.slice(-4)}`
}

/** Endereço enquanto é digitado: minúsculas, sem acento, espaço vira hífen. */
export function cleanSlug(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 30)
}

/** "26/10 às 14:30", no horário de Brasília. */
export function formatDateTime(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
    .format(new Date(value))
    .replace(', ', ' às ')
}

/** "26/10", no horário de Brasília. */
export function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }).format(
    new Date(value),
  )
}

const STEAM_FIELD = ['INVALID_INPUT', 'NOT_FOUND', 'PRIVATE']
const STEAM_CODES = [...STEAM_FIELD, 'RATE_LIMIT', 'STEAM_DOWN']

/** { title, body, field } para mostrar no formulário. */
export function accountMessage(error) {
  const code = errorCode(error)
  if (MESSAGES[code]) return MESSAGES[code]
  if (STEAM_CODES.includes(code)) return { ...errorMessage(error), field: STEAM_FIELD.includes(code) ? 'steam' : null }
  return MESSAGES.UNAVAILABLE
}
