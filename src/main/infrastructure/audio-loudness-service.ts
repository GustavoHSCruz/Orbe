import { eq } from 'drizzle-orm'
import { settings } from '../database/schema'
import type { openDatabase } from '../database/database'
import { processRunner } from './media/process-runner'
import type { LibraryService } from '../application/library-service'

type Database = ReturnType<typeof openDatabase>['db']

export class AudioLoudnessService {
  private readonly pending = new Map<string, Promise<number>>()

  constructor(
    private readonly db: Database,
    private readonly library: LibraryService,
    private readonly ffmpegPath: string,
  ) {}

  gainFor(id: string): Promise<number> {
    const record = this.library.find(id)
    if (!record || record.mediaType !== 'audio') return Promise.resolve(1)
    const key = `loudness:${id}`
    const cached = this.db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .get()
    if (cached) {
      const gain = Number(cached.value)
      if (Number.isFinite(gain) && gain > 0) return Promise.resolve(gain)
    }
    const existing = this.pending.get(id)
    if (existing) return existing
    const work = this.measure(record.filePath)
      .then((gain) => {
        this.db
          .insert(settings)
          .values({ key, value: String(gain) })
          .onConflictDoUpdate({
            target: settings.key,
            set: { value: String(gain) },
          })
          .run()
        return gain
      })
      .catch(() => 1)
      .finally(() => this.pending.delete(id))
    this.pending.set(id, work)
    return work
  }

  private async measure(filePath: string): Promise<number> {
    const { stderr } = await processRunner.run(
      this.ffmpegPath,
      [
        '-hide_banner',
        '-nostats',
        '-i',
        filePath,
        '-vn',
        '-sn',
        '-dn',
        '-af',
        'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json',
        '-f',
        'null',
        process.platform === 'win32' ? 'NUL' : '/dev/null',
      ],
      { timeoutMs: 120000 },
    )
    const match = /"input_i"\s*:\s*"(-?\d+(?:\.\d+)?)"/.exec(stderr)
    const integrated = Number(match?.[1])
    if (!Number.isFinite(integrated) || integrated < -70 || integrated > 0)
      return 1
    const gain = 10 ** ((-16 - integrated) / 20)
    return Math.min(2.5, Math.max(0.25, gain))
  }
}
