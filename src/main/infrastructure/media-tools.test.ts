// @vitest-environment node
import { expect, test } from 'vitest'
import { join } from 'node:path'
import { mediaToolPath } from './media-tools'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { relative, resolve } from 'node:path'

test('selects Windows resources, native Linux PATH tools, and explicit overrides', () => {
  const options = {
    appPath: '/nonexistent/orbe-app',
    resourcesPath: '/nonexistent/orbe-resources',
    packaged: true,
    env: {},
  }
  expect(mediaToolPath('ffmpeg', { ...options, platform: 'win32' })).toBe(
    join(options.resourcesPath, 'bin/ffmpeg.exe'),
  )
  expect(mediaToolPath('ffmpeg', { ...options, platform: 'linux' })).toBe(
    'ffmpeg',
  )
  expect(
    mediaToolPath('yt-dlp', {
      ...options,
      platform: 'linux',
      env: { ORBE_YT_DLP_PATH: '/usr/local/bin/yt-dlp' },
    }),
  ).toBe('/usr/local/bin/yt-dlp')
})

test('resolves native tools to absolute paths so yt-dlp can detect FFmpeg conversion formats', () => {
  mkdirSync('test-results', { recursive: true })
  const directory = mkdtempSync(resolve('test-results/native-tool-'))
  try {
    const executable = join(directory, 'ffmpeg')
    writeFileSync(executable, '#!/bin/sh\nexit 0\n', { mode: 0o755 })
    expect(
      mediaToolPath('ffmpeg', {
        platform: 'linux',
        packaged: false,
        appPath: '/nonexistent',
        resourcesPath: '',
        env: { PATH: relative(process.cwd(), directory) },
      }),
    ).toBe(executable)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
