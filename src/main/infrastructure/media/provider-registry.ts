import type { MediaProvider } from '../../domain/media-provider'
import { parseMediaUrl } from './url'

export class MediaProviderRegistry {
  constructor(private readonly providers: MediaProvider[]) {}

  async resolve(input: string): Promise<{ provider: MediaProvider; url: URL }> {
    const url = parseMediaUrl(input)
    for (const provider of this.providers) {
      if (await provider.canHandle(url)) return { provider, url }
    }
    throw new Error('Esta origem não é suportada.')
  }
}
