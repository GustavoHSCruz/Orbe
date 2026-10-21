import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDown,
  Timer,
  Minus,
  RotateCcw,
  Disc3,
  Maximize2,
  Minimize2,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  Search,
  Image as ImageIcon,
  Film,
  ListMusic,
  Plus,
} from 'lucide-react'
import type { LibraryRecord } from '../../shared/contracts/media'
import { mediaSourceNames } from '../../shared/contracts/media-sources'
import { Button } from '@/components/ui/button'
import { useModal } from '@/components/ui/use-modal'
import { usePlayer } from '../stores/player'
import { SeekSlider } from './SeekSlider'
import { PlayerAtmosphere } from './PlayerAtmosphere'
import { LyricsStage } from './LyricsStage'
import { LyricsSearch } from './LyricsSearch'
import {
  LyricsResultSchema,
  type LyricsResult,
} from '../../shared/contracts/lyrics'
import {
  parseLyrics,
  lyricClock,
  lyricSeekTime,
  DEFAULT_LYRICS_DELAY_MS,
} from './lyrics-timing'
import { useNavigation } from '../stores/navigation'

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

function savedOverride(id: string): { title: string; artist: string } | null {
  try {
    const saved = localStorage.getItem(`orbe-lyrics:${id}`)
    return saved
      ? (JSON.parse(saved) as { title: string; artist: string })
      : null
  } catch {
    return null
  }
}

function savedLyrics(id: string): LyricsResult {
  try {
    return LyricsResultSchema.parse(
      JSON.parse(localStorage.getItem(`orbe-lyrics-result:${id}`) ?? 'null'),
    )
  } catch {
    return null
  }
}

export function ExpandedPlayer({
  track,
  artwork,
  time,
  duration,
  playing,
  onClose,
  onToggle,
  onNext,
  onPrevious,
  onSeek,
}: {
  track: LibraryRecord
  artwork: string | null
  time: number
  duration: number
  playing: boolean
  onClose: () => void
  onToggle: () => void
  onNext: () => void
  onPrevious: () => void
  onSeek: (seconds: number) => void
}) {
  const openDownloadDialog = useNavigation((state) => state.openDownloadDialog)
  const storedLyrics = useMemo(() => savedLyrics(track.id), [track.id])
  const [selection, setSelection] = useState<{
    id: string
    result: LyricsResult
  } | null>(null)
  const chosenLyrics =
    selection?.id === track.id ? selection.result : storedLyrics
  const [lookup, setLookup] = useState(() => ({
    trackId: track.id,
    open: false,
    title: track.title,
    artist: track.artist ?? '',
    override: savedOverride(track.id),
  }))
  const currentLookup =
    lookup.trackId === track.id
      ? lookup
      : {
          trackId: track.id,
          open: false,
          title: track.title,
          artist: track.artist ?? '',
          override: savedOverride(track.id),
        }
  const { open: lookupOpen, override } = currentLookup
  const updateLookup = (change: Partial<typeof currentLookup>) =>
    setLookup({ ...currentLookup, ...change })
  const lyrics = useQuery({
    queryKey: ['lyrics', track.id, override, Math.round(duration)],
    enabled: !chosenLyrics,
    queryFn: () =>
      override
        ? window.orbe.searchLyrics({
            ...override,
            durationMs:
              duration > 0 ? Math.round(duration * 1000) : track.durationMs,
          })
        : window.orbe.lyricsForTrack(track.id),
    staleTime: 3600000,
    retry: false,
  })
  const delayMs = usePlayer(
    (state) => state.lyricsDelayByTrack[track.id] ?? DEFAULT_LYRICS_DELAY_MS,
  )
  const setLyricsDelay = usePlayer((state) => state.setLyricsDelay)
  const [timingOpen, setTimingOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [panel, setPanel] = useState<'lyrics' | 'library'>('lyrics')
  const [librarySearch, setLibrarySearch] = useState('')
  const [libraryType, setLibraryType] = useState<'all' | 'audio' | 'video'>(
    'all',
  )
  const library = useQuery({
    queryKey: ['library'],
    queryFn: () => window.orbe.listLibrary(),
    enabled: panel === 'library',
  })
  const play = usePlayer((state) => state.play)
  const queueLength = usePlayer((state) => state.queue.length)
  const libraryItems = (library.data ?? []).filter(
    (item) =>
      (libraryType === 'all' || item.mediaType === libraryType) &&
      `${item.title} ${item.artist ?? ''}`
        .toLowerCase()
        .includes(librarySearch.toLowerCase()),
  )
  const visualMode = usePlayer((state) => state.visualMode)
  const setVisualMode = usePlayer((state) => state.setVisualMode)
  const videoVisible = track.mediaType === 'video' && visualMode === 'video'
  const result = chosenLyrics ?? lyrics.data
  const rows = useMemo(() => parseLyrics(result ?? null), [result])
  const modalRef = useModal<HTMLDivElement>(() => {
    if (fullscreen) void window.orbe.setFullscreen(false).then(setFullscreen)
    else onClose()
  })
  return createPortal(
    <motion.div
      ref={modalRef}
      tabIndex={-1}
      initial={
        videoVisible ? { opacity: 1 } : { opacity: 0, y: 44, scale: 0.985 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={
        videoVisible
          ? { opacity: [1, 1, 0] }
          : { opacity: 0, y: 44, scale: 0.985 }
      }
      transition={
        videoVisible
          ? { duration: 0.6, times: [0, 0.55, 1] }
          : { duration: 0.38, ease: [0.22, 1, 0.36, 1] }
      }
      className="expanded-player orbe-scroll fixed inset-0 z-50 overflow-auto bg-[#090b13] text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Player expandido"
    >
      <PlayerAtmosphere
        artwork={artwork}
        seed={track.artist ?? track.album ?? track.title}
        playing={playing}
      />
      <div className="relative mx-auto flex min-h-full max-w-[1320px] flex-col px-4 py-4 sm:px-6 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="section-eyebrow">TOCANDO AGORA</span>
            <p className="mt-1 text-xs text-slate-400">
              {mediaSourceNames[track.provider]}
            </p>
          </div>
          <div className="expanded-toolbar flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              title={panel === 'library' ? 'Ver letra' : 'Escolher mídia'}
              aria-label={panel === 'library' ? 'Ver letra' : 'Escolher mídia'}
              onClick={() =>
                setPanel(panel === 'library' ? 'lyrics' : 'library')
              }
            >
              <ListMusic size={17} />{' '}
              {panel === 'library' ? 'Ver letra' : 'Escolher mídia'}
            </Button>
            {track.mediaType === 'video' && (
              <Button
                variant="secondary"
                aria-label={
                  visualMode === 'video' ? 'Mostrar capa' : 'Mostrar vídeo'
                }
                onClick={() =>
                  setVisualMode(visualMode === 'video' ? 'artwork' : 'video')
                }
              >
                {visualMode === 'video' ? (
                  <ImageIcon size={17} />
                ) : (
                  <Film size={17} />
                )}
                {visualMode === 'video' ? 'Ver capa' : 'Ver vídeo'}
              </Button>
            )}
            <Button
              variant="secondary"
              aria-label="Novo download"
              title="Novo download"
              onClick={openDownloadDialog}
            >
              <Plus size={17} /> Novo download
            </Button>
            <Button
              variant="secondary"
              aria-label={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
              onClick={() =>
                void window.orbe.setFullscreen(!fullscreen).then(setFullscreen)
              }
            >
              {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}{' '}
              {fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            </Button>
            <Button
              variant="secondary"
              aria-label="Recolher player"
              title="Recolher player"
              onClick={() => {
                if (fullscreen) void window.orbe.setFullscreen(false)
                onClose()
              }}
            >
              <ArrowDown size={17} /> Recolher player
            </Button>
          </div>
        </div>
        <div className="player-stage-layout grid flex-1 items-center gap-6 py-5 md:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] md:gap-[5vw]">
          <div className="mx-auto w-full max-w-[min(400px,40dvh)]">
            <div
              className="relative aspect-square overflow-hidden rounded-[2rem] border border-white/12 bg-gradient-to-br from-violet-600/35 to-blue-600/25 shadow-[0_30px_110px_rgba(0,0,0,.45)]"
              data-video-target="expanded"
              data-track-id={track.id}
            >
              <AnimatePresence mode="sync" initial={false}>
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, scale: 0.94, filter: 'blur(12px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 1.05, filter: 'blur(12px)' }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0"
                  style={{ visibility: videoVisible ? 'hidden' : 'visible' }}
                >
                  {artwork ? (
                    <img
                      src={artwork}
                      alt={`Capa de ${track.title}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Disc3 size={96} className="text-white/50" />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.25 }}
                className="mt-5"
              >
                <h1 className="line-clamp-2 text-3xl font-bold tracking-tight">
                  {track.title}
                </h1>
                <p className="mt-2 text-base text-violet-200">
                  {result?.artistName ||
                    track.artist ||
                    'Artista não informado'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {track.album ? `${track.album} · ` : ''}
                  {track.format.toUpperCase()} ·{' '}
                  {mediaSourceNames[track.provider]}
                </p>
              </motion.div>
            </AnimatePresence>
            <div className="mt-5">
              <SeekSlider
                key={track.id}
                label="Posição no player expandido"
                time={time}
                duration={duration}
                onSeek={onSeek}
                className="w-full accent-violet-400"
              />
              <div className="mt-1 flex justify-between text-xs text-slate-400">
                <span>{clock(time)}</span>
                <span>{clock(Number.isFinite(duration) ? duration : 0)}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-6">
              <Button
                aria-label="Anterior"
                variant="ghost"
                size="icon"
                onClick={onPrevious}
              >
                <SkipBack size={23} />
              </Button>
              <Button
                aria-label={playing ? 'Pausar' : 'Reproduzir'}
                onClick={onToggle}
                className="!size-15 !rounded-full shadow-xl"
              >
                {playing ? (
                  <Pause size={25} fill="currentColor" />
                ) : (
                  <Play size={25} fill="currentColor" />
                )}
              </Button>
              <Button
                aria-label="Próxima"
                disabled={queueLength < 2}
                title={
                  queueLength < 2
                    ? 'Adicione outra faixa à fila'
                    : 'Próxima faixa'
                }
                variant="ghost"
                size="icon"
                onClick={onNext}
              >
                <SkipForward size={23} />
              </Button>
            </div>
          </div>
          <div
            className={`player-detail-panel flex min-h-[320px] flex-col overflow-hidden ${panel === 'library' ? 'rounded-[2rem] border border-white/10 bg-[#11141b]/55 shadow-2xl backdrop-blur-2xl' : 'player-lyrics-panel'}`}
          >
            <div className="flex shrink-0 items-center gap-3 px-5 py-4">
              <span className="flex size-9 items-center justify-center rounded-xl bg-violet-400/15 text-violet-200">
                <Music2 size={18} />
              </span>
              <div>
                <h2 className="font-bold">
                  {panel === 'lyrics' ? 'Letra' : 'Sua biblioteca'}
                </h2>
                <p className="text-xs text-slate-400">
                  {panel === 'library'
                    ? 'Escolha música ou vídeo sem fechar o player'
                    : result?.source === 'local'
                      ? 'Arquivo .lrc local'
                      : result?.source === 'lrclib'
                        ? `${result.artistName} · LRCLIB`
                        : 'Acompanhe a música'}
                </p>
              </div>
              {panel === 'lyrics' && (
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  className="ml-auto"
                  onClick={() => updateLookup({ open: !lookupOpen })}
                >
                  <Search size={14} /> Buscar letra
                </Button>
              )}
            </div>
            {panel === 'lyrics' && rows.some((row) => row.time != null) && (
              <div className="lyrics-timing">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="timing-toggle"
                  aria-expanded={timingOpen}
                  onClick={() => setTimingOpen(!timingOpen)}
                >
                  <Timer size={15} /> Sincronização{' '}
                  <span>
                    {delayMs > 0 ? '+' : ''}
                    {delayMs} ms
                  </span>
                </Button>
                {timingOpen && (
                  <div className="timing-controls">
                    <p>Letra adiantada? Aumente o atraso.</p>
                    <div>
                      <Button
                        variant="secondary"
                        size="icon"
                        type="button"
                        aria-label="Adiantar letra em 50 ms"
                        title="Adiantar 50 ms"
                        disabled={delayMs <= -5000}
                        onClick={() => setLyricsDelay(track.id, delayMs - 50)}
                      >
                        <Minus size={16} />
                      </Button>
                      <output aria-live="polite">
                        {delayMs > 0 ? '+' : ''}
                        {delayMs} ms
                      </output>
                      <Button
                        variant="secondary"
                        size="icon"
                        type="button"
                        aria-label="Atrasar letra em 50 ms"
                        title="Atrasar 50 ms"
                        disabled={delayMs >= 5000}
                        onClick={() => setLyricsDelay(track.id, delayMs + 50)}
                      >
                        <Plus size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        aria-label="Zerar ajuste da letra"
                        title="Sem atraso"
                        onClick={() => setLyricsDelay(track.id, 0)}
                      >
                        <RotateCcw size={15} />
                      </Button>
                    </div>
                    <small>Salvo automaticamente para esta faixa.</small>
                  </div>
                )}
              </div>
            )}
            {panel === 'library' ? (
              <div className="flex min-h-0 flex-1 flex-col p-5">
                <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#171b24] px-3 py-2">
                  <Search size={17} className="text-slate-400" />
                  <input
                    aria-label="Buscar mídia no player"
                    value={librarySearch}
                    onChange={(event) => setLibrarySearch(event.target.value)}
                    placeholder="Buscar na biblioteca"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                </label>
                <div
                  className="mt-3 flex gap-2"
                  role="group"
                  aria-label="Filtrar mídia no player"
                >
                  {(
                    [
                      ['all', 'Todas'],
                      ['audio', 'Músicas'],
                      ['video', 'Vídeos'],
                    ] as const
                  ).map(([type, label]) => (
                    <Button
                      key={type}
                      size="sm"
                      variant={libraryType === type ? 'default' : 'secondary'}
                      onClick={() => setLibraryType(type)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <div className="orbe-scroll mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
                  {library.isPending && (
                    <div role="status" className="space-y-2">
                      {[0, 1, 2, 3].map((number) => (
                        <div
                          key={number}
                          className="h-16 animate-pulse rounded-xl bg-white/5"
                        />
                      ))}
                    </div>
                  )}
                  {library.isError && (
                    <p
                      role="alert"
                      className="py-5 text-center text-sm text-rose-300"
                    >
                      Não foi possível carregar a biblioteca.
                    </p>
                  )}
                  {!library.isPending && !libraryItems.length && (
                    <p className="py-8 text-center text-sm text-slate-400">
                      Nenhuma mídia encontrada.
                    </p>
                  )}
                  {libraryItems.map((item, position) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => play(libraryItems, position)}
                      aria-label={`Reproduzir ${item.title} no player`}
                      className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors ${item.id === track.id ? 'border-violet-400/45 bg-violet-500/15' : 'border-transparent bg-white/4 hover:border-white/10 hover:bg-white/8'}`}
                    >
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt=""
                          className="size-12 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-violet-500/15">
                          <Music2 size={18} />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {item.title}
                        </span>
                        <span className="block truncate text-xs text-slate-400">
                          {item.artist ?? mediaSourceNames[item.provider]} ·{' '}
                          {item.mediaType === 'video' ? 'Vídeo' : 'Música'}
                        </span>
                      </span>
                      {item.id === track.id ? (
                        <span className="text-xs font-semibold text-violet-200">
                          Tocando
                        </span>
                      ) : (
                        <Play size={17} className="shrink-0 text-violet-200" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {lookupOpen && (
                  <LyricsSearch
                    key={track.id}
                    title={currentLookup.title}
                    artist={currentLookup.artist}
                    duration={duration}
                    onSelect={(result) => {
                      localStorage.setItem(
                        `orbe-lyrics-result:${track.id}`,
                        JSON.stringify(result),
                      )
                      setSelection({ id: track.id, result })
                      updateLookup({ open: false })
                    }}
                    onReset={() => {
                      localStorage.removeItem(`orbe-lyrics-result:${track.id}`)
                      localStorage.removeItem(`orbe-lyrics:${track.id}`)
                      setSelection({ id: track.id, result: null })
                      updateLookup({ override: null, open: false })
                      void lyrics.refetch()
                    }}
                  />
                )}
                {!lookupOpen && !chosenLyrics && lyrics.isPending ? (
                  <div
                    role="status"
                    aria-label="Procurando letra"
                    className="lyrics-loading"
                  >
                    <div />
                    <div />
                    <div />
                    <span>Procurando letra...</span>
                  </div>
                ) : rows.length ? (
                  <LyricsStage
                    key={`${track.id}-${override?.title ?? ''}-${override?.artist ?? ''}`}
                    rows={rows}
                    time={lyricClock(time, delayMs)}
                    playing={playing}
                    onSeek={(seconds) =>
                      onSeek(
                        Math.min(
                          duration || Infinity,
                          lyricSeekTime(seconds, delayMs),
                        ),
                      )
                    }
                  />
                ) : lookupOpen ? null : (
                  <div className="flex flex-1 flex-col items-center justify-center px-7 text-center">
                    <Volume2 size={26} className="text-violet-300" />
                    <p className="mt-4 font-semibold">
                      {lyrics.isError
                        ? 'Não foi possível buscar a letra'
                        : 'Letra não encontrada'}
                    </p>
                    <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
                      {lyrics.isError
                        ? 'O serviço de letras não respondeu. Tente novamente ou pesquise pelo nome da música.'
                        : 'Busque pelo título e escolha a versão da sua música. Você também pode usar um arquivo .lrc com o mesmo nome da mídia.'}
                    </p>
                    <Button
                      className="mt-5"
                      variant="secondary"
                      onClick={() => updateLookup({ open: true })}
                    >
                      Buscar com outro nome
                    </Button>
                    {lyrics.isError && (
                      <Button
                        variant="ghost"
                        className="mt-2"
                        onClick={() => void lyrics.refetch()}
                      >
                        Tentar novamente
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>,
    document.body,
  )
}
