// Redes da loja. O revendedor digita só o usuário (ou cola o link do perfil) e o link é montado
// aqui: a loja nunca mostra um link livre, que poderia levar a um site de golpe.

export const SOCIALS = [
  {
    id: 'instagram',
    label: 'Instagram',
    prefix: '@',
    hosts: ['instagram.com'],
    pattern: /^[a-z0-9._]{1,30}$/i,
    url: (handle) => `https://www.instagram.com/${handle}/`,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    prefix: '@',
    hosts: ['tiktok.com'],
    pattern: /^[a-z0-9._]{2,24}$/i,
    url: (handle) => `https://www.tiktok.com/@${handle}`,
  },
  {
    id: 'youtube',
    label: 'YouTube',
    prefix: '@',
    hosts: ['youtube.com'],
    pattern: /^[a-z0-9._-]{3,30}$/i,
    url: (handle) => `https://www.youtube.com/@${handle}`,
  },
  {
    id: 'discord',
    label: 'Discord',
    prefix: 'discord.gg/',
    hosts: ['discord.gg', 'discord.com'],
    pattern: /^[a-z0-9-]{2,32}$/i,
    url: (handle) => `https://discord.gg/${handle}`,
  },
]

/**
 * Usuário a partir do que a pessoa digitou: "@loja", "loja" ou o link do perfil.
 * '' quando está vazio; null quando não serve.
 */
export function socialHandle(id, input) {
  const network = SOCIALS.find((s) => s.id === id)
  let value = String(input ?? '').trim()
  if (!network) return null
  if (!value) return ''

  const link = value.match(/^(?:https?:\/\/)?(?:www\.|m\.)?([a-z0-9.-]+\.[a-z]+)\/([^?#]*)/i)
  if (link) {
    if (!network.hosts.includes(link[1].toLowerCase())) return null
    value = link[2].replace(/^invite\//i, '').split('/')[0]
  }
  value = value.replace(/^@/, '')
  return network.pattern.test(value) ? value : null
}

/** Redes gravadas na loja -> [{ id, label, handle, url }], na ordem de SOCIALS. */
export function socialLinks(saved) {
  return SOCIALS.filter((s) => typeof saved?.[s.id] === 'string' && s.pattern.test(saved[s.id])).map((s) => ({
    id: s.id,
    label: s.label,
    handle: `${s.prefix}${saved[s.id]}`,
    url: s.url(saved[s.id]),
  }))
}
