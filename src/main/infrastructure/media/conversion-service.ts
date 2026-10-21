import { randomUUID } from 'node:crypto'
import { stat, mkdir, rename, unlink } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import type {
  ConversionFormat,
  ConversionResult,
  ConversionSource,
} from '../../../shared/contracts/converter'
import type { ProcessRunner } from '../../domain/media-provider'

type Probe = {
  format?: { duration?: string }
  streams?: { codec_type?: string }[]
}
const audioFormats = new Set<ConversionFormat>([
  'mp3',
  'm4a',
  'opus',
  'flac',
  'wav',
])

export class ConversionService {
  constructor(
    private readonly ffmpeg: string,
    private readonly ffprobe: string,
    private readonly runner: ProcessRunner,
  ) {}

  async inspect(filePath: string): Promise<ConversionSource> {
    const file = await stat(filePath)
    if (!file.isFile()) throw new Error('Selecione um arquivo de mídia válido.')
    let probe: Probe
    try {
      const { stdout } = await this.runner.run(
        this.ffprobe,
        [
          '-v',
          'error',
          '-show_entries',
          'format=duration:stream=codec_type',
          '-of',
          'json',
          filePath,
        ],
        { timeoutMs: 30000 },
      )
      probe = JSON.parse(stdout) as Probe
    } catch {
      throw new Error(
        'Não foi possível abrir esta mídia. Arquivos M4P protegidos por DRM não podem ser convertidos; use uma cópia sem proteção.',
      )
    }
    const hasAudio =
      probe.streams?.some((stream) => stream.codec_type === 'audio') ?? false
    const hasVideo =
      probe.streams?.some((stream) => stream.codec_type === 'video') ?? false
    if (!hasAudio && !hasVideo)
      throw new Error('O arquivo não contém áudio ou vídeo compatível.')
    const seconds = Number(probe.format?.duration)
    return {
      id: randomUUID(),
      name: basename(filePath),
      extension: extname(filePath).slice(1).toLowerCase(),
      sizeBytes: file.size,
      durationMs:
        Number.isFinite(seconds) && seconds > 0
          ? Math.round(seconds * 1000)
          : null,
      hasAudio,
      hasVideo,
    }
  }

  async convert(
    filePath: string,
    source: ConversionSource,
    format: ConversionFormat,
    directory: string,
    onProgress: (percent: number) => void,
    signal: AbortSignal,
  ): Promise<ConversionResult> {
    const audio = audioFormats.has(format)
    if (audio && !source.hasAudio)
      throw new Error('Este arquivo não contém áudio para extrair.')
    if (!audio && !source.hasVideo)
      throw new Error('Este arquivo não contém vídeo para converter.')
    await mkdir(directory, { recursive: true })
    const stem =
      basename(filePath, extname(filePath))
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\p{Cc}/gu, '_')
        .trim() || 'Mídia'
    let output = join(directory, `${stem} - convertido.${format}`)
    for (
      let index = 2;
      await stat(output).then(
        () => true,
        () => false,
      );
      index++
    )
      output = join(directory, `${stem} - convertido ${index}.${format}`)
    const temporary = join(directory, `.orbe-${randomUUID()}.${format}`)
    const args = [
      '-hide_banner',
      '-nostdin',
      '-loglevel',
      'error',
      '-progress',
      'pipe:1',
      '-i',
      filePath,
    ]
    if (audio) {
      args.push('-map', '0:a:0', '-vn')
      if (format === 'mp3') args.push('-c:a', 'libmp3lame', '-b:a', '192k')
      if (format === 'm4a') args.push('-c:a', 'aac', '-b:a', '192k')
      if (format === 'opus') args.push('-c:a', 'libopus', '-b:a', '160k')
      if (format === 'flac') args.push('-c:a', 'flac')
      if (format === 'wav') args.push('-c:a', 'pcm_s16le')
    } else {
      args.push('-map', '0:v:0', '-map', '0:a:0?')
      if (format === 'mp4')
        args.push(
          '-c:v',
          'libx264',
          '-preset',
          'medium',
          '-crf',
          '23',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          '-movflags',
          '+faststart',
        )
      if (format === 'webm')
        args.push(
          '-c:v',
          'libvpx-vp9',
          '-deadline',
          'good',
          '-cpu-used',
          '3',
          '-b:v',
          '0',
          '-crf',
          '32',
          '-c:a',
          'libopus',
          '-b:a',
          '128k',
        )
    }
    args.push('-n', temporary)
    try {
      await this.runner.run(this.ffmpeg, args, {
        signal,
        onLine: (line) => {
          if (!line.startsWith('out_time=')) return
          const match = /^(\d+):(\d+):(\d+(?:\.\d+)?)$/.exec(line.slice(9))
          if (!match || !source.durationMs) return
          const elapsed =
            (Number(match[1]) * 3600 +
              Number(match[2]) * 60 +
              Number(match[3])) *
            1000
          onProgress(
            Math.min(
              99,
              Math.max(0, Math.round((elapsed / source.durationMs) * 100)),
            ),
          )
        },
      })
      await rename(temporary, output)
      onProgress(100)
      return { name: basename(output), path: output, format }
    } catch (cause) {
      await unlink(temporary).catch(() => {})
      if (signal.aborted) throw new Error('Conversão cancelada.')
      const message = cause instanceof Error ? cause.message : ''
      if (
        source.extension === 'm4p' &&
        /drm|decrypt|invalid data|could not|error/i.test(message)
      )
        throw new Error(
          'Este M4P pode estar protegido por DRM e não pode ser convertido. Use uma versão sem proteção.',
        )
      throw cause
    }
  }
}
