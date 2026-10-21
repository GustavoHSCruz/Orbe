import { _electron as electron, expect, test } from '@playwright/test'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { writeFile } from 'node:fs/promises'

const execute = promisify(execFile)

test('animates artwork colors and follows real timed lyrics with seeking and manual browsing', async ({
  browserName,
}, testInfo) => {
  expect(browserName).toBeTruthy()
  const ffmpeg = join(process.cwd(), 'resources/bin/ffmpeg.exe')
  const cover = testInfo.outputPath('cover.jpg')
  const track = testInfo.outputPath('Mare de luz.mp3')
  await execute(ffmpeg, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    'color=c=0x196b9a:s=480x480,drawbox=x=200:y=0:w=170:h=480:color=0xb6313e:t=fill,drawbox=x=370:y=0:w=110:h=480:color=0xc89b62:t=fill',
    '-frames:v',
    '1',
    '-y',
    cover,
  ])
  await execute(ffmpeg, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=220:duration=50',
    '-i',
    cover,
    '-map',
    '0:a',
    '-map',
    '1:v',
    '-c:a',
    'libmp3lame',
    '-q:a',
    '7',
    '-c:v',
    'copy',
    '-id3v2_version',
    '3',
    '-y',
    track,
  ])
  await writeFile(
    testInfo.outputPath('Mare de luz.lrc'),
    '[00:00.00]Deixa a cidade acender\n[00:05.00]E o tempo dançar devagar\n[00:10.00]Cada cor encontra o seu lugar\n[00:15.00]Na maré de luz que vem do mar\n[00:20.00]Um novo céu para descobrir\n[00:25.00]Um horizonte inteiro a seguir\n[00:30.00]Deixa a música nos levar\n[00:40.00]Até o dia clarear',
    'utf8',
  )
  const env = { ...process.env, ORBE_DOWNLOAD_DIRECTORY: testInfo.outputPath('downloads') }
  delete env.ELECTRON_RUN_AS_NODE
  const packaged = process.env.ORBE_E2E_PACKAGED === '1'
  const app = await electron.launch({
    ...(packaged
      ? { executablePath: join(process.cwd(), 'dist/win-unpacked/Orbe.exe') }
      : {}),
    args: [
      ...(packaged ? [] : ['.']),
      `--user-data-dir=${testInfo.outputPath('userdata')}`,
    ],
    env,
  })
  try {
    const window = await app.firstWindow()
    await window.getByRole('button', { name: 'Começar' }).click()
    await window.getByRole('button', { name: 'Continuar' }).click()
    await window.getByRole('button', { name: 'Pular' }).click()
    await app.evaluate(({ dialog }, file) => {
      Object.defineProperty(dialog, 'showOpenDialog', {
        configurable: true,
        value: async () => ({ canceled: false, filePaths: [file] }),
      })
    }, track)
    await window
      .getByRole('button', { name: 'Biblioteca', exact: true })
      .click()
    await window.getByRole('button', { name: 'Adicionar arquivos' }).click()
    await window.getByRole('button', { name: 'Reproduzir Mare de luz' }).click()
    await window
      .getByRole('button', { name: 'Expandir player', exact: true })
      .click()
    const player = window.getByRole('dialog', { name: 'Player expandido' })
    const atmosphere = player.locator('.player-atmosphere')
    await expect(atmosphere).toHaveAttribute('data-palette', 'artwork')
    const orbit = atmosphere.locator('.player-atmosphere-orbit').first()
    const initialTransform = await orbit.evaluate(
      (element) => getComputedStyle(element).transform,
    )
    await expect
      .poll(() =>
        orbit.evaluate((element) => getComputedStyle(element).transform),
      )
      .not.toBe(initialTransform)
    await player
      .getByRole('button', { name: 'Deixa a cidade acender', exact: true })
      .click()
    await expect(player.locator('[data-current-lyric="true"]')).toHaveText(
      'E o tempo dançar devagar',
      { timeout: 10000 },
    )
    expect(
      await player
        .locator('.lyric-line')
        .first()
        .evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
    ).toBeGreaterThanOrEqual(28)
    await player
      .getByRole('button', {
        name: 'Cada cor encontra o seu lugar',
        exact: true,
      })
      .click()
    await expect(player.locator('[data-current-lyric="true"]')).toHaveText(
      'Cada cor encontra o seu lugar',
    )
    const scroll = player.locator('.lyrics-stage-scroll')
    await scroll.hover()
    await window.mouse.wheel(0, 150)
    await expect(
      player.getByRole('button', { name: 'Voltar ao verso atual' }),
    ).toBeVisible()
    await player.getByRole('button', { name: 'Voltar ao verso atual' }).click()
    await expect(player.locator('.lyrics-stage')).toHaveAttribute(
      'data-browsing',
      'false',
    )
    await expect
      .poll(() =>
        player
          .locator('[data-current-lyric="true"]')
          .evaluate((element) => getComputedStyle(element).color),
      )
      .toBe('rgb(255, 255, 255)')
    await window.screenshot({
      path: testInfo.outputPath('lyrics-atmosphere.png'),
    })
    await player.getByRole('button', { name: 'Pausar', exact: true }).click()
    await player.getByRole('button', { name: /Sincronização/ }).click()
    await player.getByRole('button', { name: 'Atrasar letra em 50 ms' }).click()
    await expect(player.locator('output')).toHaveText('+250 ms')
    await player
      .getByRole('button', {
        name: 'Cada cor encontra o seu lugar',
        exact: true,
      })
      .click()
    await expect(player.locator('[data-current-lyric="true"]')).toHaveText(
      'Cada cor encontra o seu lugar',
    )
    await player.getByRole('button', { name: /Sincronização/ }).click()
    await expect(atmosphere).toHaveAttribute('data-playing', 'false')
    expect(
      await orbit.evaluate(
        (element) => getComputedStyle(element).animationPlayState,
      ),
    ).toBe('paused')
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]!.setSize(1024, 700),
    )
    await window.screenshot({ path: testInfo.outputPath('lyrics-compact.png') })
    const bounds = await player
      .getByRole('button', { name: 'Reproduzir', exact: true })
      .boundingBox()
    expect(bounds).not.toBeNull()
    expect(bounds!.y + bounds!.height).toBeLessThan(
      await window.evaluate(() => innerHeight),
    )
    await window.emulateMedia({ reducedMotion: 'reduce' })
    expect(
      await orbit.evaluate(
        (element) => getComputedStyle(element).animationName,
      ),
    ).toBe('none')
  } finally {
    await app.close()
  }
})
