import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { chromium } from '@playwright/test'

const root = fileURLToPath(new URL('../', import.meta.url))
const target = resolve(root, 'apps/web/public/orbe-social-v1.png')
const dataUrl = async (path, mime) =>
  `data:${mime};base64,${(await readFile(resolve(root, path))).toString('base64')}`

let html = await readFile(resolve(root, 'packages/brand/social-preview.html'), 'utf8')
html = html
  .replace('__BRAND_TOKENS__', await readFile(resolve(root, 'packages/brand/tokens.css'), 'utf8'))
  .replace('__FONT_URL__', await dataUrl('node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2', 'font/woff2'))
  .replaceAll('__MARK_URL__', await dataUrl('packages/brand/mark.svg', 'image/svg+xml'))

await mkdir(dirname(target), { recursive: true })
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' })
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: target, type: 'png' })
} finally {
  await browser.close()
}

await writeFile(`${target}.json`, `${JSON.stringify({
  prompt: 'Origin: Original Orbe brand composition rendered from packages/brand/social-preview.html with scripts/generate-social-preview.mjs at 1200x630. Reuses the project orbital SVG, shared graphite/coral tokens and self-hosted Plus Jakarta Sans. Typography and exact brand geometry are rendered by Chromium; no AI-generated artwork or reconstructed application UI.',
}, null, 2)}\n`)
console.log('Generated apps/web/public/orbe-social-v1.png (1200x630) and origin sidecar.')
