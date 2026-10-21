import { describe, expect, it } from 'vitest'
import { parseMediaUrl } from './url'

describe('media URL validation', () => {
  it('accepts public HTTPS media links', () => {
    expect(parseMediaUrl('https://www.youtube.com/watch?v=abc').hostname).toBe(
      'www.youtube.com',
    )
    expect(parseMediaUrl('https://soundcloud.com/user/track').hostname).toBe(
      'soundcloud.com',
    )
  })
  it('rejects malformed or local links', () => {
    for (const input of [
      'not a URL',
      'http://youtube.com/watch?v=a',
      'https://localhost/media',
      'https://127.0.0.1/media',
      'https://192.168.1.1/media',
      'https://user:pass@example.com/media',
      'https://open.spotify.com/track/123',
    ]) {
      expect(() => parseMediaUrl(input)).toThrow()
    }
  })
})
