import { describe, expect, it } from 'vitest'
import { isKnownMediaLink, mediaSourceForHost } from './media-sources'

describe('social media sources', () => {
  it.each([
    ['www.instagram.com', 'instagram'],
    ['m.facebook.com', 'facebook'],
    ['fb.watch', 'facebook'],
    ['x.com', 'twitter'],
    ['mobile.twitter.com', 'twitter'],
  ] as const)('recognizes %s as %s', (host, provider) => {
    expect(mediaSourceForHost(host)).toBe(provider)
    expect(isKnownMediaLink(`https://${host}/video`)).toBe(true)
  })

  it('does not recognize lookalike hosts or insecure links', () => {
    expect(isKnownMediaLink('https://fakeinstagram.com/reel/123')).toBe(false)
    expect(isKnownMediaLink('https://facebook.com.evil.test/watch')).toBe(false)
    expect(isKnownMediaLink('http://x.com/user/status/123')).toBe(false)
  })
})
