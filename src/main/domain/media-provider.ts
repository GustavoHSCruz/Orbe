import type { ChildProcess } from 'node:child_process'
import type {
  DownloadStartRequest,
  MediaAnalysis,
  MediaFormat,
} from '../../shared/contracts/media'

export interface DownloadEvents {
  onProcessing?(): void
  onProgress(progress: {
    percent: number
    downloadedBytes: number | null
    totalBytes: number | null
    speedBytesPerSecond: number | null
    etaSeconds: number | null
  }): void
}

export interface DownloadPreferences {
  namingTemplate: 'title' | 'title-quality' | 'channel-title'
  speedLimitKbps: number
}

export interface MediaProvider {
  readonly id:
    'youtube' | 'soundcloud' | 'instagram' | 'facebook' | 'twitter' | 'generic'
  readonly name: string
  canHandle(url: URL): Promise<boolean>
  analyze(
    url: URL,
    options?: { mode?: 'video' | 'playlist'; page?: number },
  ): Promise<MediaAnalysis>
  getFormats(url: URL): Promise<MediaFormat[]>
  download(
    request: DownloadStartRequest,
    directory: string,
    events: DownloadEvents,
    signal: AbortSignal,
    preferences?: DownloadPreferences,
  ): Promise<string>
}

export interface ProcessRunner {
  run(
    command: string,
    args: string[],
    options?: {
      signal?: AbortSignal
      onLine?: (line: string) => void
      timeoutMs?: number
    },
  ): Promise<{ stdout: string; stderr: string }>
}

export type RunningProcess = ChildProcess
