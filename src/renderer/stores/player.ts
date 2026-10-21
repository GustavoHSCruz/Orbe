import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LibraryRecord } from '../../shared/contracts/media'
import { migrateBrandStorage } from '../lib/brand-storage'

try { migrateBrandStorage(localStorage) } catch { /* Storage may be unavailable. */ }

type PlayerState = {
  queue: LibraryRecord[]
  index: number
  playing: boolean
  playRequest: number
  volume: number
  position: number
  crossfadeSeconds: number
  normalizeVolume: boolean
  lyricsDelayByTrack: Record<string, number>
  setLyricsDelay: (trackId: string, milliseconds: number) => void
  expanded: boolean
  visualMode: 'video' | 'artwork'
  shuffle: boolean
  repeat: 'off' | 'all' | 'one'
  history: number[]
  play: (items: LibraryRecord[], index: number) => void
  toggle: () => void
  setExpanded: (expanded: boolean) => void
  setVisualMode: (mode: 'video' | 'artwork') => void
  setVolume: (volume: number) => void
  setPosition: (position: number) => void
  setCrossfadeSeconds: (seconds: number) => void
  setNormalizeVolume: (enabled: boolean) => void
  next: () => void
  finishTrack: () => void
  previous: () => void
  toggleShuffle: () => void
  cycleRepeat: () => void
}

export const usePlayer = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      index: 0,
      playing: false,
      playRequest: 0,
      volume: 0.8,
      position: 0,
      crossfadeSeconds: 0,
      normalizeVolume: false,
      lyricsDelayByTrack: {},
      setLyricsDelay: (trackId, milliseconds) => {
        if (!Number.isFinite(milliseconds)) return
        set((state) => ({
          lyricsDelayByTrack: {
            ...state.lyricsDelayByTrack,
            [trackId]: Math.max(
              -5000,
              Math.min(5000, Math.round(milliseconds)),
            ),
          },
        }))
      },
      expanded: false,
      visualMode: 'video',
      shuffle: false,
      repeat: 'off',
      history: [],
      play: (queue, index) =>
        set((state) => ({
          queue,
          index,
          playing: true,
          playRequest: state.playRequest + 1,
          position: 0,
          history: [],
          expanded: state.expanded || queue[index]?.mediaType === 'video',
          visualMode: 'video',
        })),
      toggle: () => set((state) => ({ playing: !state.playing })),
      setExpanded: (expanded) => set({ expanded }),
      setVisualMode: (visualMode) => set({ visualMode }),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
      setPosition: (position) => set({ position: Math.max(0, position) }),
      setCrossfadeSeconds: (crossfadeSeconds) => set({ crossfadeSeconds }),
      setNormalizeVolume: (normalizeVolume) => set({ normalizeVolume }),
      next: () =>
        set((state) => {
          if (state.queue.length <= 1) return state
          const nextIndex =
            state.shuffle && state.queue.length > 1
              ? (state.index +
                  1 +
                  Math.floor(Math.random() * (state.queue.length - 1))) %
                state.queue.length
              : state.index + 1
          return {
            index: nextIndex % state.queue.length,
            visualMode: 'video',
            playing: true,
            playRequest: state.playRequest + 1,
            position: 0,
            history: [...state.history, state.index],
          }
        }),
      finishTrack: () => {
        const state = get()
        if (state.queue.length === 1 && state.repeat !== 'off') {
          set({
            position: 0,
            playing: true,
            playRequest: state.playRequest + 1,
          })
          return
        }
        if (
          (state.index >= state.queue.length - 1 &&
            !state.shuffle &&
            state.repeat === 'off') ||
          state.queue.length <= 1
        ) {
          set({ playing: false })
        } else state.next()
      },
      previous: () =>
        set((state) => ({
          index: state.history.at(-1) ?? Math.max(state.index - 1, 0),
          history: state.history.slice(0, -1),
          playing: true,
          playRequest: state.playRequest + 1,
          position: 0,
          visualMode: 'video',
        })),
      toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
      cycleRepeat: () =>
        set((state) => ({
          repeat:
            state.repeat === 'off'
              ? 'all'
              : state.repeat === 'all'
                ? 'one'
                : 'off',
        })),
    }),
    {
      name: 'orbe-player-v1',
      partialize: (state) => ({
        queue: state.queue,
        index: state.index,
        volume: state.volume,
        position: state.position,
        crossfadeSeconds: state.crossfadeSeconds,
        normalizeVolume: state.normalizeVolume,
        lyricsDelayByTrack: state.lyricsDelayByTrack,
      }),
    },
  ),
)
