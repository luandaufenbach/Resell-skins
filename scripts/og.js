// Gera public/og.png (imagem de compartilhamento da página inicial) a partir de scripts/og.html,
// com um print do Chrome ou do Edge em modo sem janela. Uso: npm run og
// Rodar de novo só quando o og.html mudar; o png gerado vai para o repositório.
import { execFileSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const BROWSERS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)

const browser = BROWSERS.find((path) => existsSync(path))
if (!browser) {
  console.error('Chrome ou Edge não encontrado. Informe o caminho em CHROME_PATH.')
  process.exit(1)
}

const page = new URL('og.html', import.meta.url).href
const out = fileURLToPath(new URL('../public/og.png', import.meta.url))

execFileSync(browser, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1200,630',
  // A fonte vem de node_modules: o Chrome só a carrega numa página file:// com esta opção.
  '--allow-file-access-from-files',
  // Tempo para as fotos das skins (CDN da Steam) e a fonte carregarem antes do print.
  '--virtual-time-budget=10000',
  `--screenshot=${out}`,
  page,
], { stdio: 'pipe' })

console.log(`public/og.png gerado (${Math.round(statSync(out).size / 1024)} KB).`)
