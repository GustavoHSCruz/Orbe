import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { DownloadRecord } from '../../shared/contracts/media'
import { DownloadList } from './DownloadList'
import { DownloadActivity } from './DownloadActivity'

const base: DownloadRecord = {
  id: 'd70ec661-b995-47b6-9328-41eb8f865c85',
  provider: 'youtube',
  sourceUrl: 'https://youtube.com/watch?v=example',
  title: 'Vídeo de teste',
  artist: null,
  channel: null,
  thumbnail: null,
  durationMs: null,
  mediaType: 'video',
  format: 'mp4',
  quality: '720p',
  fileSize: 1024,
  filePath: null,
  status: 'completed',
  progress: 100,
  downloadedBytes: 1024,
  speedBytesPerSecond: null,
  etaSeconds: null,
  createdAt: Date.now(),
  completedAt: Date.now(),
  errorMessage: null,
}

afterEach(cleanup)

describe('DownloadList', () => {
  it('updates real progress, shows indeterminate processing and announces only new completions', async () => {
    const active = {
      ...base,
      status: 'downloading' as const,
      progress: 24,
      completedAt: null,
    }
    Object.defineProperty(window, 'orbe', {
      configurable: true,
      value: { listDownloads: vi.fn().mockResolvedValue([active]) },
    })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    })
    client.setQueryData(['downloads'], [active])
    render(
      <QueryClientProvider client={client}>
        <DownloadActivity />
        <DownloadList />
      </QueryClientProvider>,
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '24',
    )
    act(() => client.setQueryData(['downloads'], [{ ...active, progress: 67 }]))
    await waitFor(() =>
      expect(screen.getByRole('progressbar')).toHaveAttribute(
        'aria-valuenow',
        '67',
      ),
    )
    act(() =>
      client.setQueryData(
        ['downloads'],
        [{ ...active, status: 'processing', progress: 100 }],
      ),
    )
    await waitFor(() =>
      expect(screen.getByRole('progressbar')).not.toHaveAttribute(
        'aria-valuenow',
      ),
    )
    act(() => client.setQueryData(['downloads'], [base]))
    expect(await screen.findByText('Já está na sua coleção')).toBeVisible()
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100',
    )
  })
  it('filters persisted downloads and cancels a queued item through IPC', async () => {
    const listDownloads = vi.fn().mockResolvedValue([
      base,
      {
        ...base,
        id: 'bcdbeddf-667f-4e92-9bd5-7b92817da875',
        provider: 'soundcloud',
        title: 'Faixa de teste',
        mediaType: 'audio',
        status: 'queued',
      },
    ])
    const cancelDownload = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(window, 'orbe', {
      configurable: true,
      value: { listDownloads, cancelDownload },
    })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={client}>
        <DownloadList />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Vídeo de teste')).toBeTruthy()
    expect(screen.getByText('Faixa de teste')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Filtrar fonte'), {
      target: { value: 'soundcloud' },
    })
    expect(screen.queryByText('Vídeo de teste')).toBeNull()
    expect(screen.getByText('Faixa de teste')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar download' }))
    await waitFor(() =>
      expect(cancelDownload).toHaveBeenCalledWith(
        'bcdbeddf-667f-4e92-9bd5-7b92817da875',
      ),
    )
  })
})
