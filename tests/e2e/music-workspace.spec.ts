import { _electron as electron, expect, test } from '@playwright/test'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'

const execute = promisify(execFile)

test('browses artwork, searches, switches views and opens favorites in both themes', async ({
  browserName,
}, testInfo) => {
  expect(browserName).toBeTruthy()
  const ffmpeg = join(process.cwd(), 'resources/bin/ffmpeg.exe')
  const tracks: string[] = []
  for (const [index, title] of [
    'Horizonte',
    'Luz da cidade',
    'Entre ondas',
    'Depois da chuva',
    'Devagar',
  ].entries()) {
    const file = testInfo.outputPath(`${title}.mp3`)
    await execute(ffmpeg, [
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=220:duration=30',
      '-f',
      'lavfi',
      '-i',
      `color=c=${['0x887074', '0x598b90', '0x456b92', '0xc69c71', '0x867ca3'][index]}:s=400x400,drawbox=x=80:y=80:w=240:h=240:color=white@0.2:t=fill`,
      '-map',
      '0:a',
      '-map',
      '1:v',
      '-c:a',
      'libmp3lame',
      '-q:a',
      '7',
      '-c:v',
      'mjpeg',
      '-frames:v',
      '1',
      '-id3v2_version',
      '3',
      '-metadata',
      `title=${title}`,
      '-metadata',
      'artist=Artista de teste',
      '-y',
      file,
    ])
    tracks.push(file)
  }
  const env = { ...process.env, ORBE_DOWNLOAD_DIRECTORY: testInfo.outputPath('downloads') }
  delete env.ELECTRON_RUN_AS_NODE
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${testInfo.outputPath('userdata')}`],
    env,
  })
  try {
    const window = await app.firstWindow()
    await window.emulateMedia({ reducedMotion: 'reduce' })
    const errors: string[] = []
    window.on('pageerror', (error) => errors.push(error.message))
    await window.getByRole('button', { name: 'Começar' }).click()
    await window.getByRole('button', { name: 'Continuar' }).click()
    await window.getByRole('button', { name: 'Pular' }).click()
    await expect(
      window.getByRole('heading', { name: 'Ouvir agora', exact: true }),
    ).toBeVisible()
    await window.evaluate(() => document.fonts.ready)
    const type = await window.evaluate(() => ({
      family: getComputedStyle(document.documentElement).fontFamily,
      loaded: document.fonts.check('14px "Plus Jakarta Sans Variable"'),
      navigation: getComputedStyle(
        document.querySelector('.music-sidebar nav button')!,
      ).fontSize,
      search: getComputedStyle(document.querySelector('.global-search input')!)
        .fontSize,
    }))
    expect(type.family).toContain('Plus Jakarta Sans Variable')
    expect(type).toMatchObject({
      loaded: true,
      navigation: '14px',
      search: '14px',
    })
    await window.screenshot({ path: testInfo.outputPath('home-empty.png') })
    await app.evaluate(({ dialog }, files) => {
      Object.defineProperty(dialog, 'showOpenDialog', {
        configurable: true,
        value: async () => ({ canceled: false, filePaths: files }),
      })
    }, tracks)
    await window
      .getByRole('button', { name: 'Biblioteca', exact: true })
      .click()
    await window.getByRole('button', { name: 'Adicionar arquivos' }).click()
    await expect(window.locator('.library-item')).toHaveCount(5)
    await window
      .locator('.library-item')
      .first()
      .getByRole('button', { name: 'Favoritar', exact: true })
      .click()
    await window.getByRole('button', { name: 'Início', exact: true }).click()
    await expect(window.locator('.album-card')).toHaveCount(5)
    await expect(window.locator('.album-card img')).toHaveCount(5)
    await expect(window.locator('.listening-home').locator('..')).toHaveCSS(
      'opacity',
      '1',
    )
    await window.screenshot({ path: testInfo.outputPath('home-dark.png') })
    await window.getByRole('button', { name: /Suas favoritas/ }).click()
    await expect(window.locator('.library-item')).toHaveCount(1)
    await window
      .getByRole('textbox', { name: 'Buscar na biblioteca', exact: true })
      .fill('ondas')
    await expect(window.locator('.library-item')).toHaveCount(0)
    await expect(
      window.getByRole('button', { name: 'Favoritos', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')
    await window.getByRole('button', { name: 'Todas', exact: true }).click()
    await expect(window.locator('.library-item')).toHaveCount(1)
    await expect(window.locator('.library-item')).toContainText('Entre ondas')
    await window
      .getByRole('textbox', { name: 'Buscar na biblioteca', exact: true })
      .fill('')
    await expect(window.locator('.library-item')).toHaveCount(5)
    await window.getByRole('button', { name: 'Ver como lista' }).click()
    await expect(window.locator('.library-list')).toBeVisible()
    await window.getByRole('button', { name: 'Ver como capas' }).click()
    await window.locator('summary').first().click()
    await expect(
      window.getByRole('button', { name: 'Abrir pasta', exact: true }).first(),
    ).toBeVisible()
    await window.locator('summary').first().press('Escape')
    await window
      .getByRole('button', { name: 'Reproduzir Horizonte', exact: true })
      .click()
    await expect(window.locator('.mini-player')).toBeVisible()
    await window
      .getByRole('button', { name: 'Expandir player', exact: true })
      .click()
    await expect(
      window.getByRole('dialog', { name: 'Player expandido' }),
    ).toBeVisible()
    await window.keyboard.press('Control+n')
    const downloadDialog = window.getByRole('dialog', { name: 'Novo download' })
    await expect(downloadDialog).toBeVisible()
    await expect(downloadDialog).toHaveCSS('opacity', '1')
    await window.screenshot({ path: testInfo.outputPath('download-dark.png') })
    await expect(window.locator('#root')).toHaveAttribute('inert', '')
    await window.keyboard.press('Tab')
    await expect
      .poll(() =>
        window.evaluate(() =>
          document.activeElement
            ?.closest('[role="dialog"]')
            ?.getAttribute('aria-label'),
        ),
      )
      .toBe('Novo download')
    await window.keyboard.press('Escape')
    await expect(downloadDialog).toBeHidden()
    await expect(
      window.getByRole('dialog', { name: 'Player expandido' }),
    ).toBeVisible()
    await window.keyboard.press('Escape')
    await expect(
      window.getByRole('dialog', { name: 'Player expandido' }),
    ).toBeHidden()
    await window.locator('.music-main').evaluate((element) => {
      element.scrollTop = 0
    })
    await window.screenshot({ path: testInfo.outputPath('library-dark.png') })
    await window
      .getByRole('button', { name: 'Configurações', exact: true })
      .click()
    await window.getByLabel('Tema', { exact: true }).selectOption('light')
    await window
      .getByRole('button', { name: 'Salvar alterações', exact: true })
      .click()
    await expect(window.locator('.app-shell')).toHaveAttribute(
      'data-theme',
      'light',
    )
    await window.mouse.move(1100, 500)
    const saveButton = window.getByRole('button', {
      name: 'Salvar alterações',
      exact: true,
    })
    await expect(saveButton).toHaveCSS('background-color', 'rgb(217, 43, 75)')
    const saveContrast = await saveButton.evaluate((button) => {
      const channel = (value: number) => {
        const normalized = value / 255
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4
      }
      const luminance = (color: string) => {
        const [red, green, blue] = color.match(/[\d.]+/g)!.map(Number)
        return (
          0.2126 * channel(red) +
          0.7152 * channel(green) +
          0.0722 * channel(blue)
        )
      }
      const style = getComputedStyle(button)
      const foreground = luminance(style.color)
      const background = luminance(style.backgroundColor)
      return (
        (Math.max(foreground, background) + 0.05) /
        (Math.min(foreground, background) + 0.05)
      )
    })
    expect(saveContrast).toBeGreaterThanOrEqual(4.5)
    await window.screenshot({ path: testInfo.outputPath('settings-light.png') })
    await window.getByRole('button', { name: 'Início', exact: true }).click()
    await expect(window.locator('.listening-home').locator('..')).toHaveCSS(
      'opacity',
      '1',
    )
    await window.screenshot({ path: testInfo.outputPath('home-light.png') })
    await window.keyboard.press('Control+n')
    await expect(downloadDialog).toBeVisible()
    await expect(downloadDialog).toHaveCSS('opacity', '1')
    await window.screenshot({ path: testInfo.outputPath('download-light.png') })
    await window.keyboard.press('Escape')
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]!.setSize(1024, 700),
    )
    await window.screenshot({ path: testInfo.outputPath('home-compact.png') })
    expect(
      await window.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    const player = await window.locator('.mini-player').boundingBox()
    const sidebar = await window.locator('.music-sidebar').boundingBox()
    expect(player!.x).toBeGreaterThan(sidebar!.width)
    expect(player!.height).toBeLessThan(90)
    const hero = await window.locator('.listening-hero').boundingBox()
    expect(hero!.height).toBeLessThan(180)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('adds the first local file directly from onboarding', async ({
  browserName,
}, testInfo) => {
  expect(browserName).toBeTruthy()
  const file = testInfo.outputPath('Primeira música.mp3')
  await execute(join(process.cwd(), 'resources/bin/ffmpeg.exe'), [
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:duration=1',
    '-y',
    file,
  ])
  const env = { ...process.env, ORBE_DOWNLOAD_DIRECTORY: testInfo.outputPath('downloads') }
  delete env.ELECTRON_RUN_AS_NODE
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${testInfo.outputPath('userdata')}`],
    env,
  })
  try {
    const window = await app.firstWindow()
    await app.evaluate(({ dialog }, path) => {
      Object.defineProperty(dialog, 'showOpenDialog', {
        configurable: true,
        value: async () => ({ canceled: false, filePaths: [path] }),
      })
    }, file)
    await window.getByRole('button', { name: 'Adicionar arquivos' }).click()
    await expect(
      window.getByRole('heading', { name: 'Biblioteca', exact: true }),
    ).toBeVisible()
    await expect(window.locator('.library-item')).toContainText(
      'Primeira música',
    )
  } finally {
    await app.close()
  }
})
