import { _electron as electron } from 'playwright'
import { readdir, mkdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'

const folder = resolve('test-results/orbe-preview-media')
const output = resolve('test-results/orbe-brand-preview')
await mkdir(output, { recursive: true })
const files = (await readdir(folder)).filter(file => file.endsWith('.mp3')).map(file => join(folder, file))
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
const app = await electron.launch({ args: ['.', `--user-data-dir=${join(output, `profile-${Date.now()}`)}`], env })
try {
  const page = await app.firstWindow()
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.getByRole('button', { name: 'Pular introdução' }).click()
  await app.evaluate(({ dialog }, filePaths) => {
    Object.defineProperty(dialog, 'showOpenDialog', { configurable: true, value: async () => ({ canceled: false, filePaths }) })
  }, files)
  await page.getByRole('button', { name: 'Adicionar arquivos', exact: true }).first().click()
  await page.locator('.library-item').nth(4).waitFor()
  const library = await page.evaluate(() => window.orbe.listLibrary())
  await page.evaluate(async items => {
    const playlist = await window.orbe.createLocalPlaylist({ name: 'No meu ritmo', description: 'Uma pausa no dia. Uma coleção para ficar.' })
    for (const item of items) await window.orbe.addLocalPlaylistItem(playlist.id, item.id)
  }, library)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => [...document.querySelectorAll('.library-item img')].length === 5 && [...document.querySelectorAll('.library-item img')].every(img => img.complete && img.naturalWidth > 0))
  await page.screenshot({ path: join(output, 'library-preview.png') })
  const firstTitle = library.find(item => item.title.startsWith('Entre'))?.title ?? library[0].title
  await page.getByRole('button', { name: `Reproduzir ${firstTitle}`, exact: true }).click()
  await page.getByRole('button', { name: 'Início', exact: true }).click()
  await page.locator('.album-card img').nth(4).waitFor()
  await page.waitForFunction(() => document.querySelector('audio')?.duration > 170)
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.listening-home').parentElement).opacity === '1')
  await page.screenshot({ path: join(output, 'app-preview.png') })
  await page.getByRole('button', { name: 'Expandir player', exact: true }).click()
  await page.locator('.expanded-player').waitFor()
  await page.locator('.expanded-player h1').filter({ hasText: firstTitle }).waitFor()
  await page.getByRole('slider', { name: 'Posição no player expandido' }).fill('18')
  await page.getByRole('button', { name: 'Pausar', exact: true }).click()
  await page.waitForTimeout(600)
  await page.screenshot({ path: join(output, 'player-preview.png') })
  const collapse = page.getByRole('button', { name: /Recolher player|Minimizar player/ }).first()
  if (await collapse.count()) await collapse.click()
  else await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Suas playlists', exact: true }).click()
  await page.getByRole('heading', { name: 'No meu ritmo', exact: true }).waitFor()
  await page.screenshot({ path: join(output, 'playlists-preview.png') })
  if (errors.length) throw new Error(errors.join('\n'))
  console.log('Captured four real Orbe screens with original demo media.')
} finally { await app.close() }
