import { afterEach, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LyricsSearch } from './LyricsSearch'

afterEach(cleanup)
it('retries the same search without artist, displays errors and lets the user select a version', async () => {
  const result = {
    source: 'lrclib',
    trackName: 'Ocean',
    artistName: 'Artist',
    duration: 180,
    syncedLyrics: '[00:00]Hello',
    plainLyrics: null,
  }
  const search = vi
    .fn()
    .mockRejectedValueOnce(new Error('Sem conexão'))
    .mockResolvedValue([result])
  Object.defineProperty(window, 'orbe', {
    configurable: true,
    value: { searchLyricsCandidates: search },
  })
  const select = vi.fn()
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      <LyricsSearch
        title="Ocean"
        artist=""
        duration={180}
        onSelect={select}
        onReset={vi.fn()}
      />
    </QueryClientProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão')
  fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }))
  fireEvent.click(await screen.findByRole('button', { name: /Ocean.*Artist/ }))
  expect(select).toHaveBeenCalledWith(result)
  await waitFor(() => expect(search).toHaveBeenCalledTimes(2))
  expect(search).toHaveBeenLastCalledWith({
    title: 'Ocean',
    artist: '',
    durationMs: 180000,
  })
})
