import { _electron as electron, expect, test } from '@playwright/test'
import { join } from 'node:path'
import { existsSync, readdirSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

test('persists settings and theme across application restart', async ({
  browserName,
}, testInfo) => {
  expect(browserName).toBeTruthy()
  const electronEnv = { ...process.env }
  delete electronEnv.ELECTRON_RUN_AS_NODE
  const args = [
    '.',
    `--user-data-dir=${testInfo.outputPath('settings-userdata')}`,
  ]
  const app = await electron.launch({ args, env: electronEnv })
  try {
    const window = await app.firstWindow()
    await window.getByRole('button', { name: 'Começar' }).click()
    await window.getByRole('button', { name: 'Continuar' }).click()
    await window.getByRole('button', { name: 'Pular' }).click()
    await expect(
      window.getByRole('heading', { name: 'Ouvir agora', exact: true }),
    ).toBeVisible()
    await window.getByRole('button', { name: 'Configurações' }).click()
    await expect(
      window.getByRole('heading', { name: 'Configurações' }),
    ).toBeVisible()
    await window.getByLabel('Downloads simultâneos').selectOption('3')
    await window.getByLabel('Tema').selectOption('light')
    await window.getByLabel('Abrir como').selectOption('audio')
    await window.getByLabel('Formato de vídeo').selectOption('webm')
    await window.getByLabel('Formato de áudio').selectOption('m4a')
    await window.getByRole('button', { name: 'Salvar' }).click()
    await expect(window.getByRole('status')).toHaveText('Configurações salvas.')
    await expect(window.locator('[data-theme="light"]')).toBeVisible()
    await window.getByRole('button', { name: 'Integrações' }).click()
    await window.getByLabel('Usar sessão do navegador').selectOption('edge')
    await window.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(window.getByText('Integrações salvas.')).toBeVisible()
  } finally {
    await app.close()
  }
  const reopened = await electron.launch({ args, env: electronEnv })
  try {
    const window = await reopened.firstWindow()
    await expect(
      window.getByRole('heading', { name: 'Ouvir agora', exact: true }),
    ).toBeVisible()
    await expect(window.locator('[data-theme="light"]')).toBeVisible()
    await window.getByRole('button', { name: 'Configurações' }).click()
    await expect(window.getByLabel('Downloads simultâneos')).toHaveValue('3')
    await expect(window.getByLabel('Abrir como')).toHaveValue('audio')
    await expect(window.getByLabel('Formato de vídeo')).toHaveValue('webm')
    await expect(window.getByLabel('Formato de áudio')).toHaveValue('m4a')
    await window.getByRole('button', { name: 'Integrações' }).click()
    await expect(window.getByLabel('Usar sessão do navegador')).toHaveValue(
      'edge',
    )
  } finally {
    await reopened.close()
  }
})

test('opens quick download from converter and extracts local video audio', async ({
  browserName,
}, testInfo) => {
  expect(browserName).toBeTruthy()
  const video = testInfo.outputPath('source.mp4')
  await execFileAsync(join(process.cwd(), 'resources/bin/ffmpeg.exe'), [
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    'color=c=blue:s=160x90:r=10:d=2',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:duration=2',
    '-shortest',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-y',
    video,
  ])
  const electronEnv = {
    ...process.env,
    ORBE_DOWNLOAD_DIRECTORY: testInfo.outputPath('downloads'),
  }
  delete electronEnv.ELECTRON_RUN_AS_NODE
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${testInfo.outputPath('userdata')}`],
    env: electronEnv,
  })
  try {
    const window = await app.firstWindow()
    await window.getByRole('button', { name: 'Começar' }).click()
    await window.getByRole('button', { name: 'Continuar' }).click()
    await window.getByRole('button', { name: 'Pular' }).click()
    await window.getByRole('button', { name: 'Converter mídia' }).click()
    await expect(
      window.getByRole('heading', { name: 'Converter mídia' }),
    ).toBeVisible()
    await window
      .locator('header')
      .getByRole('button', { name: /Novo download/ })
      .click()
    await expect(
      window.getByRole('dialog', { name: 'Novo download' }),
    ).toBeVisible()
    await window.getByRole('textbox', { name: 'Link para baixar' }).fill('https://commons.wikimedia.org/wiki/File:Left_and_right_test.ogg')
    await window.getByRole('button', { name: 'Continuar' }).click()
    await expect(window.getByRole('dialog', { name: 'Preparar download' })).toBeVisible({ timeout: 30000 })
    await window.getByRole('button', { name: 'Fechar preparação do download' }).click()
    await app.evaluate(({ dialog }, filePath) => {
      Object.defineProperty(dialog, 'showOpenDialog', {
        configurable: true,
        value: async () => ({ canceled: false, filePaths: [filePath] }),
      })
    }, video)
    await window.getByRole('button', { name: 'Selecionar arquivo' }).click()
    await expect(window.getByText('source.mp4')).toBeVisible()
    await window
      .getByRole('button', { name: /Extrair áudio/ })
      .first()
      .click()
    await window
      .getByRole('button', { name: 'Extrair áudio', exact: true })
      .click()
    await expect(window.getByText('Conversão concluída')).toBeVisible({
      timeout: 30000,
    })
    expect(
      readdirSync(testInfo.outputPath('downloads')).some((name) =>
        name.endsWith('.mp3'),
      ),
    ).toBe(true)
    await window.screenshot({ path: testInfo.outputPath('converter.png') })
  } finally {
    await app.close()
  }
})

test('analyzes and downloads public-domain audio into history and library', async ({
  browserName,
}, testInfo) => {
  expect(browserName).toBeTruthy()
  const electronEnv = {
    ...process.env,
    ORBE_DOWNLOAD_DIRECTORY: testInfo.outputPath('downloads'),
  }
  delete electronEnv.ELECTRON_RUN_AS_NODE
  const args = ['.', `--user-data-dir=${testInfo.outputPath('userdata')}`]
  const app = await electron.launch({
    args,
    env: electronEnv,
  })
  try {
    const window = await app.firstWindow()
    await window.getByRole('button', { name: 'Começar' }).click()
    await window.getByRole('button', { name: 'Continuar' }).click()
    await window.getByRole('button', { name: 'Pular' }).click()
    await window
      .getByRole('textbox', { name: 'Link de mídia' })
      .fill('https://commons.wikimedia.org/wiki/File:Left_and_right_test.ogg')
    await window.getByRole('button', { name: 'Analisar' }).click()
    await expect(
      window.getByRole('heading', { name: 'Left and right test' }),
    ).toBeVisible({ timeout: 30000 })
    await expect(
      window.getByRole('dialog', { name: 'Preparar download' }),
    ).toBeVisible()
    await window.screenshot({ path: testInfo.outputPath('download-modal.png') })
    await window
      .getByRole('button', { name: 'Ouvir prévia de 30 segundos' })
      .click()
    await expect
      .poll(
        async () =>
          window
            .locator('[role="dialog"] audio')
            .evaluate((audio: HTMLAudioElement) => audio.currentSrc),
        { timeout: 30000 },
      )
      .toContain('orbe-media://preview/')
    await expect
      .poll(
        async () =>
          window
            .locator('[role="dialog"] audio')
            .evaluate((audio: HTMLAudioElement) => audio.currentTime),
        { timeout: 10000 },
      )
      .toBeGreaterThan(0)
    await window.getByRole('button', { name: 'Próximo: formato' }).click()
    await window.getByRole('button', { name: 'Áudio' }).click()
    await window.getByRole('button', { name: 'Revisar download' }).click()
    await window.getByRole('button', { name: 'Iniciar download' }).click()
    await expect(window.getByText('Concluído', { exact: false })).toBeVisible({
      timeout: 60000,
    })
    await window.getByRole('button', { name: 'Histórico', exact: true }).click()
    await window.screenshot({
      path: testInfo.outputPath('sidebar-and-history.png'),
    })
    await expect(window.getByText('Left and right test').first()).toBeVisible()
    await window
      .getByRole('button', { name: 'Biblioteca', exact: true })
      .click()
    await expect(window.getByText('Left and right test').first()).toBeVisible()
    await window
      .getByRole('button', { name: 'Reproduzir Left and right test' })
      .click()
    await expect(window.getByRole('button', { name: 'Pausar' })).toBeVisible()
    expect(existsSync(join(testInfo.outputPath('downloads')))).toBe(true)
  } finally {
    await app.close()
  }
  const reopened = await electron.launch({ args, env: electronEnv })
  try {
    const window = await reopened.firstWindow()
    await window.getByRole('button', { name: 'Histórico', exact: true }).click()
    await expect(window.getByText('Left and right test').first()).toBeVisible()
    await window
      .getByRole('button', { name: 'Biblioteca', exact: true })
      .click()
    await expect(window.getByText('Left and right test').first()).toBeVisible()
  } finally {
    await reopened.close()
  }
})

test('starts the packaged Windows application', async ({
  browserName,
}, testInfo) => {
  expect(browserName).toBeTruthy()
  const executablePath = join(
    process.cwd(),
    'dist',
    'win-unpacked',
    'Orbe.exe',
  )
  test.skip(
    !existsSync(executablePath),
    'Execute npm run dist:win para validar o aplicativo empacotado.',
  )
  const electronEnv = { ...process.env }
  delete electronEnv.ELECTRON_RUN_AS_NODE
  const app = await electron.launch({
    executablePath,
    args: [`--user-data-dir=${testInfo.outputPath('packaged-userdata')}`],
    env: electronEnv,
  })
  try {
    const window = await app.firstWindow()
    await expect(
      window.getByRole('heading', { name: 'Bem-vindo ao Orbe' }),
    ).toBeVisible()
    await window.getByRole('button', { name: 'Começar' }).click()
    await window.getByRole('button', { name: 'Continuar' }).click()
    await window.getByRole('button', { name: 'Pular' }).click()
    await expect(
      window.getByRole('heading', { name: 'Ouvir agora', exact: true }),
    ).toBeVisible()
    const font = await window.evaluate(async () => {
      await document.fonts.ready
      return {
        family: getComputedStyle(document.documentElement).fontFamily,
        loaded: document.fonts.check('16px "Plus Jakarta Sans Variable"'),
      }
    })
    expect(font.family).toContain('Plus Jakarta Sans Variable')
    expect(font.loaded).toBe(true)
    await window
      .getByRole('textbox', { name: 'Link de mídia' })
      .fill('https://www.youtube.com/watch?v=AxFhwtwiw6o&list=RDAxFhwtwiw6o')
    await window.getByRole('button', { name: 'Analisar' }).click()
    await window.getByRole('button', { name: 'Só este vídeo' }).click()
    await expect
      .poll(
        async () =>
          (await window
            .getByRole('dialog', { name: 'Preparar download' })
            .count()) + (await window.getByRole('alert').count()),
        { timeout: 55000 },
      )
      .toBeGreaterThan(0)
  } finally {
    await app.close()
  }
})

test('converts authorized source audio to MP3 with FFmpeg', async ({
  browserName,
}, testInfo) => {
  expect(browserName).toBeTruthy()
  const directory = testInfo.outputPath('mp3-downloads')
  const electronEnv = { ...process.env, ORBE_DOWNLOAD_DIRECTORY: directory }
  delete electronEnv.ELECTRON_RUN_AS_NODE
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${testInfo.outputPath('mp3-userdata')}`],
    env: electronEnv,
  })
  try {
    const window = await app.firstWindow()
    await window.getByRole('button', { name: 'Começar' }).click()
    await window.getByRole('button', { name: 'Continuar' }).click()
    await window.getByRole('button', { name: 'Pular' }).click()
    await window.getByRole('button', { name: 'Configurações' }).click()
    await window.getByLabel('Nome dos arquivos').selectOption('title-quality')
    await window.getByLabel('Limite de velocidade').fill('1024')
    await window.getByRole('button', { name: 'Salvar' }).click()
    await expect(window.getByRole('status')).toHaveText('Configurações salvas.')
    await window.getByRole('button', { name: 'Início' }).click()
    await window
      .getByRole('textbox', { name: 'Link de mídia' })
      .fill(
        'https://upload.wikimedia.org/wikipedia/commons/e/e3/Left_and_right_test.ogg',
      )
    await window.getByRole('button', { name: 'Analisar' }).click()
    await expect(
      window.getByRole('heading', { name: 'Left_and_right_test' }),
    ).toBeVisible({ timeout: 30000 })
    await window.getByRole('button', { name: 'Próximo: formato' }).click()
    await window.getByRole('button', { name: 'Áudio' }).click()
    await window
      .getByRole('button', { name: 'Mostrar opções avançadas' })
      .click()
    const mp3 = window.locator('#media-format option[value^="convert-mp3:"]')
    const value = await mp3.getAttribute('value')
    expect(value).toBeTruthy()
    await window.locator('#media-format').selectOption(value!)
    await window.getByRole('button', { name: 'Revisar download' }).click()
    await window.getByRole('button', { name: 'Iniciar download' }).click()
    await expect(window.getByText('Concluído', { exact: false })).toBeVisible({
      timeout: 60000,
    })
    expect(
      readdirSync(directory).some(
        (file) => file.includes('Convertido') && file.endsWith('.mp3'),
      ),
    ).toBe(true)
  } finally {
    await app.close()
  }
})

test('rejects a Spotify URL as a download source', async ({
  browserName,
}, testInfo) => {
  expect(browserName).toBeTruthy()
  const electronEnv = { ...process.env }
  delete electronEnv.ELECTRON_RUN_AS_NODE
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${testInfo.outputPath('invalid-userdata')}`],
    env: electronEnv,
  })
  try {
    const window = await app.firstWindow()
    await window.getByRole('button', { name: 'Começar' }).click()
    await window.getByRole('button', { name: 'Continuar' }).click()
    await window.getByRole('button', { name: 'Pular' }).click()
    await window
      .getByRole('textbox', { name: 'Link de mídia' })
      .fill('https://open.spotify.com/track/example')
    await window.getByRole('button', { name: 'Analisar' }).click()
    await expect(window.getByRole('alert')).toHaveText(
      'Esta origem não é suportada.',
    )
  } finally {
    await app.close()
  }
})

test('finishes analyzing a YouTube watch link containing a radio playlist', async ({
  browserName,
}, testInfo) => {
  expect(browserName).toBeTruthy()
  const electronEnv = { ...process.env }
  delete electronEnv.ELECTRON_RUN_AS_NODE
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${testInfo.outputPath('youtube-userdata')}`],
    env: electronEnv,
  })
  try {
    const window = await app.firstWindow()
    await window.getByRole('button', { name: 'Começar' }).click()
    await window.getByRole('button', { name: 'Continuar' }).click()
    await window.getByRole('button', { name: 'Pular' }).click()
    await window
      .getByRole('textbox', { name: 'Link de mídia' })
      .fill('https://www.youtube.com/watch?v=AxFhwtwiw6o&list=RDAxFhwtwiw6o')
    await window.getByRole('button', { name: 'Analisar' }).click()
    await window.getByRole('button', { name: 'Só este vídeo' }).click()
    await expect
      .poll(
        async () =>
          (await window
            .getByRole('dialog', { name: 'Preparar download' })
            .count()) + (await window.getByRole('alert').count()),
        { timeout: 55000 },
      )
      .toBeGreaterThan(0)
    const hasResult = await window
      .getByRole('dialog', { name: 'Preparar download' })
      .count()
    const hasError = await window.getByRole('alert').count()
    if (hasError) {
      console.info(
        `YouTube analysis result: ${await window.getByRole('alert').first().textContent()}`,
      )
    }
    if (
      hasError &&
      /verificação da sua sessão/i.test(
        (await window.getByRole('alert').first().textContent()) ?? '',
      )
    )
      await expect(
        window.getByRole('button', { name: 'Configurar sessão do YouTube' }),
      ).toBeVisible()
    expect(hasResult + hasError).toBeGreaterThan(0)
  } finally {
    await app.close()
  }
})

test('analyzes Instagram, Facebook and X and downloads a NASA video', async ({
  browserName,
}, testInfo) => {
  test.setTimeout(180000)
  expect(browserName).toBeTruthy()
  const directory = testInfo.outputPath('social-downloads')
  const electronEnv = { ...process.env, ORBE_DOWNLOAD_DIRECTORY: directory }
  delete electronEnv.ELECTRON_RUN_AS_NODE
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${testInfo.outputPath('social-userdata')}`],
    env: electronEnv,
  })
  try {
    const window = await app.firstWindow()
    await window.getByRole('button', { name: 'Começar' }).click()
    await window.getByRole('button', { name: 'Continuar' }).click()
    await window.getByRole('button', { name: 'Pular' }).click()
    for (const [url, source] of [
      ['https://www.instagram.com/reel/Chunk8-jurw/', 'Instagram'],
      [
        'https://www.facebook.com/NASAJSC/videos/where-night-light-and-life-collide-captured-from-the-international-space-station/486253094477098/',
        'Facebook',
      ],
      ['https://x.com/NASAArtemis/status/2040619776100147411', 'X / Twitter'],
    ] as const) {
      await window.getByRole('textbox', { name: 'Link de mídia' }).fill(url)
      await expect(window.getByText(/Link reconhecido/)).toBeVisible()
      await window.getByRole('button', { name: 'Analisar' }).click()
      await expect(window.getByText(source, { exact: true })).toBeVisible({
        timeout: 60000,
      })
      await window.getByRole('button', { name: 'Próximo: formato' }).click()
      expect(await window.locator('.format-choice').count()).toBeGreaterThan(0)
      await expect(
        window.locator('[role="dialog"] img[alt^="Capa de "]').first(),
      ).toHaveAttribute('src', /^https:\/\//)
      if (source === 'Facebook') {
        await window.getByRole('button', { name: 'Revisar download' }).click()
        await window.getByRole('button', { name: 'Iniciar download' }).click()
        await expect(
          window.getByText('Concluído', { exact: false }),
        ).toBeVisible({ timeout: 90000 })
        await window.getByRole('button', { name: 'Início' }).click()
      } else if (source === 'Instagram') {
        await window
          .getByRole('button', { name: 'Fechar preparação do download' })
          .click()
      }
    }
    await window.getByRole('button', { name: 'Revisar download' }).click()
    await window.getByRole('button', { name: 'Iniciar download' }).click()
    await expect(
      window
        .locator('article')
        .filter({ hasText: /NASA Artemis - The Orion spacecraft/ })
        .getByText('Concluído', { exact: false }),
    ).toBeVisible({
      timeout: 90000,
    })
    expect(
      readdirSync(directory).filter((file) => file.endsWith('.mp4')).length,
    ).toBeGreaterThanOrEqual(2)
    await window
      .getByRole('button', { name: 'Biblioteca', exact: true })
      .click()
    await expect(
      window.getByText(/NASA Artemis - The Orion spacecraft/),
    ).toBeVisible()
  } finally {
    await app.close()
  }
})

test('loads a YouTube radio playlist one page at a time', async ({
  browserName,
}, testInfo) => {
  test.setTimeout(150000)
  expect(browserName).toBeTruthy()
  const electronEnv = { ...process.env }
  delete electronEnv.ELECTRON_RUN_AS_NODE
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${testInfo.outputPath('radio-userdata')}`],
    env: electronEnv,
  })
  try {
    const window = await app.firstWindow()
    await window.getByRole('button', { name: 'Começar' }).click()
    await window.getByRole('button', { name: 'Continuar' }).click()
    await window.getByRole('button', { name: 'Pular' }).click()
    await window
      .getByRole('textbox', { name: 'Link de mídia' })
      .fill('https://www.youtube.com/watch?v=AxFhwtwiw6o&list=RDAxFhwtwiw6o')
    await window.getByRole('button', { name: 'Analisar' }).click()
    await window
      .getByRole('button', { name: 'Playlist inteira (25 por página)' })
      .click()
    await expect(window.getByText('Itens da playlist')).toBeVisible({
      timeout: 65000,
    })
    const firstCover = window.locator('.playlist-row img').first()
    await expect(firstCover).toHaveAttribute(
      'src',
      /^https:\/\/i\.ytimg\.com\//,
    )
    await expect
      .poll(
        () =>
          firstCover.evaluate((image: HTMLImageElement) => image.naturalWidth),
        {
          timeout: 15000,
        },
      )
      .toBeGreaterThan(0)
    const sidebar = window.locator('aside')
    const sidebarTop = (await sidebar.boundingBox())?.y
    await window.locator('[role="dialog"] .orbe-scroll').evaluate((area) => {
      area.scrollTop = 500
    })
    const scrollState = await window.evaluate(() => {
      return {
        htmlOverflow: getComputedStyle(document.documentElement).overflowY,
        bodyOverflow: getComputedStyle(document.body).overflowY,
        modalScrollTop:
          document.querySelector('[role="dialog"] .orbe-scroll')
            ?.scrollTop ?? 0,
      }
    })
    expect(scrollState.htmlOverflow).toBe('hidden')
    expect(scrollState.bodyOverflow).toBe('hidden')
    expect(scrollState.modalScrollTop).toBeGreaterThan(0)
    expect((await sidebar.boundingBox())?.y).toBe(sidebarTop)
    await window.screenshot({
      path: testInfo.outputPath('playlist-design.png'),
    })
    await window.getByRole('button', { name: 'Desmarcar' }).click()
    await expect(
      window.getByText(/0 selecionados de \d+ carregados/),
    ).toBeVisible()
    await window.getByRole('button', { name: 'Selecionar todos' }).click()
    const items = window.locator('.playlist-row[role="checkbox"]')
    const firstCount = await items.count()
    expect(firstCount).toBeGreaterThan(0)
    await expect(items.first()).toHaveAttribute('aria-checked', 'true')
    await window.getByRole('button', { name: 'Carregar mais 25 itens' }).click()
    await expect
      .poll(() => items.count(), { timeout: 65000 })
      .toBeGreaterThan(firstCount)
  } finally {
    await app.close()
  }
})
