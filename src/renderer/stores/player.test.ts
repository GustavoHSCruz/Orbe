import { beforeEach, describe, expect, it } from 'vitest'
import { usePlayer } from './player'
import type { LibraryRecord } from '../../shared/contracts/media'

const tracks = ['one', 'two', 'three'].map(
  (id) => ({ id, title: id, mediaType: 'audio' }) as LibraryRecord,
)
beforeEach(() =>
  usePlayer.setState({
    queue: [],
    index: 0,
    playing: false,
    repeat: 'off',
    shuffle: false,
    playRequest: 0,
    history: [],
  }),
)
describe('playback queue', () => {
  it('advances manually, wraps from the last track and keeps playing', () => {
    usePlayer.getState().play(tracks, 1)
    usePlayer.getState().next()
    expect(usePlayer.getState()).toMatchObject({
      index: 2,
      playing: true,
      playRequest: 2,
    })
    usePlayer.getState().next()
    expect(usePlayer.getState()).toMatchObject({
      index: 0,
      playing: true,
      playRequest: 3,
    })
    usePlayer.getState().previous()
    expect(usePlayer.getState().index).toBe(2)
  })
  it('stops only at the natural end without repeat, and honors repeat-all', () => {
    usePlayer.getState().play(tracks, 2)
    usePlayer.getState().finishTrack()
    expect(usePlayer.getState().playing).toBe(false)
    usePlayer.setState({ repeat: 'all' })
    usePlayer.getState().finishTrack()
    expect(usePlayer.getState()).toMatchObject({ index: 0, playing: true })
  })
  it('does not interrupt a single track on manual next', () => {
    usePlayer.getState().play(tracks.slice(0, 1), 0)
    usePlayer.getState().next()
    expect(usePlayer.getState()).toMatchObject({
      index: 0,
      playing: true,
      playRequest: 1,
    })
  })
})
