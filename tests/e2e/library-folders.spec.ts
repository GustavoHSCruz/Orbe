import { _electron as electron, expect, test } from '@playwright/test'
import { mkdirSync, copyFileSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { openDatabase } from '../../src/main/database/database'
import { downloads, mediaLibrary } from '../../src/main/database/schema'
import { SettingsService } from '../../src/main/application/settings-service'
import { LibraryService } from '../../src/main/application/library-service'
import { LocalPlaylistService } from '../../src/main/application/local-playlist-service'
import { mediaToolPath } from '../../src/main/infrastructure/media-tools'

const ffmpeg = mediaToolPath('ffmpeg', {
  platform: process.platform,
  packaged: false,
  appPath: process.cwd(),
  resourcesPath: '',
})

test('keeps old downloads, imports several folders, explains deleted files and relinks moved items', async ({
  browserName,
}, info) => {
  expect(browserName).toBeTruthy()
  const initial = info.outputPath('Old downloads')
  const next = info.outputPath('New downloads')
  const extra = info.outputPath('Other collection')
  const moved = info.outputPath('Moved collection')
  for (const folder of [initial, next, extra, moved])
    mkdirSync(folder, { recursive: true })
  const audio = join(initial, 'Continuar.mp3')
  await promisify(execFile)(ffmpeg, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=200:duration=30',
    '-c:a',
    'libmp3lame',
    '-q:a',
    '8',
    '-y',
    audio,
  ])
  copyFileSync(audio, join(extra, 'Perto.mp3'))
  copyFileSync(audio, join(moved, 'Entre orbitas.mp3'))
  const userData = info.outputPath('userdata')
  const connection = openDatabase(
    join(userData, 'orbe.sqlite'),
    resolve('drizzle'),
  )
  const settings = new SettingsService(connection.db, initial)
  settings.save(settings.get())
  settings.finishOnboarding()
  const source = randomUUID()
  const missingId = randomUUID()
  connection.db
    .insert(downloads)
    .values({
      id: source,
      provider: 'generic',
      sourceUrl: 'https://example.com/demo.mp3',
      title: 'Entre órbitas',
      mediaType: 'audio',
      formatId: 'audio',
      format: 'mp3',
      status: 'completed',
      progress: 100,
      createdAt: 1,
      filePath: join(initial, 'Entre orbitas.mp3'),
    })
    .run()
  connection.db
    .insert(mediaLibrary)
    .values({
      id: missingId,
      downloadId: source,
      provider: 'generic',
      mediaType: 'audio',
      title: 'Entre órbitas',
      filePath: join(initial, 'Entre orbitas.mp3'),
      format: 'mp3',
      favorite: true,
      playCount: 7,
      createdAt: 1,
    })
    .run()
  connection.db
    .insert(mediaLibrary)
    .values({
      id: randomUUID(),
      provider: 'local',
      mediaType: 'video',
      title: 'Memórias da viagem',
      filePath: join(initial, 'Filmes', 'Memorias.mp4'),
      format: 'mp4',
      createdAt: 2,
    })
    .run()
  const playlists = new LocalPlaylistService(
    connection.db,
    new LibraryService(connection.db),
  )
  const playlist = playlists.create('No meu ritmo', '')
  playlists.add(playlist.id, missingId)
  connection.sqlite.close()
  const env = { ...process.env, ORBE_DOWNLOAD_DIRECTORY: initial }
  delete env.ELECTRON_RUN_AS_NODE
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${userData}`],
    env,
  })
  try {
    const page = await app.firstWindow()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page
      .getByRole('heading', { name: 'Ouvir agora', exact: true })
      .waitFor()
    await page.evaluate(() => window.orbe.scanLibraryLocations())
    const spotify = page
      .locator('.music-sidebar')
      .getByRole('button', { name: 'Spotify', exact: true })
      .locator('svg')
    await expect(spotify).toHaveCSS('stroke-width', '0px')
    await page
      .getByRole('button', { name: 'Configurações', exact: true })
      .click()
    await page
      .getByRole('heading', {
        name: '2 arquivos precisam de atenção',
        exact: true,
      })
      .waitFor()
    await expect(
      page.getByRole('button', { name: 'Baixar novamente', exact: true }),
    ).toHaveCount(1)
    await expect(
      page.getByRole('heading', { name: 'Memórias da viagem', exact: true }),
    ).toBeVisible()
    const evidence = resolve('.impeccable/review/folders')
    mkdirSync(evidence, { recursive: true })
    await page.screenshot({ path: join(evidence, 'recovery-dark.png') })
    await page
      .locator('.missing-files')
      .screenshot({ path: join(evidence, 'missing-files.png') })
    await app.evaluate(({ dialog }, path) => {
      Object.defineProperty(dialog, 'showOpenDialog', {
        configurable: true,
        value: async () => ({ canceled: false, filePaths: [path] }),
      })
    }, next)
    await page.getByRole('button', { name: 'Escolher', exact: true }).click()
    await expect(
      page.getByRole('button', { name: 'Salvar alterações', exact: true }),
    ).toBeDisabled()
    await page
      .locator('.download-directory-choice')
      .screenshot({ path: join(evidence, 'directory-choice.png') })
    await page
      .getByRole('radio', { name: /Continuar buscando na pasta anterior/ })
      .check()
    await page
      .getByRole('button', { name: 'Salvar alterações', exact: true })
      .click()
    await expect
      .poll(() => page.evaluate(() => window.orbe.getSettings()))
      .toMatchObject({ downloadDirectory: next, libraryDirectories: [initial] })
    await app.evaluate(({ dialog }, path) => {
      Object.defineProperty(dialog, 'showOpenDialog', {
        configurable: true,
        value: async () => ({ canceled: false, filePaths: [path] }),
      })
    }, extra)
    await page
      .getByRole('button', { name: 'Adicionar pasta', exact: true })
      .click()
    await expect
      .poll(() => page.evaluate(() => window.orbe.getSettings()))
      .toMatchObject({ libraryDirectories: [initial, extra] })
    expect(
      (await page.evaluate(() => window.orbe.listLibrary())).some(
        (item) => item.title === 'Perto',
      ),
    ).toBe(true)
    await app.evaluate(({ dialog }, path) => {
      Object.defineProperty(dialog, 'showOpenDialog', {
        configurable: true,
        value: async () => ({ canceled: false, filePaths: [path] }),
      })
    }, moved)
    await page
      .locator('.folder-list > li')
      .filter({ hasText: initial })
      .getByRole('button', { name: 'Localizar pasta', exact: true })
      .click()
    await expect
      .poll(() => page.evaluate(() => window.orbe.listLibrary()))
      .toContainEqual(
        expect.objectContaining({
          id: missingId,
          filePath: join(moved, 'Entre orbitas.mp3'),
          favorite: true,
          playCount: 7,
        }),
      )
    expect(
      (await page.evaluate(() => window.orbe.listLocalPlaylists()))[0]?.items[0]
        ?.id,
    ).toBe(missingId)
    const current = await page.evaluate(() => window.orbe.getSettings())
    await page.evaluate(
      (value) => window.orbe.saveSettings({ ...value, theme: 'light' }),
      current,
    )
    // Reload gets the saved theme without injecting UI state.
    await page.reload()
    await page
      .getByRole('button', { name: 'Configurações', exact: true })
      .click()
    await page
      .getByRole('heading', { name: 'Pastas de mídia', exact: true })
      .waitFor()
    await page.screenshot({ path: join(evidence, 'folders-light.png') })
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]!.setSize(1024, 760),
    )
    await page.screenshot({ path: join(evidence, 'folders-compact.png') })
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('shows a static video cover when collapsed while keeping the sound and playback position', async ({
  browserName,
}, info) => {
  expect(browserName).toBeTruthy()
  const directory = info.outputPath('downloads')
  mkdirSync(directory, { recursive: true })
  const video = join(directory, 'Viagem.mp4')
  await promisify(execFile)(ffmpeg, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    'testsrc2=size=320x180:rate=12:duration=45',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=200:duration=45',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-shortest',
    '-y',
    video,
  ])
  const env = { ...process.env, ORBE_DOWNLOAD_DIRECTORY: directory }
  delete env.ELECTRON_RUN_AS_NODE
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${info.outputPath('userdata')}`],
    env,
  })
  try {
    const page = await app.firstWindow()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page
      .getByRole('button', { name: 'Pular introdução', exact: true })
      .click()
    await page.evaluate(() => window.orbe.scanLibraryLocations())
    await page.getByRole('button', { name: 'Biblioteca', exact: true }).click()
    await page
      .getByRole('button', { name: 'Reproduzir Viagem', exact: true })
      .click()
    const element = page.locator('video')
    await expect(element).toBeVisible()
    await expect
      .poll(() => element.evaluate((video) => video.currentTime))
      .toBeGreaterThan(0.2)
    await page
      .getByRole('button', { name: 'Recolher player', exact: true })
      .click()
    await expect(
      page.getByRole('dialog', { name: 'Player expandido', exact: true }),
    ).toHaveCount(0)
    await expect(element).toBeHidden()
    await expect(
      page.locator('.mini-player [data-video-target="mini"] img'),
    ).toBeVisible()
    const before = await element.evaluate((video) => video.currentTime)
    await expect
      .poll(() => element.evaluate((video) => video.currentTime))
      .toBeGreaterThan(before + 0.2)
    expect(await element.evaluate((video) => video.paused)).toBe(false)
    mkdirSync(resolve('.impeccable/review/folders'), { recursive: true })
    await page.screenshot({
      path: resolve('.impeccable/review/folders/video-cover.png'),
    })
    await page
      .getByRole('button', { name: 'Expandir tocando agora', exact: true })
      .click()
    await expect(element).toBeVisible()
    expect(
      await element.evaluate((video) => video.currentTime),
    ).toBeGreaterThan(before)
  } finally {
    await app.close()
  }
})
