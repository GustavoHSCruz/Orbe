import { execFile } from 'node:child_process'
import type { LibraryService } from '../application/library-service'

const maxImageBytes = 6 * 1024 * 1024

function embeddedArtwork(
  ffmpeg: string,
  filePath: string,
): Promise<Buffer | null> {
  return new Promise((resolve) => {
    execFile(
      ffmpeg,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        filePath,
        '-map',
        '0:v:0',
        '-frames:v',
        '1',
        '-f',
        'image2pipe',
        '-vcodec',
        'mjpeg',
        'pipe:1',
      ],
      { encoding: 'buffer', maxBuffer: maxImageBytes, timeout: 12000 },
      (error, stdout) => resolve(error ? null : Buffer.from(stdout)),
    )
  })
}

async function loadArtwork(source: string): Promise<string | null> {
  try {
    const url = new URL(source)
    if (url.protocol === 'data:')
      return /^data:image\/(jpeg|png|webp|gif|avif);base64,/i.test(source)
        ? source
        : null
    if (url.protocol !== 'https:') return null
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (
      !response.ok ||
      Number(response.headers.get('content-length') ?? 0) > maxImageBytes
    )
      return null
    const mime = response.headers.get('content-type')?.split(';')[0]?.trim()
    if (!mime || !/^image\/(jpeg|png|webp|gif|avif)$/i.test(mime)) return null
    const bytes = Buffer.from(await response.arrayBuffer())
    return bytes.length <= maxImageBytes
      ? `data:${mime};base64,${bytes.toString('base64')}`
      : null
  } catch {
    return null
  }
}

export class ArtworkService {
  private readonly cache = new Map<string, Promise<string | null>>()

  constructor(
    private readonly library: LibraryService,
    private readonly ffmpeg: string,
  ) {}

  invalidate(): void {
    this.cache.clear()
  }

  forTrack(id: string): Promise<string | null> {
    const cached = this.cache.get(id)
    if (cached) return cached
    const work = this.load(id)
    this.cache.set(id, work)
    return work
  }

  private async load(id: string): Promise<string | null> {
    const record = this.library.find(id)
    if (!record) return null
    const remote = record.thumbnail ? await loadArtwork(record.thumbnail) : null
    if (remote) return remote
    const embedded = await embeddedArtwork(this.ffmpeg, record.filePath)
    return embedded?.length
      ? `data:image/jpeg;base64,${embedded.toString('base64')}`
      : null
  }
}
