import { _electron as electron, expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { openDatabase } from '../../src/main/database/database'
import {
  playlistImportItems,
  playlistImports,
} from '../../src/main/database/schema'

test('opens public playlist import and handles its form with the keyboard', async ({
  browserName,
}, testInfo) => {
  expect(browserName).toBeTruthy()
  const env = { ...process.env, ORBE_DOWNLOAD_DIRECTORY: testInfo.outputPath('downloads') }
  delete env.ELECTRON_RUN_AS_NODE
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${testInfo.outputPath('userdata')}`],
    env,
  })
  try {
    const window = await app.firstWindow()
    await window.emulateMedia({ reducedMotion: 'reduce' })
    await window.getByRole('button', { name: 'Começar' }).click()
    await window.getByRole('button', { name: 'Continuar' }).click()
    await window.getByRole('button', { name: 'Pular' }).click()
    await window.getByRole('button', { name: 'Spotify', exact: true }).click()
    await expect(
      window.getByRole('heading', { name: 'Qual playlist você quer trazer?' }),
    ).toBeVisible()
    const review = join(process.cwd(), '.impeccable', 'review')
    mkdirSync(review, { recursive: true })
    await window.screenshot({ path: join(review, 'spotify-flow-empty.png') })

    const link = window.getByRole('textbox', {
      name: 'Link da playlist do Spotify',
    })
    await link.focus()
    await window.keyboard.type(
      'https://example.com/playlist/2xvk0b8XlgBDK2P75cDB2K',
    )
    await window.keyboard.press('Enter')
    await expect(window.getByRole('alert')).toContainText(
      'link público de playlist do Spotify',
    )
  } finally {
    await app.close()
  }
})

test('guides review before downloading in both themes and compact windows', async ({
  browserName,
}, testInfo) => {
  expect(browserName).toBeTruthy()
  const userData = testInfo.outputPath('userdata-populated')
  const connection = openDatabase(
    join(userData, 'orbe.sqlite'),
    join(process.cwd(), 'drizzle'),
  )
  const importId = randomUUID()
  const now = Date.now()
  const candidate = {
    id: 'abcdefghijk',
    url: 'https://www.youtube.com/watch?v=abcdefghijk',
    title: 'Falling In Reverse - ZOMBIFIED (Official Music Video)',
    channel: 'Falling In Reverse',
    durationMs: 220000,
    score: 0.98,
  }
  connection.db.transaction((tx) => {
    tx.insert(playlistImports)
      .values({
        id: importId,
        name: 'Rock',
        sourceUrl: 'https://open.spotify.com/playlist/2xvk0b8XlgBDK2P75cDB2K',
        expectedCount: 340,
        createdAt: now,
        updatedAt: now,
      })
      .run()
    for (let position = 0; position < 340; position++) {
      tx.insert(playlistImportItems)
        .values({
          id: randomUUID(),
          importId,
          position,
          spotifyId: String(position).padStart(22, '0'),
          title: position === 0 ? 'ZOMBIFIED' : `Música ${position + 1}`,
          artist: position === 0 ? 'Falling In Reverse' : 'Artista',
          matchStatus:
            position === 0 ? 'matched' : position === 1 ? 'review' : 'skipped',
          youtubeUrl: position === 0 ? candidate.url : null,
          candidatesJson: position < 2 ? JSON.stringify([candidate]) : '[]',
        })
        .run()
    }
  })
  connection.sqlite.close()

  const env = { ...process.env, ORBE_DOWNLOAD_DIRECTORY: testInfo.outputPath('downloads') }
  delete env.ELECTRON_RUN_AS_NODE
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${userData}`],
    env,
  })
  try {
    const window = await app.firstWindow()
    await window.emulateMedia({ reducedMotion: 'reduce' })
    await window.getByRole('button', { name: 'Começar' }).click()
    await window.getByRole('button', { name: 'Continuar' }).click()
    await window.getByRole('button', { name: 'Pular' }).click()
    await window.getByRole('button', { name: 'Spotify', exact: true }).click()
    await expect(
      window.getByText('340 de 340 músicas identificadas no Spotify'),
    ).toBeVisible()
    await expect(
      window.getByText('Versão do YouTube selecionada'),
    ).toBeVisible()
    await expect(
      window.getByRole('button', { name: 'Trocar vídeo' }),
    ).toBeVisible()
    const review = join(process.cwd(), '.impeccable', 'review')
    mkdirSync(review, { recursive: true })
    await window.screenshot({
      path: join(review, 'spotify-flow-tracks-dark.png'),
    })
    await window.getByRole('button', { name: 'Conferir 1 música' }).click()
    await expect(
      window.getByRole('button', { name: 'Usar este vídeo' }),
    ).toBeVisible()
    const reviewRow = window
      .locator('.playlist-transfer-track')
      .filter({ hasText: 'Música 2' })
    expect(
      await reviewRow.evaluate((el) => el.scrollHeight <= el.clientHeight),
    ).toBe(true)
    await window.screenshot({
      path: join(review, 'spotify-flow-review-dark.png'),
    })

    await window.setViewportSize({ width: 980, height: 760 })
    await window.screenshot({ path: join(review, 'spotify-flow-compact.png') })
    await expect(window.locator('.playlist-transfer')).toHaveJSProperty(
      'scrollWidth',
      await window
        .locator('.playlist-transfer')
        .evaluate((el) => el.clientWidth),
    )
    await window.setViewportSize({ width: 1440, height: 900 })

    await window
      .getByRole('button', { name: 'Configurações', exact: true })
      .click()
    await window.getByLabel('Tema', { exact: true }).selectOption('light')
    await window
      .getByRole('button', { name: 'Salvar alterações', exact: true })
      .click()
    await window.getByRole('button', { name: 'Spotify', exact: true }).click()
    await expect(
      window.getByText('Versão do YouTube selecionada'),
    ).toBeVisible()
    await window.screenshot({
      path: join(review, 'spotify-flow-tracks-light.png'),
    })
    await window.getByRole('button', { name: 'Conferir 1 música' }).click()
    await expect(
      window.getByRole('button', { name: 'Usar este vídeo' }),
    ).toBeVisible()
    await window.screenshot({
      path: join(review, 'spotify-flow-review-light.png'),
    })
    await window
      .getByRole('button', { name: 'Usar este vídeo', exact: true })
      .focus()
    await window.keyboard.press('Enter')
    await expect(
      window.getByRole('button', { name: 'Baixar 2 músicas' }),
    ).toBeEnabled()
    await expect(window.getByText('Tudo pronto para baixar')).toBeVisible()
    await window.screenshot({ path: join(review, 'spotify-flow-ready.png') })
  } finally {
    await app.close()
  }
})
