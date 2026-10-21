import { expect, test } from 'vitest'
import { migrateBrandStorage } from './brand-storage'

test('copies saved playback and lyrics once while keeping new preferences and originals', () => {
  const storage = window.sessionStorage
  storage.clear()
  storage.setItem('clipora-player-v1', '{"state":{"position":42}}')
  storage.setItem('clipora-lyrics:track', '{"title":"Test"}')
  storage.setItem('orbe-lyrics:track', '{"title":"Corrected"}')
  storage.setItem('other', 'unchanged')
  migrateBrandStorage(storage)
  expect(storage.getItem('orbe-player-v1')).toBe('{"state":{"position":42}}')
  expect(storage.getItem('orbe-lyrics:track')).toBe('{"title":"Corrected"}')
  expect(storage.getItem('clipora-player-v1')).toBe('{"state":{"position":42}}')
  expect(storage.getItem('other')).toBe('unchanged')
  migrateBrandStorage(storage)
  expect(storage.length).toBe(5)
  storage.clear()
})
