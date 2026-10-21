import { afterEach, expect, test, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SettingsPage } from './SettingsPage'
import { SettingsSchema } from '../../shared/contracts/media'
import type { LibraryLocations } from '../../shared/contracts/library-locations'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('requires a folder decision and provides recovery only for files with recorded downloads', async () => {
  const settings = SettingsSchema.parse({
    downloadDirectory: 'C:/Old',
    concurrentDownloads: 2,
    theme: 'dark',
  })
  const item = {
    id: 'downloaded',
    provider: 'youtube' as const,
    mediaType: 'audio' as const,
    title: 'Minha música',
    artist: null,
    album: null,
    thumbnail: null,
    durationMs: null,
    format: 'mp3',
    filePath: 'C:/Old/song.mp3',
    favorite: true,
    playCount: 3,
    createdAt: 1,
  }
  const report: LibraryLocations = {
    directories: [
      { path: 'C:/Old', isDownloadDirectory: true, state: 'ready' },
    ],
    missing: [
      {
        item,
        directory: 'C:/Old',
        reason: 'missing',
        downloadId: 'source',
        downloadStatus: 'completed',
        canDownloadAgain: true,
      },
      {
        item: {
          ...item,
          id: 'imported',
          title: 'Vídeo importado',
          provider: 'local',
        },
        directory: 'C:/Old',
        reason: 'missing',
        downloadId: null,
        downloadStatus: null,
        canDownloadAgain: false,
      },
    ],
    scanning: false,
    lastScanAt: 1,
    imported: 0,
    relinked: 0,
    errors: [],
  }
  const saveSettings = vi.fn(async (value) => ({
    ...value,
    libraryDirectories: ['C:/Old'],
  }))
  const redownload = vi.fn().mockResolvedValue({ id: 'retry' })
  vi.stubGlobal('orbe', {
    getSettings: vi.fn().mockResolvedValue(settings),
    saveSettings,
    libraryLocations: vi.fn().mockResolvedValue(report),
    scanLibraryLocations: vi.fn().mockResolvedValue(report),
    chooseDownloadDirectory: vi.fn().mockResolvedValue('D:/New'),
    redownloadLibraryFile: redownload,
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <SettingsPage />
    </QueryClientProvider>,
  )
  await screen.findByText('Minha música')
  expect(
    screen.getAllByRole('button', { name: 'Baixar novamente' }),
  ).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Escolher' }))
  await screen.findByText('O que fazer com a pasta anterior?')
  expect(
    screen.getByRole('button', { name: 'Salvar alterações' }),
  ).toBeDisabled()
  fireEvent.click(
    screen.getByRole('radio', { name: /Continuar buscando na pasta anterior/ }),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  await waitFor(() =>
    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ downloadDirectory: 'D:/New' }),
      'keep',
    ),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Baixar novamente' }))
  await waitFor(() => expect(redownload).toHaveBeenCalledWith('downloaded'))
  expect(await screen.findByText(/Download adicionado à fila/)).toBeVisible()
})
