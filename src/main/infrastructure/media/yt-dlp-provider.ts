import { z } from 'zod'
import { existsSync } from 'node:fs'
import { AppError } from '../../domain/app-error'
import type {
  DownloadEvents,
  DownloadPreferences,
  MediaProvider,
  ProcessRunner,
} from '../../domain/media-provider'
import type {
  DownloadStartRequest,
  MediaAnalysis,
  MediaFormat,
} from '../../../shared/contracts/media'
import { mediaSourceForHost } from '../../../shared/contracts/media-sources'
import { fetchTwitterFallback } from './twitter-fallback'

const RawFormatSchema = z.object({
  format_id: z.string().optional(),
  ext: z.string().optional(),
  height: z.number().nullable().optional(),
  fps: z.number().nullable().optional(),
  vcodec: z.string().nullable().optional(),
  acodec: z.string().nullable().optional(),
  audio_ext: z.string().nullable().optional(),
  video_ext: z.string().nullable().optional(),
  abr: z.number().nullable().optional(),
  tbr: z.number().nullable().optional(),
  filesize: z.number().nullable().optional(),
  filesize_approx: z.number().nullable().optional(),
})
const RawThumbnailSchema = z.object({
  url: z.string(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
})
const RawMediaSchema = z.object({
  id: z.string().optional(),
  webpage_url: z.string().optional(),
  url: z.string().optional(),
  title: z.string().optional(),
  uploader: z.string().nullable().optional(),
  channel: z.string().nullable().optional(),
  artist: z.string().nullable().optional(),
  album: z.string().nullable().optional(),
  thumbnail: z.string().nullable().optional(),
  thumbnails: z.array(z.unknown()).optional(),
  duration: z.number().nullable().optional(),
  entries: z.array(z.unknown()).nullable().optional(),
  formats: z.array(RawFormatSchema).optional(),
})

function validUrl(input: string | null | undefined): string | null {
  if (!input) return null
  try {
    return new URL(input).protocol === 'https:' ? input : null
  } catch {
    return null
  }
}

function mediaThumbnail(
  media: z.infer<typeof RawMediaSchema>,
  provider: MediaProvider['id'],
): string | null {
  const explicit = validUrl(media.thumbnail)
  if (explicit) return explicit
  const candidates = (media.thumbnails ?? [])
    .map((entry) => RawThumbnailSchema.safeParse(entry))
    .filter((entry) => entry.success)
    .map((entry) => entry.data)
    .sort(
      (a, b) =>
        (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0),
    )
  for (const candidate of candidates) {
    const url = validUrl(candidate.url)
    if (url) return url
  }
  return provider === 'youtube' && /^[A-Za-z0-9_-]{11}$/.test(media.id ?? '')
    ? `https://i.ytimg.com/vi/${media.id}/hqdefault.jpg`
    : null
}

export function mapYtDlpAnalysis(
  raw: unknown,
  sourceUrl: string,
  provider: MediaProvider['id'],
): MediaAnalysis {
  const media = RawMediaSchema.parse(raw)
  const items = (media.entries ?? []).flatMap((entry) => {
    const item = RawMediaSchema.safeParse(entry)
    if (!item.success) return []
    const url =
      validUrl(item.data.webpage_url) ??
      validUrl(item.data.url) ??
      validUrl(item.data.id?.startsWith('http') ? item.data.id : undefined) ??
      (provider === 'youtube' && /^[A-Za-z0-9_-]{11}$/.test(item.data.id ?? '')
        ? `https://www.youtube.com/watch?v=${item.data.id}`
        : null)
    if (!url || !item.data.title) return []
    return [
      {
        id: item.data.id ?? url,
        url,
        title: item.data.title,
        thumbnail: mediaThumbnail(item.data, provider),
        durationMs:
          item.data.duration == null ? null : item.data.duration * 1000,
      },
    ]
  })
  const formats: MediaFormat[] = (media.formats ?? []).flatMap((format) => {
    if (!format.format_id || !format.ext) return []
    const isAudioExtension = [
      'mp3',
      'm4a',
      'aac',
      'flac',
      'ogg',
      'opus',
      'wav',
    ].includes(format.ext.toLowerCase())
    const hasVideo =
      (format.vcodec != null && format.vcodec !== 'none') ||
      (!isAudioExtension &&
        format.video_ext != null &&
        format.video_ext !== 'none') ||
      (format.vcodec == null &&
        format.video_ext == null &&
        ['mp4', 'webm', 'mov', 'mkv'].includes(format.ext.toLowerCase()))
    const hasAudio =
      (format.acodec != null && format.acodec !== 'none') ||
      (format.audio_ext != null && format.audio_ext !== 'none') ||
      isAudioExtension
    if (!hasVideo && !hasAudio) return []
    return [
      {
        id: format.format_id,
        extension: format.ext,
        mediaType: hasVideo ? ('video' as const) : ('audio' as const),
        quality: hasVideo
          ? format.height
            ? `${format.height}p`
            : ['sd', 'hd'].includes(format.format_id.toLowerCase())
              ? format.format_id.toUpperCase()
              : 'Original'
          : format.abr
            ? `${Math.round(format.abr)} kbps`
            : 'Original',
        codec: hasVideo ? (format.vcodec ?? null) : (format.acodec ?? null),
        fps: format.fps ?? null,
        bitrateKbps: format.abr ?? format.tbr ?? null,
        fileSize: format.filesize ?? format.filesize_approx ?? null,
        hasAudio,
      },
    ]
  })
  return {
    provider,
    sourceUrl,
    sourceMediaId: media.id ?? null,
    title: media.title ?? 'Mídia sem título',
    artist: media.artist ?? null,
    album: media.album ?? null,
    channel: media.channel ?? media.uploader ?? null,
    thumbnail: mediaThumbnail(media, provider) ?? items[0]?.thumbnail ?? null,
    durationMs: media.duration == null ? null : media.duration * 1000,
    isPlaylist: media.entries != null,
    items,
    formats,
  }
}

export class YtDlpProvider implements MediaProvider {
  constructor(
    readonly id: MediaProvider['id'],
    readonly name: string,
    private readonly runner: ProcessRunner,
    private readonly executable = process.env.ORBE_YT_DLP_PATH || 'yt-dlp',
    private readonly ffmpegPath: string | null = null,
    private readonly getCookieFile: () => string = () => '',
    private readonly getBrowser: () => string = () => 'none',
  ) {}

  private cookieArgs(): string[] {
    if (!['youtube', 'instagram', 'facebook', 'twitter'].includes(this.id))
      return []
    const file = this.getCookieFile()
    if (file && !existsSync(file))
      throw new AppError(
        'LOGIN_REQUIRED',
        'O arquivo cookies.txt configurado não foi encontrado. Escolha outro em Integrações.',
      )
    if (file) return ['--cookies', file]
    const browser = this.id === 'youtube' ? this.getBrowser() : 'none'
    return browser !== 'none' ? ['--cookies-from-browser', browser] : []
  }

  async canHandle(url: URL): Promise<boolean> {
    return this.id === 'generic'
      ? url.protocol === 'https:'
      : mediaSourceForHost(url.hostname) === this.id
  }

  async analyze(
    url: URL,
    options: { mode?: 'video' | 'playlist'; page?: number } = {},
  ): Promise<MediaAnalysis> {
    const pageSize = 25
    const page = options.page ?? 1
    const videoId =
      this.id === 'youtube'
        ? url.hostname === 'youtu.be'
          ? url.pathname.slice(1)
          : url.pathname === '/watch'
            ? url.searchParams.get('v')
            : null
        : null
    const listId = this.id === 'youtube' ? url.searchParams.get('list') : null
    const requestedPlaylist = options.mode === 'playlist' && !!listId
    const youtubeSingleVideo =
      !requestedPlaylist &&
      videoId != null &&
      /^[A-Za-z0-9_-]{11}$/.test(videoId)
    const singleVideo =
      ['instagram', 'facebook', 'twitter'].includes(this.id) ||
      youtubeSingleVideo
    const target = requestedPlaylist
      ? videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)
        ? new URL(
            `https://www.youtube.com/watch?v=${videoId}&list=${encodeURIComponent(listId)}`,
          )
        : new URL(
            `https://www.youtube.com/playlist?list=${encodeURIComponent(listId)}`,
          )
      : youtubeSingleVideo
        ? new URL(`https://www.youtube.com/watch?v=${videoId}`)
        : url
    const args = [
      '--dump-single-json',
      '--encoding',
      'utf-8',
      '--no-warnings',
      '--flat-playlist',
      ...this.cookieArgs(),
      ...(!singleVideo
        ? [
            '--playlist-start',
            String((page - 1) * pageSize + 1),
            '--playlist-end',
            String(page * pageSize + 1),
          ]
        : []),
      '--socket-timeout',
      '10',
      '--retries',
      '1',
      '--extractor-retries',
      '1',
      ...(singleVideo ? ['--no-playlist'] : []),
      ...(requestedPlaylist ? ['--yes-playlist'] : []),
      '--',
      target.href,
    ]
    let stdout: string
    try {
      ;({ stdout } = await this.runner.run(this.executable, args, {
        timeoutMs: singleVideo ? 45000 : 60000,
      }))
    } catch (error) {
      if (this.id === 'twitter') {
        try {
          return (await fetchTwitterFallback(target)).analysis
        } catch {
          /* Preserve the original yt-dlp error when both methods fail. */
        }
      }
      throw error
    }
    const raw: unknown = JSON.parse(stdout)
    const analysis = mapYtDlpAnalysis(raw, target.href, this.id)
    if (this.id === 'twitter' && analysis.formats.length === 0) {
      try {
        return (await fetchTwitterFallback(target)).analysis
      } catch { /* Keep the original result when the alternate source is unavailable. */ }
    }
    if (analysis.isPlaylist) {
      const entries = RawMediaSchema.parse(raw).entries ?? []
      analysis.items = analysis.items.slice(0, pageSize)
      analysis.nextPage =
        entries.length > pageSize && page < 200 ? page + 1 : null
    }
    const bestAudio = analysis.formats
      .filter((format) => format.mediaType === 'audio')
      .sort((a, b) => (b.bitrateKbps ?? 0) - (a.bitrateKbps ?? 0))[0]
    if (bestAudio && this.ffmpegPath && existsSync(this.ffmpegPath)) {
      for (const extension of ['mp3', 'm4a'] as const) {
        if (
          analysis.formats.some(
            (format) =>
              format.mediaType === 'audio' && format.extension === extension,
          )
        )
          continue
        analysis.formats.push({
          ...bestAudio,
          id: `convert-${extension}:${bestAudio.id}`,
          extension,
          quality: `Convertido da fonte ${bestAudio.quality}`,
          fileSize: null,
        })
      }
    }
    return analysis
  }

  async getFormats(url: URL): Promise<MediaFormat[]> {
    return (await this.analyze(url)).formats
  }

  async download(
    request: DownloadStartRequest,
    directory: string,
    events: DownloadEvents,
    signal: AbortSignal,
    preferences: DownloadPreferences = {
      namingTemplate: 'title',
      speedLimitKbps: 0,
    },
  ): Promise<string> {
    const conversion = /^(convert-mp3|convert-m4a):(.+)$/.exec(request.formatId)
    const isTwitterFallback =
      this.id === 'twitter' && request.formatId.startsWith('fx:')
    const fallback = isTwitterFallback
      ? await fetchTwitterFallback(new URL(request.url))
      : null
    const directUrl = fallback?.urls.get(request.formatId)
    if (isTwitterFallback && !directUrl)
      throw new Error(
        'A qualidade selecionada não está mais disponível. Analise o link novamente.',
      )
    const actualId = directUrl ? 'b[ext=mp4]' : (conversion?.[2] ?? request.formatId)
    const format =
      request.mediaType === 'video' && !request.hasAudio
        ? `${actualId}+bestaudio/best`
        : actualId
    const safeSegment = (value: string) =>
      value
        .replace(/[<>:"/\\|?*%]/g, '_')
        .replace(/\p{Cc}/gu, '_')
        .slice(0, 60)
        .trim()
    const outputName = directUrl
      ? preferences.namingTemplate === 'title-quality'
        ? `${safeSegment(request.title)} - ${safeSegment(request.quality)} [${safeSegment(fallback!.analysis.sourceMediaId ?? '')}].mp4`
        : preferences.namingTemplate === 'channel-title'
          ? `${safeSegment(request.channel ?? 'Autor')} - ${safeSegment(request.title)} [${safeSegment(fallback!.analysis.sourceMediaId ?? '')}].mp4`
          : `${safeSegment(request.title)} [${safeSegment(fallback!.analysis.sourceMediaId ?? '')}].mp4`
      : preferences.namingTemplate === 'title-quality'
        ? `%(title).110B - ${safeSegment(request.quality)} [%(id)s].%(ext)s`
        : preferences.namingTemplate === 'channel-title'
          ? `${safeSegment(request.channel ?? request.artist ?? 'Autor')} - %(title).110B [%(id)s].%(ext)s`
          : '%(title).150B [%(id)s].%(ext)s'
    const args = [
      '--encoding',
      'utf-8',
      '--no-warnings',
      '--newline',
      '--progress',
      '--no-simulate',
      '--progress-delta',
      '0.2',
      '--no-playlist',
      '--progress-template',
      'download:ORBE_PROGRESS:%(progress._percent_str)s:%(progress.downloaded_bytes)s:%(progress.total_bytes,progress.total_bytes_estimate)s:%(progress.speed)s:%(progress.eta)s',
      '--progress-template',
      'postprocess:ORBE_PROCESSING:%(progress.status)s',
      '--print',
      'after_move:ORBE_FILE:%(filepath)s',
      '-P',
      directory,
      '-o',
      outputName,
      '-f',
      format,
      ...(directUrl ? [] : this.cookieArgs()),
    ]
    if (preferences.speedLimitKbps > 0)
      args.push('--limit-rate', `${preferences.speedLimitKbps}K`)
    if (this.ffmpegPath && existsSync(this.ffmpegPath))
      args.push('--ffmpeg-location', this.ffmpegPath)
    if (conversion)
      args.push(
        '-x',
        '--audio-format',
        conversion[1] === 'convert-mp3' ? 'mp3' : 'm4a',
      )
    args.push('--', directUrl ?? request.url)
    let filePath = ''
    await this.runner.run(this.executable, args, {
      signal,
      onLine(line) {
        line = line.trim()
        if (line.startsWith('ORBE_PROCESSING:')) events.onProcessing?.()
        if (line.startsWith('ORBE_FILE:'))
          filePath = line.slice('ORBE_FILE:'.length).trim()
        if (!line.startsWith('ORBE_PROGRESS:')) return
        const [, percent, downloaded, total, speed, eta] = line.split(':')
        events.onProgress({
          percent: Number.parseFloat(percent ?? '0') || 0,
          downloadedBytes: Number.isFinite(Number(downloaded))
            ? Number(downloaded)
            : null,
          totalBytes: Number.isFinite(Number(total)) ? Number(total) : null,
          speedBytesPerSecond: Number.isFinite(Number(speed))
            ? Number(speed)
            : null,
          etaSeconds: Number.isFinite(Number(eta)) ? Number(eta) : null,
        })
      },
    })
    if (!filePath)
      throw new Error('O download terminou sem informar o arquivo gerado.')
    return filePath
  }
}
