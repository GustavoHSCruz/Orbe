import { describe, expect, it, vi } from 'vitest'
import type { ProcessRunner } from '../../domain/media-provider'
import type { DownloadStartRequest } from '../../../shared/contracts/media'
import { YtDlpProvider, mapYtDlpAnalysis } from './yt-dlp-provider'
import { MediaProviderRegistry } from './provider-registry'
import { join } from 'node:path'

describe('provider media mapping', () => {
  it.each([
    ['instagram', 'https://www.instagram.com/reel/Chunk8-jurw/'],
    ['facebook', 'https://www.facebook.com/reel/1195289147628387'],
    ['twitter', 'https://x.com/NASAArtemis/status/2040619776100147411'],
  ] as const)(
    'routes and analyzes a %s video without requesting a playlist',
    async (id, url) => {
      const run = vi.fn<ProcessRunner['run']>().mockResolvedValue({
        stdout: JSON.stringify({
          id: 'media-1',
          title: 'Social video',
          thumbnail: 'https://cdn.example.test/cover.jpg',
          formats: [
            {
              format_id: 'hd',
              ext: 'mp4',
              video_ext: 'mp4',
              audio_ext: 'none',
            },
            { format_id: 'audio', ext: 'm4a', vcodec: 'none', acodec: 'aac' },
          ],
        }),
        stderr: '',
      })
      const cookies = join(process.cwd(), 'package.json')
      const providers = (
        [
          'youtube',
          'soundcloud',
          'instagram',
          'facebook',
          'twitter',
          'generic',
        ] as const
      ).map(
        (providerId) =>
          new YtDlpProvider(
            providerId,
            providerId,
            { run },
            'yt-dlp',
            null,
            () => cookies,
          ),
      )
      const selected = await new MediaProviderRegistry(providers).resolve(url)
      const analysis = await selected.provider.analyze(selected.url)
      expect(selected.provider.id).toBe(id)
      expect(analysis).toMatchObject({
        provider: id,
        sourceUrl: url,
        thumbnail: 'https://cdn.example.test/cover.jpg',
      })
      expect(analysis.formats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'hd',
            mediaType: 'video',
            quality: 'HD',
          }),
          expect.objectContaining({ id: 'audio', mediaType: 'audio' }),
        ]),
      )
      const args = run.mock.calls[0]?.[1] ?? []
      expect(args).toContain('--no-playlist')
      expect(
        args.slice(args.indexOf('--encoding'), args.indexOf('--encoding') + 2),
      ).toEqual(['--encoding', 'utf-8'])
      expect(args).toContain('--cookies')
      expect(args[args.indexOf('--cookies') + 1]).toBe(cookies)
      expect(args.at(-1)).toBe(url)
    },
  )

  it('passes the selected cookies file to a social download', async () => {
    const run = vi
      .fn<ProcessRunner['run']>()
      .mockImplementation(async (_command, _args, options) => {
        options?.onLine?.('ORBE_FILE:C:\\Downloads\\social.mp4')
        return { stdout: '', stderr: '' }
      })
    const cookies = join(process.cwd(), 'package.json')
    const provider = new YtDlpProvider(
      'instagram',
      'Instagram',
      { run },
      'yt-dlp',
      null,
      () => cookies,
    )
    const request: DownloadStartRequest = {
      url: 'https://www.instagram.com/reel/Chunk8-jurw/',
      title: 'Social video',
      provider: 'instagram',
      mediaType: 'video',
      formatId: 'hd',
      extension: 'mp4',
      hasAudio: true,
      quality: 'HD',
      thumbnail: null,
      artist: null,
      channel: null,
      durationMs: null,
    }
    await provider.download(
      request,
      'C:\\Downloads',
      { onProgress: () => undefined },
      new AbortController().signal,
    )
    const args = run.mock.calls[0]?.[1] ?? []
    expect(
      args.slice(args.indexOf('--cookies'), args.indexOf('--cookies') + 2),
    ).toEqual(['--cookies', cookies])
    expect(
      args.slice(args.indexOf('--encoding'), args.indexOf('--encoding') + 2),
    ).toEqual(['--encoding', 'utf-8'])
    expect(args.at(-1)).toBe(request.url)
  })

  it('uses the configured browser for YouTube analysis and downloads', async () => {
    const run = vi
      .fn<ProcessRunner['run']>()
      .mockImplementation(async (_command, args, options) => {
        if (args.includes('--dump-single-json'))
          return { stdout: JSON.stringify({ title: 'Video' }), stderr: '' }
        options?.onLine?.('ORBE_FILE:C:\\Downloads\\video.mp4')
        return { stdout: '', stderr: '' }
      })
    const provider = new YtDlpProvider(
      'youtube',
      'YouTube',
      { run },
      'yt-dlp',
      null,
      () => '',
      () => 'edge',
    )
    await provider.analyze(
      new URL('https://www.youtube.com/watch?v=AxFhwtwiw6o'),
    )
    await provider.download(
      {
        url: 'https://www.youtube.com/watch?v=AxFhwtwiw6o',
        title: 'Video',
        provider: 'youtube',
        mediaType: 'video',
        formatId: 'best',
        extension: 'mp4',
        hasAudio: true,
        quality: 'Original',
        thumbnail: null,
        artist: null,
        channel: null,
        durationMs: null,
      },
      'C:\\Downloads',
      { onProgress: () => undefined },
      new AbortController().signal,
    )
    for (const call of run.mock.calls)
      expect(call[1]).toEqual(
        expect.arrayContaining(['--cookies-from-browser', 'edge']),
      )
  })

  it('keeps only actual formats and normalizes metadata', () => {
    const analysis = mapYtDlpAnalysis(
      {
        id: '123',
        title: 'Example',
        channel: 'Creator',
        duration: 120,
        formats: [
          {
            format_id: 'a1',
            ext: 'm4a',
            acodec: 'aac',
            vcodec: 'none',
            abr: 128,
          },
          {
            format_id: 'v1',
            ext: 'mp4',
            acodec: 'aac',
            vcodec: 'h264',
            height: 720,
          },
        ],
      },
      'https://example.com/media',
      'generic',
    )
    expect(analysis.formats.map((item) => item.id)).toEqual(['a1', 'v1'])
    expect(analysis.durationMs).toBe(120000)
  })

  it('passes the URL as an argument after option terminator', async () => {
    const run = vi.fn<ProcessRunner['run']>().mockResolvedValue({
      stdout: JSON.stringify({ title: 'Test' }),
      stderr: '',
    })
    const provider = new YtDlpProvider('generic', 'Generic', { run }, 'yt-dlp')
    await provider.analyze(new URL('https://example.com/media?x=1'))
    expect(run.mock.calls[0]?.[1]?.slice(-2)).toEqual([
      '--',
      'https://example.com/media?x=1',
    ])
  })

  it('analyzes a YouTube watch link with radio parameters as one video', async () => {
    const run = vi.fn<ProcessRunner['run']>().mockResolvedValue({
      stdout: JSON.stringify({
        id: 'AxFhwtwiw6o',
        title: 'Video',
        formats: [
          { format_id: 'a1', ext: 'm4a', acodec: 'aac', vcodec: 'none' },
        ],
      }),
      stderr: '',
    })
    const provider = new YtDlpProvider('youtube', 'YouTube', { run }, 'yt-dlp')
    const analysis = await provider.analyze(
      new URL('https://www.youtube.com/watch?v=AxFhwtwiw6o&list=RDAxFhwtwiw6o'),
    )
    const [, args, options] = run.mock.calls[0]!
    expect(args).toContain('--no-playlist')
    expect(args).toContain('--flat-playlist')
    expect(args.at(-1)).toBe('https://www.youtube.com/watch?v=AxFhwtwiw6o')
    expect(options?.timeoutMs).toBe(45000)
    expect(analysis.isPlaylist).toBe(false)
    expect(analysis.sourceUrl).toBe(
      'https://www.youtube.com/watch?v=AxFhwtwiw6o',
    )
  })

  it('keeps explicit playlists and maps their flat video entries', async () => {
    const run = vi.fn<ProcessRunner['run']>().mockResolvedValue({
      stdout: JSON.stringify({
        title: 'Playlist',
        entries: [{ id: 'AxFhwtwiw6o', title: 'Video' }],
      }),
      stderr: '',
    })
    const provider = new YtDlpProvider('youtube', 'YouTube', { run }, 'yt-dlp')
    const analysis = await provider.analyze(
      new URL('https://www.youtube.com/playlist?list=PL123'),
    )
    const [, args, options] = run.mock.calls[0]!
    expect(args).not.toContain('--no-playlist')
    expect(args).not.toContain('--yes-playlist')
    expect(args).toContain('--flat-playlist')
    expect(options?.timeoutMs).toBe(60000)
    expect(analysis.isPlaylist).toBe(true)
    expect(analysis.items[0]?.url).toBe(
      'https://www.youtube.com/watch?v=AxFhwtwiw6o',
    )
  })

  it('uses playlist entry covers when yt-dlp only provides a thumbnails array', () => {
    const analysis = mapYtDlpAnalysis(
      {
        title: 'Mix',
        entries: [
          {
            id: 'AxFhwtwiw6o',
            title: 'Video',
            thumbnails: [
              {
                url: 'https://i.ytimg.com/vi/AxFhwtwiw6o/small.jpg',
                width: 120,
                height: 90,
              },
              {
                url: 'https://i.ytimg.com/vi/AxFhwtwiw6o/large.jpg',
                width: 480,
                height: 360,
              },
            ],
          },
        ],
      },
      'https://www.youtube.com/watch?v=AxFhwtwiw6o&list=RDAxFhwtwiw6o',
      'youtube',
    )
    expect(analysis.items[0]?.thumbnail).toBe(
      'https://i.ytimg.com/vi/AxFhwtwiw6o/large.jpg',
    )
    expect(analysis.thumbnail).toBe(analysis.items[0]?.thumbnail)
  })

  it('uses a radio watch link as a paginated playlist when requested', async () => {
    const entries = Array.from({ length: 26 }, (_, index) => ({
      id: `video${String(index).padStart(6, '0')}`,
      title: `Video ${index + 1}`,
    }))
    const run = vi.fn<ProcessRunner['run']>().mockResolvedValue({
      stdout: JSON.stringify({ title: 'Radio', entries }),
      stderr: '',
    })
    const provider = new YtDlpProvider('youtube', 'YouTube', { run }, 'yt-dlp')
    const analysis = await provider.analyze(
      new URL('https://www.youtube.com/watch?v=AxFhwtwiw6o&list=RDAxFhwtwiw6o'),
      { mode: 'playlist', page: 2 },
    )
    const args = run.mock.calls[0]?.[1] ?? []
    expect(args).not.toContain('--no-playlist')
    expect(args).toContain('--yes-playlist')
    expect(
      args.slice(
        args.indexOf('--playlist-start'),
        args.indexOf('--playlist-start') + 2,
      ),
    ).toEqual(['--playlist-start', '26'])
    expect(
      args.slice(
        args.indexOf('--playlist-end'),
        args.indexOf('--playlist-end') + 2,
      ),
    ).toEqual(['--playlist-end', '51'])
    expect(args.at(-1)).toBe(
      'https://www.youtube.com/watch?v=AxFhwtwiw6o&list=RDAxFhwtwiw6o',
    )
    expect(analysis.sourceUrl).toBe(
      'https://www.youtube.com/watch?v=AxFhwtwiw6o&list=RDAxFhwtwiw6o',
    )
    expect(analysis.items).toHaveLength(25)
    expect(analysis.nextPage).toBe(3)
  })

  it('recognizes direct audio files whose codec is not reported by the engine', () => {
    const analysis = mapYtDlpAnalysis(
      {
        title: 'Direct audio',
        formats: [{ format_id: 'ogg', ext: 'ogg', vcodec: null }],
      },
      'https://example.com/tone.ogg',
      'generic',
    )
    expect(analysis.formats[0]).toMatchObject({
      mediaType: 'audio',
      hasAudio: true,
      extension: 'ogg',
    })
  })

  it('passes the speed limit and sanitized naming template as separate process arguments', async () => {
    const run = vi
      .fn<ProcessRunner['run']>()
      .mockImplementation(async (...args) => {
        args[2]?.onLine?.('ORBE_FILE:C:\\Downloads\\tone.mp3')
        return { stdout: '', stderr: '' }
      })
    const provider = new YtDlpProvider('generic', 'Generic', { run }, 'yt-dlp')
    const request: DownloadStartRequest = {
      url: 'https://example.com/tone',
      title: 'Tone',
      provider: 'generic',
      mediaType: 'audio',
      formatId: 'audio-1',
      extension: 'mp3',
      hasAudio: true,
      quality: '192 kbps',
      thumbnail: null,
      artist: null,
      channel: 'Artist/Name',
      durationMs: null,
    }
    const result = await provider.download(
      request,
      'C:\\Downloads',
      { onProgress: () => undefined },
      new AbortController().signal,
      { namingTemplate: 'channel-title', speedLimitKbps: 512 },
    )
    const args = run.mock.calls[0]?.[1] ?? []
    expect(
      args.slice(
        args.indexOf('--limit-rate'),
        args.indexOf('--limit-rate') + 2,
      ),
    ).toEqual(['--limit-rate', '512K'])
    expect(args[args.indexOf('-o') + 1]).toContain('Artist_Name')
    expect(args.at(-1)).toBe(request.url)
    expect(result).toBe('C:\\Downloads\\tone.mp3')
  })
})
