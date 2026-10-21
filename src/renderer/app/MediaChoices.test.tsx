import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { MediaAnalysis, MediaFormat } from '../../shared/contracts/media'
import { MediaChoices, hasYoutubePlaylistChoice } from './App'

const format: MediaFormat = {
  id: 'webm-720',
  extension: 'webm',
  mediaType: 'video',
  quality: '720p',
  codec: 'vp9',
  fps: 30,
  bitrateKbps: null,
  fileSize: null,
  hasAudio: true,
}
const urls = [1, 2, 3].map((number) => `https://example.com/video-${number}`)
const playlist: MediaAnalysis = {
  provider: 'generic',
  sourceUrl: 'https://example.com/playlist',
  sourceMediaId: 'playlist',
  title: 'Playlist autorizada',
  artist: null,
  album: null,
  channel: 'Autor',
  thumbnail: null,
  durationMs: null,
  isPlaylist: true,
  items: urls.map((url, index) => ({
    id: String(index),
    url,
    title: `Vídeo ${index + 1}`,
    thumbnail: null,
    durationMs: null,
  })),
  formats: [],
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('playlist selection', () => {
  it('keeps every row independently selectable, including repeated videos', () => {
    const repeated = {
      ...playlist,
      items: [
        ...playlist.items,
        { ...playlist.items[0]!, title: 'Repetição do vídeo 1' },
      ],
    }
    const client = new QueryClient()
    render(
      <QueryClientProvider client={client}>
        <MediaChoices analysis={repeated} />
      </QueryClientProvider>,
    )

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Repetição do vídeo 1' }),
    )
    expect(screen.getByRole('checkbox', { name: 'Vídeo 1' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(
      screen.getByRole('checkbox', { name: 'Repetição do vídeo 1' }),
    ).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('3 selecionados de 4 carregados')).toBeTruthy()
  })

  it('offers the choice only for a YouTube video with a playlist', () => {
    expect(
      hasYoutubePlaylistChoice(
        'https://www.youtube.com/watch?v=AxFhwtwiw6o&list=RDAxFhwtwiw6o',
      ),
    ).toBe(true)
    expect(
      hasYoutubePlaylistChoice('https://www.youtube.com/watch?v=AxFhwtwiw6o'),
    ).toBe(false)
    expect(
      hasYoutubePlaylistChoice('https://www.youtube.com/playlist?list=PL123'),
    ).toBe(false)
  })

  it('loads the next page and keeps loaded items selectable for download', async () => {
    const analyze = vi.fn(
      async (
        url: string,
        options?: { page?: number },
      ): Promise<MediaAnalysis> => {
        if (options?.page === 2)
          return {
            ...playlist,
            items: [
              {
                id: '4',
                url: 'https://example.com/video-4',
                title: 'Vídeo 4',
                thumbnail: null,
                durationMs: null,
              },
            ],
            nextPage: null,
          }
        return {
          ...playlist,
          sourceUrl: url,
          title: url.split('/').at(-1) ?? '',
          isPlaylist: false,
          items: [],
          formats: [format],
        }
      },
    )
    const startDownload = vi.fn().mockResolvedValue({ id: 'queued' })
    Object.defineProperty(window, 'orbe', {
      configurable: true,
      value: { analyze, startDownload },
    })
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    })
    render(
      <QueryClientProvider client={client}>
        <MediaChoices analysis={{ ...playlist, nextPage: 2 }} />
      </QueryClientProvider>,
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Carregar mais 25 itens' }),
    )
    await screen.findByLabelText('Vídeo 4')
    expect(analyze).toHaveBeenCalledWith(playlist.sourceUrl, {
      mode: 'playlist',
      page: 2,
    })
    expect(screen.getByText('4 selecionados de 4 carregados')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Próximo: formato' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Revisar download' }),
    )
    fireEvent.click(
      await screen.findByRole('button', { name: 'Baixar 4 itens' }),
    )
    await waitFor(() => expect(startDownload).toHaveBeenCalledTimes(4))
  })
  it('analyzes and queues only the selected entries', async () => {
    const analyze = vi.fn(async (url: string): Promise<MediaAnalysis> => ({
      ...playlist,
      sourceUrl: url,
      title: url.split('/').at(-1) ?? '',
      isPlaylist: false,
      items: [],
      formats: [format],
    }))
    const startDownload = vi.fn().mockResolvedValue({ id: 'queued' })
    Object.defineProperty(window, 'orbe', {
      configurable: true,
      value: { analyze, startDownload },
    })
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    })
    render(
      <QueryClientProvider client={client}>
        <MediaChoices analysis={playlist} />
      </QueryClientProvider>,
    )
    fireEvent.click(screen.getByLabelText('Vídeo 2'))
    fireEvent.click(screen.getByRole('button', { name: 'Próximo: formato' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Revisar download' }),
    )
    fireEvent.click(
      await screen.findByRole('button', { name: 'Baixar 2 itens' }),
    )
    await waitFor(() => expect(startDownload).toHaveBeenCalledTimes(2))
    expect(analyze).toHaveBeenNthCalledWith(1, urls[0])
    expect(analyze).toHaveBeenNthCalledWith(2, urls[2])
    expect(startDownload.mock.calls.map(([request]) => request.url)).toEqual([
      urls[0],
      urls[2],
    ])
  })

  it('uses an individual format for each playlist item', async () => {
    const secondFormat: MediaFormat = {
      ...format,
      id: 'mp4-480',
      extension: 'mp4',
      quality: '480p',
    }
    const analyze = vi.fn(async (url: string): Promise<MediaAnalysis> => ({
      ...playlist,
      sourceUrl: url,
      title: url.split('/').at(-1) ?? '',
      isPlaylist: false,
      items: [],
      formats: [format, secondFormat],
    }))
    const startDownload = vi.fn().mockResolvedValue({ id: 'queued' })
    Object.defineProperty(window, 'orbe', {
      configurable: true,
      value: { analyze, startDownload },
    })
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    })
    render(
      <QueryClientProvider client={client}>
        <MediaChoices analysis={playlist} />
      </QueryClientProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Próximo: formato' }))
    fireEvent.click(
      screen.getByRole('button', { name: /Personalizar cada item/ }),
    )
    const thirdFormat = await screen.findByLabelText('Formato de video-3')
    fireEvent.change(thirdFormat, { target: { value: 'webm-720' } })
    fireEvent.click(screen.getByRole('button', { name: 'Revisar download' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Baixar 3 itens' }),
    )
    await waitFor(() => expect(startDownload).toHaveBeenCalledTimes(3))
    expect(
      startDownload.mock.calls.map(([request]) => request.formatId),
    ).toEqual(['mp4-480', 'mp4-480', 'webm-720'])
  })

  it('applies the saved audio format to playlist items with different bitrates', async () => {
    const analyze = vi.fn(async (url: string): Promise<MediaAnalysis> => ({
      ...playlist,
      sourceUrl: url,
      title: url.split('/').at(-1) ?? '',
      isPlaylist: false,
      items: [],
      formats: [
        {
          ...format,
          id: `mp3-${url.split('-').at(-1)}`,
          mediaType: 'audio',
          extension: 'mp3',
          quality: url.endsWith('1') ? '128k' : '192k',
          bitrateKbps: url.endsWith('1') ? 128 : 192,
        },
      ],
    }))
    const startDownload = vi.fn().mockResolvedValue({ id: 'queued' })
    Object.defineProperty(window, 'orbe', {
      configurable: true,
      value: {
        analyze,
        startDownload,
        getSettings: vi
          .fn()
          .mockResolvedValue({
            preferredDownload: {
              kind: 'audio',
              videoExtension: 'mp4',
              videoQuality: 'best',
              audioExtension: 'mp3',
            },
          }),
      },
    })
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    })
    render(
      <QueryClientProvider client={client}>
        <MediaChoices analysis={playlist} />
      </QueryClientProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Próximo: formato' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Áudio' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
    fireEvent.click(
      await screen.findByRole('button', { name: 'Revisar download' }),
    )
    fireEvent.click(
      await screen.findByRole('button', { name: 'Baixar 3 itens' }),
    )
    await waitFor(() => expect(startDownload).toHaveBeenCalledTimes(3))
    expect(
      startDownload.mock.calls.map(([request]) => request.formatId),
    ).toEqual(['mp3-1', 'mp3-2', 'mp3-3'])
  })
})
