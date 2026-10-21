import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PlaylistImport } from '../../shared/contracts/playlist-import'
import { PlaylistImportPanel } from './PlaylistImportPanel'
import { useNavigation } from '../stores/navigation'

const candidate = {
  id: 'abcdefghijk',
  url: 'https://www.youtube.com/watch?v=abcdefghijk',
  title: 'Uma música · vídeo oficial',
  channel: 'Artista',
  durationMs: 183000,
  score: 0.8,
}
let playlist: PlaylistImport
let client: QueryClient
const startDownloads = vi.fn()

beforeEach(() => {
  startDownloads.mockReset().mockResolvedValue(undefined)
  playlist = {
    id: 'playlist',
    name: 'Minha seleção',
    sourceUrl: 'https://open.spotify.com/playlist/example',
    origin: 'public',
    expectedCount: 1,
    complete: true,
    matching: false,
    downloading: false,
    localPlaylistId: null,
    createdAt: 1,
    updatedAt: 1,
    items: [
      {
        id: 'track',
        position: 0,
        spotifyId: 'spotify',
        title: 'Uma música',
        artist: 'Artista',
        durationMs: 183000,
        matchStatus: 'review',
        candidates: [candidate],
        youtubeUrl: null,
        downloadId: null,
        downloadStatus: null,
        errorMessage: null,
      },
    ],
  }
  vi.stubGlobal('orbe', {
    listPlaylistImports: vi.fn(async () => structuredClone([playlist])),
    choosePlaylistMatch: vi.fn(async (_id: string, url: string | null) => {
      playlist.items[0]!.matchStatus = url ? 'matched' : 'skipped'
      playlist.items[0]!.youtubeUrl = url
    }),
    startPlaylistDownloads: startDownloads,
    startPlaylistMatching: vi.fn(async () => {
      playlist.matching = true
    }),
    retryPlaylistSource: vi.fn().mockResolvedValue(undefined),
    searchPlaylistItem: vi.fn().mockResolvedValue([]),
  })
  useNavigation.setState({ page: 'spotify' })
})

afterEach(() => {
  cleanup()
  client?.clear()
  vi.unstubAllGlobals()
})

function mount() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <PlaylistImportPanel />
    </QueryClientProvider>,
  )
}

it('requires choosing a version before offering downloads and sends the selected playlist', async () => {
  mount()
  await screen.findByRole('button', { name: 'Conferir 1 música' })
  expect(screen.queryByRole('button', { name: /Baixar/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Usar este vídeo' }))
  fireEvent.click(
    await screen.findByRole('button', { name: 'Baixar 1 música' }),
  )
  await waitFor(() => expect(startDownloads).toHaveBeenCalledWith('playlist'))
})

it('allows skipping and restoring a song without an empty download', async () => {
  mount()
  fireEvent.click(
    await screen.findByRole('button', { name: 'Pular esta música' }),
  )
  await screen.findByText('Nenhuma música selecionada para baixar')
  expect(screen.queryByRole('button', { name: /Baixar/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Escolher vídeo' }))
  fireEvent.click(screen.getByRole('button', { name: 'Usar este vídeo' }))
  expect(
    await screen.findByRole('button', { name: 'Baixar 1 música' }),
  ).toBeEnabled()
})

it('blocks downloading during a video change and lets the user cancel', async () => {
  playlist.items[0]!.matchStatus = 'matched'
  playlist.items[0]!.youtubeUrl = candidate.url
  mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Trocar vídeo' }))
  expect(screen.getByRole('button', { name: 'Baixar 1 música' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar alteração' }))
  expect(screen.getByRole('button', { name: 'Baixar 1 música' })).toBeEnabled()
})

it('keeps source recovery accessible and hides search until the list is complete', async () => {
  playlist.complete = false
  playlist.expectedCount = 2
  mount()
  await screen.findByText('Vamos completar a lista de músicas')
  expect(
    screen.queryByRole('button', { name: 'Buscar versões no YouTube' }),
  ).toBeNull()
  fireEvent.click(screen.getByText('A lista parou de carregar?'))
  fireEvent.click(
    screen.getByRole('button', { name: 'Ler playlist novamente' }),
  )
  await waitFor(() =>
    expect(window.orbe.retryPlaylistSource).toHaveBeenCalledWith('playlist'),
  )
})

it('routes active downloads to the queue even after preparation has ended', async () => {
  playlist.items[0]!.matchStatus = 'matched'
  playlist.items[0]!.downloadStatus = 'downloading'
  playlist.items[0]!.downloadId = 'download'
  mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Ver downloads' }))
  expect(useNavigation.getState().page).toBe('downloads')
  expect(screen.queryByRole('button', { name: /Baixar/ })).toBeNull()
})

it('offers the library only when all selected songs have finished downloading', async () => {
  playlist.items[0]!.matchStatus = 'matched'
  playlist.items[0]!.downloadStatus = 'completed'
  playlist.items[0]!.downloadId = 'download'
  playlist.localPlaylistId = 'local'
  mount()
  fireEvent.click(
    await screen.findByRole('button', { name: 'Ir para Suas playlists' }),
  )
  expect(useNavigation.getState().page).toBe('playlists')
})

it('uses a pasted YouTube link as a choice rather than a search', async () => {
  mount()
  fireEvent.change(await screen.findByLabelText('Outra versão de Uma música'), {
    target: { value: candidate.url },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Usar este link' }))
  await waitFor(() =>
    expect(window.orbe.choosePlaylistMatch).toHaveBeenCalledWith(
      'track',
      candidate.url,
    ),
  )
  expect(window.orbe.searchPlaylistItem).not.toHaveBeenCalled()
})
