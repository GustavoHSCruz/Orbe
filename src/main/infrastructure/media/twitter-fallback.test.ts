import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  DownloadStartRequest,
  MediaAnalysis,
} from '../../../shared/contracts/media'
import type { ProcessRunner } from '../../domain/media-provider'
import { fetchTwitterFallback } from './twitter-fallback'
import { YtDlpProvider } from './yt-dlp-provider'

const source = 'https://x.com/XPornHub66x/status/2108165523142017247/video/1'
const mediaUrl =
  'https://video.twimg.com/amplify_video/2066861293018206208/vid/avc1/640x360/video.mp4?tag=28'
const apiResponse = {
  code: 200,
  status: {
    id: '2108165523142017247',
    text: '',
    author: { screen_name: 'Example' },
    media: {
      videos: [
        {
          id: '2066861293018206208',
          thumbnail_url: 'https://pbs.twimg.com/cover.jpg',
          duration: 42.5,
          formats: [
            { container: 'm3u8', url: 'https://video.twimg.com/playlist.m3u8' },
            { container: 'mp4', url: mediaUrl, bitrate: 832000, codec: 'h264' },
            { container: 'mp4', url: 'https://evil.example/video.mp4' },
          ],
        },
      ],
    },
  },
}

afterEach(() => vi.unstubAllGlobals())

describe('X fallback', () => {
  it('maps only MP4 files from the X video CDN', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue({
        ok: true,
        json: async () => apiResponse,
      } as Response)
    const result = await fetchTwitterFallback(new URL(source), fetcher)
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      'https://api.fxtwitter.com/2/status/2108165523142017247',
    )
    expect(result.analysis).toMatchObject({
      provider: 'twitter',
      sourceUrl: source,
      title: 'Vídeo de @Example',
      durationMs: 42500,
      formats: [
        {
          id: 'fx:2066861293018206208:1',
          quality: '360p',
          bitrateKbps: 832,
        },
      ],
    })
    expect([...result.urls.values()]).toEqual([mediaUrl])
  })

  it('uses the fallback when yt-dlp cannot analyze a post and downloads the chosen MP4', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => apiResponse,
        } as Response),
    )
    const run = vi
      .fn<ProcessRunner['run']>()
      .mockImplementation(async (_command, args, options) => {
        if (args.includes('--dump-single-json'))
          throw new Error('No video could be found')
        options?.onLine?.('ORBE_FILE:C:\\Downloads\\video.mp4')
        return { stdout: '', stderr: '' }
      })
    const provider = new YtDlpProvider('twitter', 'X', { run }, 'yt-dlp')
    const analysis: MediaAnalysis = await provider.analyze(new URL(source))
    expect(analysis.formats).toHaveLength(1)
    const format = analysis.formats[0]!
    const request: DownloadStartRequest = {
      url: source,
      title: analysis.title,
      provider: 'twitter',
      mediaType: 'video',
      formatId: format.id,
      extension: format.extension,
      hasAudio: format.hasAudio,
      quality: format.quality,
      thumbnail: analysis.thumbnail,
      artist: null,
      channel: analysis.channel,
      durationMs: analysis.durationMs,
    }
    await provider.download(
      request,
      'C:\\Downloads',
      { onProgress: () => undefined },
      new AbortController().signal,
    )
    const args = run.mock.calls[1]![1]
    expect(args.slice(-2)).toEqual(['--', mediaUrl])
    expect(args).toEqual(expect.arrayContaining(['-f', 'b[ext=mp4]']))
    expect(args[args.indexOf('-o') + 1]).toContain('Vídeo de @Example')
    expect(args).not.toContain('--cookies')
  })

  it('rejects a response for another post', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          ...apiResponse,
          status: { ...apiResponse.status, id: '123' },
        }),
      } as Response)
    await expect(
      fetchTwitterFallback(new URL(source), fetcher),
    ).rejects.toThrow('post solicitado')
  })
})
