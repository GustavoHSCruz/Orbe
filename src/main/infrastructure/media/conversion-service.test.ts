import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ConversionService } from './conversion-service'
import { processRunner } from './process-runner'
import { mediaToolPath } from '../media-tools'

const tools = { platform: process.platform, packaged: false, appPath: process.cwd(), resourcesPath: '' }
const ffmpeg = mediaToolPath('ffmpeg', tools)
const ffprobe = mediaToolPath('ffprobe', tools)
let directory: string
let video: string

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'orbe-converter-'))
  video = join(directory, 'amostra.mp4')
  await processRunner.run(
    ffmpeg,
    [
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
    ],
    { timeoutMs: 30000 },
  )
})
afterAll(async () => {
  if (directory) await rm(directory, { recursive: true, force: true })
})

describe('local conversion', () => {
  it('extracts playable MP3 audio from video and preserves the source', async () => {
    const service = new ConversionService(ffmpeg, ffprobe, processRunner)
    const source = await service.inspect(video)
    expect(source.hasAudio).toBe(true)
    expect(source.hasVideo).toBe(true)
    const updates: number[] = []
    const output = await service.convert(
      video,
      source,
      'mp3',
      directory,
      (percent) => updates.push(percent),
      new AbortController().signal,
    )
    expect(output.format).toBe('mp3')
    expect((await stat(output.path)).size).toBeGreaterThan(1000)
    expect((await stat(video)).size).toBeGreaterThan(1000)
    expect(updates.at(-1)).toBe(100)
    const audio = await service.inspect(output.path)
    expect(audio.hasAudio).toBe(true)
    expect(audio.hasVideo).toBe(false)
  })

  it('transcodes video and does not overwrite an earlier result', async () => {
    const service = new ConversionService(ffmpeg, ffprobe, processRunner)
    const source = await service.inspect(video)
    const first = await service.convert(
      video,
      source,
      'webm',
      directory,
      () => {},
      new AbortController().signal,
    )
    const second = await service.convert(
      video,
      source,
      'webm',
      directory,
      () => {},
      new AbortController().signal,
    )
    expect(second.path).not.toBe(first.path)
    expect((await service.inspect(first.path)).hasVideo).toBe(true)
    expect((await service.inspect(second.path)).hasVideo).toBe(true)
  })

  it('converts an unprotected M4P container to MP3', async () => {
    const service = new ConversionService(ffmpeg, ffprobe, processRunner)
    const m4p = join(directory, 'sem-protecao.m4p')
    await processRunner.run(
      ffmpeg,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        video,
        '-map',
        '0:a:0',
        '-c:a',
        'aac',
        '-f',
        'ipod',
        '-y',
        m4p,
      ],
      { timeoutMs: 30000 },
    )
    const source = await service.inspect(m4p)
    expect(source.hasAudio).toBe(true)
    const result = await service.convert(
      m4p,
      source,
      'mp3',
      directory,
      () => {},
      new AbortController().signal,
    )
    expect((await service.inspect(result.path)).hasAudio).toBe(true)
  })

  it('rejects unsupported or protected input with a readable message', async () => {
    const service = new ConversionService(ffmpeg, ffprobe, processRunner)
    const fake = join(directory, 'protegido.m4p')
    await writeFile(fake, 'not media')
    await expect(service.inspect(fake)).rejects.toThrow(
      /M4P protegidos por DRM/,
    )
    expect(await readFile(fake, 'utf8')).toBe('not media')
  })
})
