import { z } from 'zod'
import type {
  MediaAnalysis,
  MediaFormat,
} from '../../../shared/contracts/media'

const VideoFormatSchema = z.object({
  url: z.string(),
  container: z.string(),
  bitrate: z.number().optional(),
  codec: z.string().optional(),
})
const VideoSchema = z.object({
  id: z.string(),
  thumbnail_url: z.string().optional(),
  duration: z.number().optional(),
  formats: z.array(VideoFormatSchema),
})
const StatusSchema = z.object({
  code: z.number(),
  status: z
    .object({
      id: z.string(),
      text: z.string().optional(),
      author: z.object({ screen_name: z.string() }).optional(),
      media: z.object({ videos: z.array(VideoSchema).optional() }).optional(),
    })
    .optional(),
})

function postId(url: URL): string | null {
  return /\/status\/(\d{10,25})(?:\/|$)/.exec(url.pathname)?.[1] ?? null
}

function videoIndex(url: URL): number {
  const number = Number(/\/video\/(\d+)(?:\/|$)/.exec(url.pathname)?.[1] ?? '1')
  return Math.max(0, number - 1)
}

function trustedVideoUrl(input: string): boolean {
  try {
    const url = new URL(input)
    return (
      url.protocol === 'https:' &&
      url.hostname === 'video.twimg.com' &&
      url.username === '' &&
      url.password === '' &&
      url.pathname.endsWith('.mp4')
    )
  } catch {
    return false
  }
}

function heightFromUrl(input: string): number | null {
  const height = /\/\d+x(\d+)\//.exec(new URL(input).pathname)?.[1]
  return height ? Number(height) : null
}

export async function fetchTwitterFallback(
  sourceUrl: URL,
  fetcher: typeof fetch = fetch,
): Promise<{ analysis: MediaAnalysis; urls: Map<string, string> }> {
  const id = postId(sourceUrl)
  if (!id) throw new Error('Este link do X não contém um post válido.')
  const response = await fetcher(`https://api.fxtwitter.com/2/status/${id}`, {
    headers: { 'User-Agent': 'Orbe (X video fallback)' },
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok)
    throw new Error(`A fonte alternativa do X respondeu ${response.status}.`)
  const raw = StatusSchema.parse(await response.json())
  if (raw.code !== 200 || raw.status?.id !== id)
    throw new Error('A fonte alternativa não retornou o post solicitado.')
  const video = raw.status.media?.videos?.[videoIndex(sourceUrl)]
  if (!video)
    throw new Error('A fonte alternativa não encontrou vídeo neste post.')
  const urls = new Map<string, string>()
  const formats: MediaFormat[] = video.formats.flatMap((format, index) => {
    if (format.container !== 'mp4' || !trustedVideoUrl(format.url)) return []
    const formatId = `fx:${video.id}:${index}`
    urls.set(formatId, format.url)
    const height = heightFromUrl(format.url)
    return [
      {
        id: formatId,
        extension: 'mp4',
        mediaType: 'video' as const,
        quality: height ? `${height}p` : 'Original',
        codec: format.codec ?? null,
        fps: null,
        bitrateKbps:
          format.bitrate == null ? null : Math.round(format.bitrate / 1000),
        fileSize: null,
        hasAudio: true,
      },
    ]
  })
  if (!formats.length)
    throw new Error('A fonte alternativa não oferece MP4 para este vídeo.')
  const author = raw.status.author?.screen_name ?? null
  const title =
    raw.status.text?.trim().slice(0, 150) ||
    (author ? `Vídeo de @${author}` : `Vídeo do X ${id}`)
  let thumbnail: string | null = null
  if (video.thumbnail_url) {
    try {
      const url = new URL(video.thumbnail_url)
      if (url.protocol === 'https:' && url.hostname === 'pbs.twimg.com')
        thumbnail = url.href
    } catch {
      /* Ignore an invalid thumbnail. */
    }
  }
  return {
    analysis: {
      provider: 'twitter',
      sourceUrl: sourceUrl.href,
      sourceMediaId: video.id,
      title,
      artist: null,
      album: null,
      channel: author,
      thumbnail,
      durationMs:
        video.duration == null ? null : Math.round(video.duration * 1000),
      isPlaylist: false,
      items: [],
      formats,
    },
    urls,
  }
}
