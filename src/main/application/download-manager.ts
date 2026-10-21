import { randomUUID } from 'node:crypto'
import { stat } from 'node:fs/promises'
import { eq, inArray } from 'drizzle-orm'
import type {
  DownloadStartRequest,
  DownloadRecord,
} from '../../shared/contracts/media'
import { downloads, mediaLibrary } from '../database/schema'
import type { openDatabase } from '../database/database'
import type { MediaProviderRegistry } from '../infrastructure/media/provider-registry'
import type { DownloadPreferences } from '../domain/media-provider'
import { userFacingMediaError } from '../domain/app-error'
import { logEvent } from '../infrastructure/logger'

type Database = ReturnType<typeof openDatabase>['db']

export class DownloadManager {
  private readonly active = new Map<string, AbortController>()
  private readonly requests = new Map<string, DownloadStartRequest>()
  private readonly directories = new Map<string, string>()
  private readonly tasks = new Set<Promise<void>>()
  private pumping = false
  private disposed = false

  constructor(
    private readonly db: Database,
    private readonly registry: MediaProviderRegistry,
    private readonly getDirectory: () => string,
    private readonly getLimit: () => number,
    private readonly onCompleted: (title: string) => void = () => undefined,
    private readonly getPreferences: () => DownloadPreferences = () => ({
      namingTemplate: 'title',
      speedLimitKbps: 0,
    }),
  ) {
    this.db
      .update(downloads)
      .set({
        status: 'failed',
        errorMessage: 'O aplicativo foi fechado durante o download.',
      })
      .where(
        inArray(downloads.status, [
          'queued',
          'analyzing',
          'downloading',
          'processing',
        ]),
      )
      .run()
  }

  list(): DownloadRecord[] {
    return this.db
      .select()
      .from(downloads)
      .all()
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((row) => ({
        id: row.id,
        provider: row.provider as DownloadRecord['provider'],
        sourceUrl: row.sourceUrl,
        title: row.title,
        artist: row.artist,
        channel: row.channel,
        thumbnail: row.thumbnail,
        durationMs: row.durationMs,
        mediaType: row.mediaType as DownloadRecord['mediaType'],
        format: row.format,
        quality: row.quality,
        fileSize: row.fileSize,
        filePath: row.filePath,
        status: row.status as DownloadRecord['status'],
        progress: row.progress,
        createdAt: row.createdAt,
        downloadedBytes: row.downloadedBytes,
        speedBytesPerSecond: row.speedBytesPerSecond,
        etaSeconds: row.etaSeconds,
        completedAt: row.completedAt,
        errorMessage: row.errorMessage,
      }))
  }

  async start(
    request: DownloadStartRequest,
    directory?: string,
    recoveryLibraryId?: string,
  ): Promise<DownloadRecord> {
    if (this.disposed)
      throw new Error('O gerenciador de downloads está encerrando.')
    const { provider } = await this.registry.resolve(request.url)
    if (provider.id !== request.provider)
      throw new Error('A origem do link mudou. Analise novamente.')
    const analysis = await provider
      .analyze(new URL(request.url))
      .catch((error: unknown) => {
        throw userFacingMediaError(error)
      })
    const selected = analysis.formats.find(
      (item) =>
        item.id === request.formatId && item.mediaType === request.mediaType,
    )
    if (!selected) throw new Error('O formato selecionado não está disponível.')
    const id = randomUUID()
    this.db
      .insert(downloads)
      .values({
        id,
        provider: provider.id,
        sourceUrl: request.url,
        sourceMediaId: analysis.sourceMediaId,
        title: analysis.title,
        artist: analysis.artist,
        album: analysis.album,
        channel: analysis.channel,
        thumbnail: analysis.thumbnail,
        durationMs: analysis.durationMs,
        mediaType: request.mediaType,
        formatId: selected.id,
        format: selected.extension,
        quality: selected.quality,
        codec: selected.codec,
        bitrateKbps:
          selected.bitrateKbps == null
            ? null
            : Math.round(selected.bitrateKbps),
        fileSize: selected.fileSize,
        status: 'queued',
        progress: 0,
        createdAt: Date.now(),
      })
      .run()
    if (recoveryLibraryId)
      this.db
        .update(mediaLibrary)
        .set({ downloadId: id })
        .where(eq(mediaLibrary.id, recoveryLibraryId))
        .run()
    this.requests.set(id, {
      ...request,
      title: analysis.title,
      extension: selected.extension,
      hasAudio: selected.hasAudio,
      quality: selected.quality,
    })
    this.directories.set(id, directory ?? this.getDirectory())
    logEvent('info', 'download.queued', { id, provider: provider.id })
    void this.pump()
    const record = this.list().find((item) => item.id === id)
    if (!record) throw new Error('Não foi possível criar o download.')
    return record
  }

  cancel(id: string): void {
    const record = this.db
      .select()
      .from(downloads)
      .where(eq(downloads.id, id))
      .get()
    if (
      !record ||
      !['queued', 'downloading', 'processing'].includes(record.status)
    )
      return
    this.active.get(id)?.abort()
    this.requests.delete(id)
    this.directories.delete(id)
    this.db
      .update(downloads)
      .set({ status: 'cancelled', errorMessage: null })
      .where(eq(downloads.id, id))
      .run()
  }

  async retry(id: string, directory?: string): Promise<DownloadRecord> {
    const record = this.db
      .select()
      .from(downloads)
      .where(eq(downloads.id, id))
      .get()
    if (
      !record ||
      !['failed', 'cancelled', 'completed'].includes(record.status) ||
      !record.formatId
    )
      throw new Error('Este download não pode ser repetido.')
    const existing = this.db
      .select()
      .from(mediaLibrary)
      .where(eq(mediaLibrary.downloadId, id))
      .get()
    const missing =
      existing &&
      !(await stat(existing.filePath)
        .then((info) => info.isFile())
        .catch(() => false))
    return this.start(
      {
        url: record.sourceUrl,
        title: record.title,
        provider: record.provider as DownloadStartRequest['provider'],
        mediaType: record.mediaType as DownloadStartRequest['mediaType'],
        formatId: record.formatId,
        extension: record.format,
        hasAudio: true,
        quality: record.quality ?? '',
        thumbnail: record.thumbnail,
        artist: record.artist,
        channel: record.channel,
        durationMs: record.durationMs,
      },
      directory,
      missing ? existing.id : undefined,
    )
  }

  remove(id: string): void {
    const record = this.db
      .select()
      .from(downloads)
      .where(eq(downloads.id, id))
      .get()
    if (
      !record ||
      !['failed', 'cancelled', 'completed'].includes(record.status)
    )
      throw new Error('Este download não pode ser removido agora.')
    this.db.delete(downloads).where(eq(downloads.id, id)).run()
  }

  hasActive(): boolean {
    return this.active.size > 0
  }

  async dispose(): Promise<void> {
    this.disposed = true
    for (const controller of this.active.values()) controller.abort()
    await Promise.allSettled([...this.tasks])
  }

  private async pump(): Promise<void> {
    if (this.pumping || this.disposed) return
    this.pumping = true
    try {
      while (this.active.size < this.getLimit()) {
        const next = this.db
          .select()
          .from(downloads)
          .where(eq(downloads.status, 'queued'))
          .all()
          .find((row) => this.requests.has(row.id) && !this.active.has(row.id))
        if (!next) break
        const request = this.requests.get(next.id)
        if (!request) continue
        const controller = new AbortController()
        this.active.set(next.id, controller)
        const task = this.run(next.id, request, controller).finally(() => {
          this.active.delete(next.id)
          this.requests.delete(next.id)
          this.directories.delete(next.id)
          if (!this.disposed) void this.pump()
        })
        this.tasks.add(task)
        void task.then(
          () => this.tasks.delete(task),
          () => this.tasks.delete(task),
        )
      }
    } finally {
      this.pumping = false
    }
  }

  private async run(
    id: string,
    request: DownloadStartRequest,
    controller: AbortController,
  ): Promise<void> {
    try {
      const { provider } = await this.registry.resolve(request.url)
      if (controller.signal.aborted) return
      this.db
        .update(downloads)
        .set({ status: 'downloading' })
        .where(eq(downloads.id, id))
        .run()
      let lastUpdate = 0
      const filePath = await provider.download(
        request,
        this.directories.get(id) ?? this.getDirectory(),
        {
          onProcessing: () => {
            if (controller.signal.aborted) return
            this.db
              .update(downloads)
              .set({
                status: 'processing',
                progress: 100,
                speedBytesPerSecond: null,
                etaSeconds: null,
              })
              .where(eq(downloads.id, id))
              .run()
          },
          onProgress: ({
            percent,
            downloadedBytes,
            totalBytes,
            speedBytesPerSecond,
            etaSeconds,
          }) => {
            if (controller.signal.aborted) return
            if (Date.now() - lastUpdate < 400 && percent < 100) return
            lastUpdate = Date.now()
            this.db
              .update(downloads)
              .set({
                status: 'downloading',
                progress: Number.isFinite(percent)
                  ? Math.max(0, Math.min(100, percent))
                  : 0,
                ...(totalBytes != null && totalBytes > 0
                  ? { fileSize: totalBytes }
                  : {}),
                downloadedBytes,
                speedBytesPerSecond:
                  speedBytesPerSecond == null
                    ? null
                    : Math.round(speedBytesPerSecond),
                etaSeconds: etaSeconds == null ? null : Math.round(etaSeconds),
              })
              .where(eq(downloads.id, id))
              .run()
          },
        },
        controller.signal,
        this.getPreferences(),
      )
      if (controller.signal.aborted) return
      const info = await stat(filePath)
      this.db.transaction((tx) => {
        tx.update(downloads)
          .set({
            status: 'completed',
            progress: 100,
            filePath,
            fileSize: info.size,
            completedAt: Date.now(),
          })
          .where(eq(downloads.id, id))
          .run()
        const recovering = tx
          .select()
          .from(mediaLibrary)
          .where(eq(mediaLibrary.downloadId, id))
          .get()
        if (recovering) {
          tx.update(mediaLibrary)
            .set({ filePath, format: request.extension })
            .where(eq(mediaLibrary.id, recovering.id))
            .run()
        } else
          tx.insert(mediaLibrary)
            .values({
              id: randomUUID(),
              downloadId: id,
              provider: request.provider,
              mediaType: request.mediaType,
              title: request.title,
              artist: request.artist,
              thumbnail: request.thumbnail,
              durationMs: request.durationMs,
              filePath,
              format: request.extension,
              createdAt: Date.now(),
            })
            .onConflictDoUpdate({
              target: mediaLibrary.filePath,
              set: {
                downloadId: id,
                provider: request.provider,
                thumbnail: request.thumbnail,
              },
            })
            .run()
      })
      logEvent('info', 'download.completed', { id, provider: request.provider })
      try {
        this.onCompleted(request.title)
      } catch {
        // A notification failure cannot change a completed download into a failure.
      }
    } catch (error) {
      if (controller.signal.aborted) return
      const normalized = userFacingMediaError(error)
      const message = normalized.message
      logEvent('warn', 'download.failed', {
        id,
        provider: request.provider,
        code: normalized.code,
      })
      this.db
        .update(downloads)
        .set({ status: 'failed', errorMessage: message.slice(0, 500) })
        .where(eq(downloads.id, id))
        .run()
    }
  }
}
