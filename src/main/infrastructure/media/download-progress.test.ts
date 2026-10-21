// @vitest-environment node
import { expect, it } from 'vitest'
import { createServer } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { YtDlpProvider } from './yt-dlp-provider'
import { processRunner } from './process-runner'
import { mediaToolPath } from '../media-tools'

it('receives intermediate progress from the bundled downloader with --print enabled', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'orbe-progress-'))
  const data = Buffer.alloc(400044)
  data.write('RIFF')
  data.writeUInt32LE(data.length - 8, 4)
  data.write('WAVEfmt ', 8)
  data.writeUInt32LE(16, 16)
  data.writeUInt16LE(1, 20)
  data.writeUInt16LE(1, 22)
  data.writeUInt32LE(44100, 24)
  data.writeUInt32LE(88200, 28)
  data.writeUInt16LE(2, 32)
  data.writeUInt16LE(16, 34)
  data.write('data', 36)
  data.writeUInt32LE(data.length - 44, 40)
  const server = createServer((_request, response) => {
    response.writeHead(200, {
      'Content-Type': 'audio/wav',
      'Content-Length': data.length,
    })
    response.end(data)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address() as { port: number }
  const progress: number[] = []
  const totals: (number | null)[] = []
  try {
    const provider = new YtDlpProvider(
      'generic',
      'Generic',
      processRunner,
      mediaToolPath('yt-dlp', { platform: process.platform, packaged: false, appPath: process.cwd(), resourcesPath: '' }),
    )
    const path = await provider.download(
      {
        url: `http://127.0.0.1:${address.port}/tone.wav`,
        title: 'tone',
        provider: 'generic',
        mediaType: 'audio',
        formatId: 'bestaudio/best',
        extension: 'wav',
        hasAudio: true,
        quality: '',
        thumbnail: null,
        artist: null,
        channel: null,
        durationMs: null,
      },
      directory,
      {
        onProgress: (value) => {
          progress.push(value.percent)
          totals.push(value.totalBytes)
        },
      },
      new AbortController().signal,
      { namingTemplate: 'title', speedLimitKbps: 128 },
    )
    expect(path).toContain(directory)
    expect(progress.some((value) => value > 0 && value < 100)).toBe(true)
    expect(progress.at(-1)).toBe(100)
    expect(totals).toContain(data.length)
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
    await rm(directory, { recursive: true, force: true })
  }
}, 30000)
