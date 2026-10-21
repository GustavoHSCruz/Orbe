import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LibraryPage } from './LibraryPage'
import { useNavigation } from '../stores/navigation'
import type { LibraryRecord } from '../../shared/contracts/media'

const track: LibraryRecord = {
  id: 'one',
  provider: 'local',
  mediaType: 'audio',
  title: 'Entre ondas',
  artist: 'Artista de teste',
  album: null,
  thumbnail: null,
  durationMs: null,
  format: 'mp3',
  filePath: 'C:/music/entre-ondas.mp3',
  favorite: false,
  playCount: 0,
  createdAt: 1,
}

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <LibraryPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  useNavigation.setState({
    page: 'library',
    librarySearch: '',
    libraryFilter: 'all',
  })
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('shows a recoverable error instead of an empty collection when loading fails', async () => {
  const listLibrary = vi
    .fn()
    .mockRejectedValueOnce(new Error('disk busy'))
    .mockResolvedValue([])
  vi.stubGlobal('orbe', {
    listLibrary,
    listLocalPlaylists: vi.fn().mockResolvedValue([]),
  })
  mount()

  expect(
    await screen.findByText('Não foi possível carregar sua biblioteca.'),
  ).toBeVisible()
  expect(screen.queryByText('Sua coleção começa aqui')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  await waitFor(() => expect(listLibrary).toHaveBeenCalledTimes(2))
  expect(await screen.findByText('Sua coleção começa aqui')).toBeVisible()
})

it('keeps a selected filter while searching and offers a way to clear both', async () => {
  vi.stubGlobal('orbe', {
    listLibrary: vi.fn().mockResolvedValue([track]),
    listLocalPlaylists: vi.fn().mockResolvedValue([]),
  })
  useNavigation.setState({ libraryFilter: 'favorite', librarySearch: 'ondas' })
  mount()

  expect(
    await screen.findByText('Nenhum resultado para esta busca'),
  ).toBeVisible()
  expect(screen.getByRole('button', { name: 'Favoritos' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  useNavigation.getState().setLibrarySearch('Entre')
  expect(useNavigation.getState().libraryFilter).toBe('favorite')
  fireEvent.click(
    screen.getAllByRole('button', { name: 'Limpar busca e filtros' })[0]!,
  )
  expect(
    await screen.findByRole('heading', { name: 'Entre ondas' }),
  ).toBeVisible()
})
