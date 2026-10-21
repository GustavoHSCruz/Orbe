import { afterAll, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, existsSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ProcessRunner } from '../../domain/media-provider'
import { PreviewService } from './preview-service'

const directory = mkdtempSync(join(tmpdir(), 'orbe-preview-test-'))
afterAll(() => rmSync(directory, { recursive: true, force: true }))

describe('preview service', () => {
  it('creates a short temporary file, reuses it, and removes it on shutdown', async () => {
    const run = vi.fn<ProcessRunner['run']>(async (_command, args) => {
      const template = args[args.indexOf('-o') + 1]!
      writeFileSync(template.replace('%(ext)s', 'mp3'), 'preview')
      return { stdout: '', stderr: '' }
    })
    const service = new PreviewService(directory, 'yt-dlp', 'ffmpeg', { run })
    const url = 'https://example.com/watch?v=123'
    const first = await service.create(url)
    const second = await service.create(url)
    expect(second).toBe(first)
    expect(run).toHaveBeenCalledTimes(1)
    expect(run.mock.calls[0]?.[1]).toContain('*0-30')
    expect(run.mock.calls[0]?.[1]).toContain('--no-playlist')
    const id = first.split('/').at(-1)!
    expect(existsSync(service.find(id)!)).toBe(true)
    await service.dispose()
    expect(existsSync(directory)).toBe(false)
  })

  it('passes the browser session to the temporary preview', async () => {
    const run = vi.fn<ProcessRunner['run']>(async (_command, args) => {
      writeFileSync(
        args[args.indexOf('-o') + 1]!.replace('%(ext)s', 'mp3'),
        'preview',
      )
      return { stdout: '', stderr: '' }
    })
    const service = new PreviewService(directory, 'yt-dlp', 'ffmpeg', { run })
    await service.create('https://www.youtube.com/watch?v=AxFhwtwiw6o', {
      browser: 'chrome',
    })
    expect(run.mock.calls[0]?.[1]).toEqual(
      expect.arrayContaining(['--cookies-from-browser', 'chrome']),
    )
    await service.dispose()
  })
})
