import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ListMusic,
  LoaderCircle,
  Maximize2,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePlayer } from '../stores/player'
import { ExpandedPlayer } from './ExpandedPlayer'
import { AudioDeck } from './audio-deck'
import { SeekSlider } from './SeekSlider'

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

function milliseconds(seconds: number | undefined, fallback = 0): number {
  return seconds != null && Number.isFinite(seconds) && seconds >= 0
    ? Math.round(seconds * 1000)
    : fallback
}

export function PlayerBar() {
  const {
    queue,
    index,
    playing,
    playRequest,
    expanded,
    visualMode,
    shuffle,
    repeat,
    volume,
    normalizeVolume,
    toggle,
    next,
    finishTrack,
    previous,
    toggleShuffle,
    cycleRepeat,
    play,
    setExpanded,
    setVolume,
    setPosition,
  } = usePlayer()
  const track = queue[index]
  const artworkQuery = useQuery({
    queryKey: ['player-artwork', track?.id],
    queryFn: () => window.orbe.artworkForTrack(track!.id),
    enabled: !!track,
    staleTime: Infinity,
    retry: false,
  })
  const artwork = artworkQuery.data ?? track?.thumbnail ?? null
  const media = useRef<HTMLMediaElement | null>(null)
  const audioRefs = useRef<[HTMLAudioElement | null, HTMLAudioElement | null]>([
    null,
    null,
  ])
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const deck = useRef<AudioDeck | null>(null)
  const activeSlot = useRef(0)
  const slotTrackIds = useRef<[string | null, string | null]>([null, null])
  const previousTrackId = useRef<string | null>(null)
  const previousRequest = useRef(0)
  const resumeTrackId = useRef(
    usePlayer.getState().queue[usePlayer.getState().index]?.id ?? null,
  )
  const resumePosition = useRef(usePlayer.getState().position)
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const crossfadeStarted = useRef(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [queueOpen, setQueueOpen] = useState(false)
  const [playbackError, setPlaybackError] = useState('')
  const [loading, setLoading] = useState(false)
  const lastReport = useRef(0)
  const lastSave = useRef(0)
  const pendingSeek = useRef<number | null>(null)
  const previousVideoLayout = useRef<{ id: string; expanded: boolean } | null>(
    null,
  )

  const seekTo = (seconds: number) => {
    if (!media.current || !Number.isFinite(seconds)) return
    pendingSeek.current = seconds
    media.current.currentTime = seconds
    setTime(seconds)
    setPosition(seconds)
  }

  useEffect(() => {
    if (!playing || !expanded) return
    let frame = 0
    const update = () => {
      const element = media.current
      // Read the media clock directly: never extrapolate through buffering,
      // seeking, pauses or a crossfade to a different deck.
      if (
        element &&
        !element.seeking &&
        pendingSeek.current == null &&
        Number.isFinite(element.currentTime)
      ) {
        setTime(element.currentTime)
      }
      frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [playing, expanded, track?.id])

  useEffect(() => {
    if (track?.mediaType !== 'video') return
    if (!expanded) {
      if (videoRef.current) {
        videoRef.current.style.display = 'none'
        videoRef.current.style.opacity = '0'
      }
      return
    }
    let frame = 0
    const started = performance.now()
    const changedLayout =
      previousVideoLayout.current?.id !== track.id ||
      previousVideoLayout.current.expanded !== expanded
    previousVideoLayout.current = { id: track.id, expanded }
    const revealAt = changedLayout ? started + (expanded ? 120 : 560) : 0
    if (changedLayout && videoRef.current) {
      videoRef.current.style.transition = 'none'
      videoRef.current.style.opacity = '0'
      videoRef.current.style.display = 'none'
    }
    const positionVideo = () => {
      const element = videoRef.current
      const expandedTarget = document.querySelector<HTMLElement>(
        `[data-video-target="expanded"][data-track-id="${track.id}"]`,
      )
      const target = expandedTarget
      if (element && target) {
        const rectangle = target.getBoundingClientRect()
        element.style.left = `${rectangle.left}px`
        element.style.top = `${rectangle.top}px`
        element.style.width = `${rectangle.width}px`
        element.style.height = `${rectangle.height}px`
        element.style.borderRadius =
          expanded && expandedTarget ? '2rem' : '0.75rem'
        element.style.objectFit =
          expanded && expandedTarget ? 'contain' : 'cover'
        if (performance.now() >= revealAt) {
          element.style.transition = 'opacity 180ms ease-out'
          element.style.display =
            expanded && visualMode === 'artwork' ? 'none' : 'block'
          element.style.opacity =
            expanded && visualMode === 'artwork' ? '0' : '1'
        }
      }
      if (performance.now() - started < 850)
        frame = requestAnimationFrame(positionVideo)
    }
    frame = requestAnimationFrame(positionVideo)
    window.addEventListener('resize', positionVideo)
    document.addEventListener('scroll', positionVideo, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', positionVideo)
      document.removeEventListener('scroll', positionVideo, true)
    }
  }, [track?.id, track?.mediaType, expanded, visualMode])

  useEffect(() => {
    if (!track) return
    const changed = previousTrackId.current !== track.id
    const requested = previousRequest.current !== playRequest
    if (!changed && !requested) return
    previousTrackId.current = track.id
    previousRequest.current = playRequest
    pendingSeek.current = null
    crossfadeStarted.current = false
    setLoading(true)
    setPlaybackError('')
    if (fadeTimer.current) clearTimeout(fadeTimer.current)
    const state = usePlayer.getState()
    const outgoing = media.current
    const oldSlot =
      outgoing instanceof HTMLAudioElement ? activeSlot.current : null
    if (track.mediaType === 'audio') {
      const elements = audioRefs.current
      if (!elements[0] || !elements[1]) return
      if (!deck.current)
        deck.current = new AudioDeck([elements[0], elements[1]], state.volume)
      const incomingSlot =
        changed && oldSlot != null ? 1 - oldSlot : (oldSlot ?? 0)
      const incoming = elements[incomingSlot]
      if (!incoming) return
      media.current = incoming
      activeSlot.current = incomingSlot
      if (changed) {
        incoming.pause()
        incoming.src = `orbe-media://library/${track.id}`
        slotTrackIds.current[incomingSlot] = track.id
        incoming.load()
      } else if (requested) incoming.currentTime = 0
      if (outgoing instanceof HTMLVideoElement) outgoing.pause()
      const seconds =
        changed && oldSlot != null && state.playing ? state.crossfadeSeconds : 0
      deck.current.transition(incomingSlot, oldSlot, seconds)
      deck.current.setTrackGain(incomingSlot, 1)
      if (oldSlot != null && oldSlot !== incomingSlot) {
        if (seconds > 0)
          fadeTimer.current = setTimeout(
            () => outgoing?.pause(),
            seconds * 1000 + 100,
          )
        else outgoing?.pause()
      }
      if (state.playing) {
        void incoming.play().catch((error: unknown) => {
          if (
            media.current !== incoming ||
            previousRequest.current !== playRequest ||
            (error instanceof DOMException && error.name === 'AbortError')
          )
            return
          setLoading(false)
          usePlayer.setState({ playing: false })
          setPlaybackError(
            'Não foi possível reproduzir este arquivo no Orbe. Abra no aplicativo padrão do computador.',
          )
        })
      }
    } else {
      audioRefs.current.forEach((element) => element?.pause())
      deck.current?.stop(null)
      const element = videoRef.current
      if (!element) return
      media.current = element
      element.volume = state.volume
      if (requested && !changed) element.currentTime = 0
      if (state.playing)
        void element.play().catch((error: unknown) => {
          if (
            media.current !== element ||
            previousRequest.current !== playRequest ||
            (error instanceof DOMException && error.name === 'AbortError')
          )
            return
          setLoading(false)
          usePlayer.setState({ playing: false })
          setPlaybackError('Não foi possível reproduzir este vídeo.')
        })
    }
  }, [track, playRequest])

  useEffect(() => {
    const element = media.current
    if (!element) return
    if (playing) {
      const request = previousRequest.current
      void element.play().catch((error: unknown) => {
        if (
          media.current !== element ||
          previousRequest.current !== request ||
          (error instanceof DOMException && error.name === 'AbortError')
        )
          return
        setLoading(false)
        usePlayer.setState({ playing: false })
        setPlaybackError(
          'Não foi possível reproduzir este arquivo no Orbe. Abra no aplicativo padrão do computador.',
        )
      })
    } else {
      audioRefs.current.forEach((audio) => audio?.pause())
      videoRef.current?.pause()
      deck.current?.stop(
        track?.mediaType === 'audio' ? activeSlot.current : null,
      )
      if (fadeTimer.current) clearTimeout(fadeTimer.current)
    }
  }, [playing, track?.mediaType])

  useEffect(() => {
    deck.current?.setVolume(volume)
    if (videoRef.current) videoRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    if (!track || (track.durationMs != null && track.durationMs > 0)) return
    void window.orbe
      .mediaDuration(track.id)
      .then((durationMs) => {
        if (
          durationMs &&
          usePlayer.getState().queue[usePlayer.getState().index]?.id ===
            track.id
        )
          setDuration(durationMs / 1000)
      })
      .catch(() => {})
  }, [track])

  useEffect(() => {
    if (!track || track.mediaType !== 'audio' || !deck.current) return
    const slot = activeSlot.current
    deck.current.setTrackGain(slot, 1)
    if (normalizeVolume)
      void window.orbe
        .audioGain(track.id)
        .then((gain) => {
          if (
            slotTrackIds.current[slot] === track.id &&
            usePlayer.getState().normalizeVolume
          )
            deck.current?.setTrackGain(slot, gain)
        })
        .catch(() => {})
  }, [track, normalizeVolume])

  useEffect(() => {
    const save = () => {
      if (media.current && Number.isFinite(media.current.currentTime))
        usePlayer.getState().setPosition(media.current.currentTime)
    }
    window.addEventListener('beforeunload', save)
    return () => window.removeEventListener('beforeunload', save)
  }, [])

  useEffect(() => {
    if (!track) {
      void window.orbe.updateNowPlaying(null)
      return
    }
    void window.orbe
      .updateNowPlaying({
        source: 'orbe',
        title: track.title,
        artist: track.artist ?? 'Artista não informado',
        album: track.album,
        artwork: track.thumbnail,
        durationMs: milliseconds(duration, track.durationMs ?? 0),
        progressMs: milliseconds(media.current?.currentTime),
        isPlaying: playing,
        externalUrl: null,
      })
      .catch(() => {})
  }, [track, playing, duration])

  if (!track) return null
  const source = `orbe-media://library/${track.id}`
  const isCurrent = (event: { currentTarget: HTMLMediaElement }) =>
    media.current === event.currentTarget
  const common = {
    onLoadStart: (event: { currentTarget: HTMLMediaElement }) => {
      if (!isCurrent(event)) return
      setLoading(true)
      setTime(0)
      setDuration(0)
      setPlaybackError('')
    },
    onTimeUpdate: (event: { currentTarget: HTMLMediaElement }) => {
      if (!isCurrent(event)) return
      const element = event.currentTarget
      const position = element.currentTime
      if (
        pendingSeek.current != null &&
        Math.abs(position - pendingSeek.current) > 0.75
      )
        return
      pendingSeek.current = null
      setTime(position)
      if (Date.now() - lastSave.current > 3000) {
        lastSave.current = Date.now()
        setPosition(position)
      }
      if (Date.now() - lastReport.current > 5000) {
        lastReport.current = Date.now()
        void window.orbe
          .updateNowPlaying({
            source: 'orbe',
            title: track.title,
            artist: track.artist ?? 'Artista não informado',
            album: track.album,
            artwork: track.thumbnail,
            durationMs: milliseconds(element.duration, track.durationMs ?? 0),
            progressMs: milliseconds(position),
            isPlaying: playing,
            externalUrl: null,
          })
          .catch(() => {})
      }
      const fade = usePlayer.getState().crossfadeSeconds
      if (
        playing &&
        track.mediaType === 'audio' &&
        fade > 0 &&
        queue.length > 1 &&
        (index + 1 < queue.length || repeat === 'all' || shuffle) &&
        repeat !== 'one' &&
        Number.isFinite(element.duration) &&
        element.duration - position <= fade &&
        element.duration - position > 0 &&
        !crossfadeStarted.current
      ) {
        crossfadeStarted.current = true
        finishTrack()
      }
    },
    onLoadedMetadata: (event: { currentTarget: HTMLMediaElement }) => {
      if (!isCurrent(event)) return
      const element = event.currentTarget
      setDuration(
        Number.isFinite(element.duration)
          ? element.duration
          : (track.durationMs ?? 0) / 1000,
      )
      if (resumeTrackId.current === track.id && resumePosition.current > 0) {
        element.currentTime = resumePosition.current
        setTime(resumePosition.current)
        resumeTrackId.current = null
      }
    },
    onSeeked: (event: { currentTarget: HTMLMediaElement }) => {
      if (!isCurrent(event)) return
      pendingSeek.current = null
      setTime(event.currentTarget.currentTime)
      setPosition(event.currentTarget.currentTime)
    },
    onDurationChange: (event: { currentTarget: HTMLMediaElement }) => {
      if (isCurrent(event) && Number.isFinite(event.currentTarget.duration))
        setDuration(event.currentTarget.duration)
    },
    onCanPlay: (event: { currentTarget: HTMLMediaElement }) => {
      if (!isCurrent(event)) return
      setLoading(false)
      setPlaybackError('')
    },
    onError: (event: { currentTarget: HTMLMediaElement }) => {
      if (!isCurrent(event)) return
      setLoading(false)
      usePlayer.setState({ playing: false })
      setPlaybackError(
        'Este arquivo não pôde ser carregado. Confira se ele ainda está no computador ou abra no aplicativo padrão.',
      )
    },
    onEnded: (event: { currentTarget: HTMLMediaElement }) => {
      if (!isCurrent(event)) return
      if (repeat === 'one') {
        event.currentTarget.currentTime = 0
        void event.currentTarget.play()
      } else finishTrack()
    },
    onPlay: (event: { currentTarget: HTMLMediaElement }) => {
      if (isCurrent(event)) {
        setLoading(false)
        void window.orbe.markPlayed(track.id)
      }
    },
  }
  return (
    <div className="mini-player fixed z-20 px-4 py-3 backdrop-blur-2xl">
      {playbackError && (
        <div
          role="alert"
          className="mb-3 flex items-center justify-between gap-4 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-xs text-rose-100"
        >
          <span>{playbackError}</span>
          <Button
            variant="secondary"
            size="sm"
            type="button"

            onClick={() => void window.orbe.openLibraryFile(track.id)}
          >
            Abrir arquivo
          </Button>
        </div>
      )}
      <div className="mini-player-layout grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 min-[1300px]:flex min-[1300px]:gap-4">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="group flex w-full min-w-0 items-center gap-3 text-left min-[1300px]:w-56"
          aria-label="Expandir tocando agora"
        >
          <span
            data-video-target="mini"
            className="relative size-11 shrink-0 overflow-hidden rounded-xl"
          >
            {artwork ? (
              <img
                src={artwork}
                alt=""
                className="size-11 object-cover shadow-lg"
              />
            ) : (
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-200">
                <Volume2 size={20} />
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold group-hover:text-violet-200">
              {track.title}
            </span>
            <span className="block truncate text-xs text-slate-400">
              {track.artist ?? track.provider}
            </span>
          </span>
        </button>
        <div className="flex gap-1">
          <Button
            aria-label={shuffle ? 'Desativar aleatório' : 'Ativar aleatório'}
            title="Aleatório"
            aria-pressed={shuffle}
            variant="ghost"
            size="icon"
            onClick={toggleShuffle}
            className={shuffle ? 'text-violet-300' : ''}
          >
            <Shuffle size={17} />
          </Button>
          <Button
            aria-label="Anterior"
            variant="ghost"
            size="icon"
            onClick={previous}
          >
            <SkipBack size={17} />
          </Button>
          <Button
            aria-label={`Repetição: ${repeat}`}
            title="Repetição"
            aria-pressed={repeat !== 'off'}
            variant="ghost"
            size="icon"
            onClick={cycleRepeat}
            className={repeat !== 'off' ? 'text-violet-300' : ''}
          >
            <Repeat size={17} />
            {repeat === 'one' && <span className="text-[9px]">1</span>}
          </Button>
          <Button
            aria-label={playing ? 'Pausar' : 'Reproduzir'}
            variant="ghost"
            size="icon"
            onClick={toggle}
          >
            {loading ? (
              <LoaderCircle size={18} className="animate-spin" />
            ) : playing ? (
              <Pause size={18} />
            ) : (
              <Play size={18} />
            )}
          </Button>
          <Button
            aria-label="Próxima"
            disabled={queue.length < 2}
            title={
              queue.length < 2 ? 'Adicione outra faixa à fila' : 'Próxima faixa'
            }
            variant="ghost"
            size="icon"
            onClick={next}
          >
            <SkipForward size={17} />
          </Button>
        </div>
        <div className="flex min-w-0 items-center gap-3 min-[1300px]:flex-1">
          <span className="w-9 shrink-0 text-xs text-slate-400">
            {clock(time)}
          </span>
          <SeekSlider
            key={track.id}
            label="Posição da reprodução"
            time={time}
            duration={duration}
            onSeek={seekTo}
            className="min-w-20 flex-1 accent-violet-500"
          />
          <span className="w-9 shrink-0 text-xs text-slate-400">
            {clock(Number.isFinite(duration) ? duration : 0)}
          </span>
        </div>
        <div className="flex items-center justify-end gap-2 min-[1300px]:shrink-0">
          <Volume2 size={16} className="text-slate-400" />
          <input
            aria-label="Volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            style={{ '--range-progress': `${volume * 100}%` } as CSSProperties}
            onChange={(event) => setVolume(Number(event.target.value))}
            className="w-20 accent-violet-500"
          />
          <Button
            aria-label="Fila de reprodução"
            title="Fila"
            aria-pressed={queueOpen}
            variant="ghost"
            size="icon"
            onClick={() => setQueueOpen((open) => !open)}
          >
            <ListMusic size={17} />
          </Button>
          <Button
            aria-label="Expandir player"
            title="Expandir player"
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(true)}
          >
            <Maximize2 size={17} />
          </Button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <ExpandedPlayer
            track={track}
            artwork={artwork}
            time={time}
            duration={duration}
            playing={playing}
            onClose={() => setExpanded(false)}
            onToggle={toggle}
            onNext={next}
            onPrevious={previous}
            onSeek={seekTo}
          />
        )}
      </AnimatePresence>
      {queueOpen && (
        <div className="absolute bottom-full right-4 mb-2 max-h-64 w-80 overflow-auto rounded-2xl border border-white/10 bg-[#171b24] p-3 shadow-xl">
          <h2 className="px-2 pb-2 text-sm font-semibold">
            Fila de reprodução
          </h2>
          {queue.map((item, position) => (
            <button
              key={item.id}
              type="button"
              onClick={() => play(queue, position)}
              className={`block w-full truncate rounded-lg px-2 py-2 text-left text-xs hover:bg-white/5 ${position === index ? 'text-violet-300' : 'text-slate-300'}`}
            >
              {item.title}
            </button>
          ))}
        </div>
      )}
      <audio
        ref={(element) => {
          audioRefs.current[0] = element
        }}
        {...common}
      />
      <audio
        ref={(element) => {
          audioRefs.current[1] = element
        }}
        {...common}
      />
      {track.mediaType === 'video' &&
        createPortal(
          <video
            key={source}
            ref={videoRef}
            src={source}
            {...common}
            playsInline
            className="pointer-events-none fixed z-[60] bg-black shadow-xl"
            aria-label={`Vídeo: ${track.title}`}
          />,
          document.body,
        )}
    </div>
  )
}
