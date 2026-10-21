import type { MediaAnalysis } from './media'

type ProviderId = MediaAnalysis['provider']

export const mediaSourceNames: Record<ProviderId, string> = {
  youtube: 'YouTube',
  soundcloud: 'SoundCloud',
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitter: 'X / Twitter',
  generic: 'Outras fontes',
  local: 'Arquivo local',
}

function matches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`)
}

export function mediaSourceForHost(hostname: string): ProviderId | null {
  const host = hostname.toLowerCase()
  if (matches(host, 'youtube.com') || host === 'youtu.be') return 'youtube'
  if (matches(host, 'soundcloud.com')) return 'soundcloud'
  if (matches(host, 'instagram.com') || host === 'instagr.am')
    return 'instagram'
  if (matches(host, 'facebook.com') || host === 'fb.watch' || host === 'fb.com')
    return 'facebook'
  if (matches(host, 'x.com') || matches(host, 'twitter.com')) return 'twitter'
  return null
}

export function isKnownMediaLink(input: string): boolean {
  try {
    const url = new URL(input)
    return url.protocol === 'https:' && mediaSourceForHost(url.hostname) != null
  } catch {
    return false
  }
}
