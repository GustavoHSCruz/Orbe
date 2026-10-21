import { eq } from 'drizzle-orm'
import { settings } from '../database/schema'
import type { openDatabase } from '../database/database'
import { SettingsSchema, type Settings } from '../../shared/contracts/media'
import { migrateBrandPreferences } from '../infrastructure/brand-compatibility'

type Database = ReturnType<typeof openDatabase>['db']

export class SettingsService {
  constructor(
    private readonly db: Database,
    private readonly defaultDirectory: string,
  ) {}

  get(): Settings {
    const raw = this.db
      .select()
      .from(settings)
      .where(eq(settings.key, 'preferences'))
      .get()
    if (!raw)
      return SettingsSchema.parse({
        downloadDirectory: this.defaultDirectory,
        concurrentDownloads: 2,
        theme: 'dark',
      })
    return SettingsSchema.parse(migrateBrandPreferences(JSON.parse(raw.value)))
  }

  save(input: Settings): Settings {
    const value = SettingsSchema.parse(input)
    this.db
      .insert(settings)
      .values({ key: 'preferences', value: JSON.stringify(value) })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: JSON.stringify(value) },
      })
      .run()
    return value
  }

  onboardingComplete(): boolean {
    return (
      this.db
        .select()
        .from(settings)
        .where(eq(settings.key, 'onboardingComplete'))
        .get()?.value === 'true'
    )
  }

  finishOnboarding(): void {
    this.db
      .insert(settings)
      .values({ key: 'onboardingComplete', value: 'true' })
      .onConflictDoUpdate({ target: settings.key, set: { value: 'true' } })
      .run()
  }
}
