export class MediaUrlError extends Error {
  constructor(public readonly code: 'INVALID_URL' | 'UNSUPPORTED_URL') {
    super(
      code === 'INVALID_URL'
        ? 'Informe um link HTTPS válido.'
        : 'Esta origem não é suportada.',
    )
  }
}

export function parseMediaUrl(input: string): URL {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new MediaUrlError('INVALID_URL')
  }
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new MediaUrlError('INVALID_URL')
  const host = url.hostname.toLowerCase()
  if (
    host === 'spotify.com' ||
    host.endsWith('.spotify.com') ||
    host === 'spotify.link'
  ) {
    throw new MediaUrlError('UNSUPPORTED_URL')
  }
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === '[::1]' ||
    isPrivateIPv4(host)
  ) {
    throw new MediaUrlError('UNSUPPORTED_URL')
  }
  return url
}

function isPrivateIPv4(host: string): boolean {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false
  const octets = host.split('.').map(Number)
  const [first, second] = octets
  if (
    first === undefined ||
    second === undefined ||
    octets.some((item) => item > 255)
  )
    return true
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  )
}
