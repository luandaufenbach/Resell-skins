// Logo e banner da loja. O arquivo enviado nunca vai direto para o Storage: o servidor confere o
// formato pelos primeiros bytes, decodifica com o sharp e grava uma WebP nova, sem os dados da foto
// (localização, câmera). SVG fica de fora: é texto e pode carregar script. AVIF também: é
// decodificado inteiro e em 12 bits, e uma imagem de poucos KB ocuparia centenas de MB.
import { createHash } from 'node:crypto'
import sharp from 'sharp'

// O servidor grátis da Render tem 512 MB: uma imagem por vez e sem cache do libvips.
sharp.concurrency(1)
sharp.cache(false)

export const MAX_UPLOAD = 8 * 1024 * 1024

// Logo aparece com até 88 px (264 px em tela 3x). Banner ocupa a largura da loja no computador.
// `pixels` é o teto da imagem enviada: 20 MP em 16 bits por canal já são 160 MB decodificados.
const KINDS = {
  logo: { width: 320, height: 320, minSide: 64, quality: 88, pixels: 16_000_000 },
  banner: { width: 1600, height: 900, minWidth: 600, quality: 80, pixels: 20_000_000 },
}

// Envios em andamento: no máximo um por conta e dois no servidor. Quem passa disso é recusado antes
// de o arquivo ser lido, para a memória não encher com arquivos esperando a vez.
const MAX_RUNNING = 2
const running = new Set()

/** Reserva a vez de enviar (antes de ler o corpo). Devolve a função que libera. */
export function claimUpload(key) {
  if (running.has(key) || running.size >= MAX_RUNNING) {
    throw createError({ statusCode: 429, statusMessage: 'Envio em andamento', data: { code: 'UPLOAD_BUSY' } })
  }
  running.add(key)
  return () => running.delete(key)
}

export function isImageKind(kind) {
  return Object.hasOwn(KINDS, kind)
}

/** Corpo da requisição (o arquivo puro), parando de ler ao passar de 8 MB. */
export async function readUpload(event) {
  const declared = Number(getRequestHeader(event, 'content-length'))
  if (declared > MAX_UPLOAD) throw tooLarge()

  const chunks = []
  let size = 0
  for await (const chunk of event.node.req) {
    size += chunk.length
    if (size > MAX_UPLOAD) throw tooLarge()
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

/** WebP pronta para gravar: { data, width, height, name } (name leva o hash do conteúdo). */
export async function processImage(kind, input) {
  const format = sniff(input)
  if (!format) throw invalid('NOT_IMAGE')
  const spec = KINDS[kind]

  return oneAtATime(async () => {
    let meta
    let output
    try {
      const image = sharp(input, { limitInputPixels: spec.pixels, failOn: 'error', animated: false })
      meta = await image.metadata()
      if (meta.format !== format) throw new Error(`formato ${meta.format} não bate com ${format}`)
      // Foto de celular girada: a largura de verdade é a altura gravada.
      const [width, height] = (meta.orientation ?? 1) >= 5 ? [meta.height, meta.width] : [meta.width, meta.height]
      if (spec.minWidth && width < spec.minWidth) return { small: true }
      if (spec.minSide && Math.min(width, height) < spec.minSide) return { small: true }

      output = await image
        .rotate()
        .resize({ width: spec.width, height: spec.height, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: spec.quality, alphaQuality: 100, effort: 4 })
        .toBuffer({ resolveWithObject: true })
    } catch (error) {
      console.error('[imagens] arquivo recusado:', error.message)
      throw invalid('NOT_IMAGE')
    }

    const hash = createHash('sha256').update(output.data).digest('hex').slice(0, 16)
    return { data: output.data, width: output.info.width, height: output.info.height, name: `${kind}-${hash}.webp` }
  }).then((result) => {
    if (result.small) throw invalid(kind === 'banner' ? 'BANNER_SMALL' : 'LOGO_SMALL')
    return result
  })
}

/** Grava a WebP no bucket público `marcas`. */
export async function uploadImage(path, data) {
  await supabase(`/storage/v1/object/marcas/${path}`, {
    method: 'POST',
    body: data,
    headers: { 'content-type': 'image/webp', 'cache-control': 'max-age=31536000' },
    timeout: 20000,
    retry: 0,
  })
}

/** Apaga imagens que a loja deixou de usar. Falha só vai para o log: a loja segue funcionando. */
export async function removeImages(paths) {
  const list = paths.filter(Boolean)
  if (!list.length) return
  await supabase('/storage/v1/object/marcas', { method: 'DELETE', body: { prefixes: list } }).catch((error) =>
    console.error('[imagens] não apagou:', error.message),
  )
}

/** Endereço público da imagem (o bucket é público; o nome muda a cada envio). */
export function imageUrl(path) {
  if (!path) return null
  return `${useRuntimeConfig().supabaseUrl}/storage/v1/object/public/marcas/${path}`
}

// Formato pelos primeiros bytes, antes de o sharp tocar no arquivo: só JPEG, PNG, WebP e GIF.
function sniff(buffer) {
  if (buffer.length < 16) return null
  const ascii = (start, end) => buffer.toString('latin1', start, end)
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg'
  if (ascii(0, 8) === '\x89PNG\r\n\x1a\n') return 'png'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp'
  if (/^GIF8[79]a$/.test(ascii(0, 6))) return 'gif'
  return null
}

function tooLarge() {
  return createError({ statusCode: 413, statusMessage: 'Arquivo grande demais', data: { code: 'IMAGE_TOO_LARGE' } })
}

let queue = Promise.resolve()
function oneAtATime(task) {
  const run = queue.then(task, task)
  queue = run.catch(() => {})
  return run
}
