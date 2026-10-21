import type { MediaFormat, Settings } from '../../shared/contracts/media'

export function preferredFormat(
  formats: MediaFormat[],
  kind: 'video' | 'audio',
  preference: Settings['preferredDownload'] | undefined,
): MediaFormat | undefined {
  const available = formats.filter((format) => format.mediaType === kind)
  if (!available.length) return undefined
  const extension =
    kind === 'video'
      ? (preference?.videoExtension ?? 'mp4')
      : (preference?.audioExtension ?? 'mp3')
  const matching = available.filter(
    (format) => format.extension.toLowerCase() === extension,
  )
  const candidates = matching.length ? matching : available
  const wanted = kind === 'video' ? preference?.videoQuality : undefined
  if (wanted && wanted !== 'best') {
    const exact = candidates.find((format) => format.quality === wanted)
    if (exact) return exact
  }
  return [...candidates].sort((a, b) => {
    const aQuality = Number.parseInt(a.quality, 10) || 0
    const bQuality = Number.parseInt(b.quality, 10) || 0
    return (
      bQuality - aQuality ||
      (b.bitrateKbps ?? 0) - (a.bitrateKbps ?? 0) ||
      Number(b.hasAudio) - Number(a.hasAudio)
    )
  })[0]
}
