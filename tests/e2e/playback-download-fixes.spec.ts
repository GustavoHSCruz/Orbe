import { _electron as electron, expect, test } from '@playwright/test'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { copyFile } from 'node:fs/promises'
import type { DownloadRecord } from '../../src/shared/contracts/media'

test('advances real audio, selects lyrics and displays download progress through completion', async ({
  browserName,
}, testInfo) => {
  expect(browserName).toBeTruthy()
  const first = testInfo.outputPath('First.mp3')
  const second = testInfo.outputPath('Second.mp3')
  await promisify(execFile)(join(process.cwd(), 'resources/bin/ffmpeg.exe'), [
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=220:duration=50',
    '-c:a',
    'libmp3lame',
    '-q:a',
    '7',
    '-y',
    first,
  ])
  await copyFile(first, second)
  const env = { ...process.env, ORBE_DOWNLOAD_DIRECTORY: testInfo.outputPath('downloads') }
  delete env.ELECTRON_RUN_AS_NODE
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${testInfo.outputPath('userdata')}`],
    env,
  })
  try {
    const window = await app.firstWindow()
    await app.evaluate(() => {
      const original = globalThis.fetch
      globalThis.fetch = async (input, init) =>
        String(input).startsWith('https://lrclib.net/')
          ? new Response(
              JSON.stringify([
                {
                  trackName: 'Test song',
                  artistName: 'Test artist',
                  duration: 50,
                  syncedLyrics:
                    '[00:00.00]A test verse\n[00:20.00]Another verse',
                  plainLyrics: null,
                },
              ]),
              { status: 200 },
            )
          : original(input, init)
    })
    await window.getByRole('button', { name: 'Começar', exact: true }).click()
    await window.getByRole('button', { name: 'Continuar', exact: true }).click()
    await window.getByRole('button', { name: 'Pular', exact: true }).click()
    await app.evaluate(
      ({ dialog }, files) => {
        Object.defineProperty(dialog, 'showOpenDialog', {
          configurable: true,
          value: async () => ({ canceled: false, filePaths: files }),
        })
      },
      [first, second],
    )
    await window
      .getByRole('button', { name: 'Biblioteca', exact: true })
      .click()
    await window.getByRole('button', { name: 'Adicionar arquivos' }).click()
    await window
      .getByRole('button', { name: 'Reproduzir First', exact: true })
      .click()
    const bar = window.locator('.mini-player')
    await expect
      .poll(() =>
        window
          .locator('audio')
          .evaluateAll((elements) =>
            elements.some(
              (element) =>
                !(element as HTMLAudioElement).paused &&
                (element as HTMLAudioElement).currentTime > 0.1,
            ),
          ),
      )
      .toBe(true)
    await bar.getByRole('button', { name: 'Próxima', exact: true }).click()
    await expect(
      bar.getByRole('button', { name: 'Expandir tocando agora' }),
    ).toContainText('Second')
    await expect
      .poll(() =>
        window
          .locator('audio')
          .evaluateAll((elements) =>
            elements.some(
              (element) =>
                !(element as HTMLAudioElement).paused &&
                (element as HTMLAudioElement).currentTime > 0.1,
            ),
          ),
      )
      .toBe(true)
    await bar.getByRole('button', { name: 'Próxima', exact: true }).click()
    await expect(
      bar.getByRole('button', { name: 'Expandir tocando agora' }),
    ).toContainText('First')
    await bar.getByRole('button', { name: 'Pausar', exact: true }).click()
    await bar
      .getByRole('button', { name: 'Expandir player', exact: true })
      .click()
    const player = window.getByRole('dialog', { name: 'Player expandido' })
    await player
      .getByRole('button', { name: 'Buscar letra', exact: true })
      .click()
    await player
      .getByLabel('Nome da música para buscar letra')
      .fill('Test song')
    await player.getByLabel('Artista para buscar letra').fill('')
    await player.getByRole('button', { name: 'Pesquisar', exact: true }).click()
    await expect(
      player.getByRole('button', { name: /Test song.*Test artist/ }),
    ).toBeVisible()
    await window.screenshot({ path: testInfo.outputPath('lyrics-search.png') })
    await player.getByRole('button', { name: /Test song.*Test artist/ }).click()
    await expect(
      player.getByRole('button', { name: 'A test verse', exact: true }),
    ).toBeVisible()
    await player
      .getByRole('button', { name: 'Recolher player', exact: true })
      .click()
    await bar
      .getByRole('button', { name: 'Expandir player', exact: true })
      .click()
    await expect(
      player.getByRole('button', { name: 'A test verse', exact: true }),
    ).toBeVisible()
    await player
      .getByRole('button', { name: 'Recolher player', exact: true })
      .click()

    const download: DownloadRecord = {
      id: 'bcdbeddf-667f-4e92-9bd5-7b92817da875',
      provider: 'youtube',
      sourceUrl: 'https://youtube.com/watch?v=example',
      title: 'Sua próxima música',
      artist: null,
      channel: null,
      thumbnail: null,
      durationMs: 50000,
      mediaType: 'audio',
      format: 'mp3',
      quality: '192 kbps',
      fileSize: 10000000,
      filePath: null,
      status: 'downloading',
      progress: 32,
      downloadedBytes: 3200000,
      speedBytesPerSecond: 900000,
      etaSeconds: 8,
      createdAt: Date.now(),
      completedAt: null,
      errorMessage: null,
    }
    const update = (item: DownloadRecord) =>
      app.evaluate(({ ipcMain }, value) => {
        ipcMain.removeHandler('download:list')
        ipcMain.handle('download:list', () => [value])
      }, item)
    await update(download)
    await window
      .getByRole('button', { name: /Abrir downloads: 1 em andamento/ })
      .click()
    await expect(window.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '32',
    )
    await update({ ...download, progress: 71, downloadedBytes: 7100000 })
    await expect(window.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '71',
    )
    await window.screenshot({
      path: testInfo.outputPath('download-active.png'),
    })
    await update({ ...download, progress: 100, status: 'processing' })
    await expect(window.getByRole('progressbar')).not.toHaveAttribute(
      'aria-valuenow',
    )
    await update({
      ...download,
      progress: 100,
      status: 'completed',
      completedAt: Date.now(),
    })
    await expect(window.getByText('Já está na sua coleção')).toBeVisible()
    await expect(window.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100',
    )
    await window.screenshot({
      path: testInfo.outputPath('download-completed.png'),
    })
  } finally {
    await app.close()
  }
})
