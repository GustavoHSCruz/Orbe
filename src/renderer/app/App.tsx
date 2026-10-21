import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SiSpotify, SiYoutube } from 'react-icons/si'
import type { IconType } from 'react-icons'
import {
  useIsFetching,
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AudioLines,
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Download,
  Film,
  FolderHeart,
  History,
  Home,
  Headphones,
  ListChecks,
  ListMusic,
  LoaderCircle,
  Music2,
  PlugZap,
  Play,
  Pause,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import type {
  MediaAnalysis,
  MediaFormat,
  Settings,
} from '../../shared/contracts/media'
import { AnalyzeRequestSchema } from '../../shared/contracts/media'
import { mediaSourceNames } from '../../shared/contracts/media-sources'
import { Button } from '@/components/ui/button'
import { useModal } from '@/components/ui/use-modal'
import { DownloadList } from './DownloadList'
import { DownloadActivity } from './DownloadActivity'
import { SettingsPage } from './SettingsPage'
import { LibraryPage } from './LibraryPage'
import { ListeningHome } from './ListeningHome'
import { SourceInputMark, SourceRecognition } from './SourceRecognition'
import { PlayerBar } from './PlayerBar'
import { SpotifyPage } from './SpotifyPage'
import { PlaylistsPage } from './PlaylistsPage'
import { LocalPlaylistsPage } from './LocalPlaylistsPage'
import { Onboarding } from './Onboarding'
import { IntegrationsPage } from './IntegrationsPage'
import { ConverterPage } from './ConverterPage'
import { formatDescription, formatSize, simpleFormats } from './format-guide'
import { preferredFormat } from './preferred-format'
import { useNavigation, type Page } from '../stores/navigation'
import brandMark from '@orbe/brand/mark.svg'
import { LibraryHealthNotice } from './LibraryFolders'

const navigationGroups: {
  title: string
  items: { page: Page; label: string; icon: typeof Home | IconType }[]
}[] = [
  {
    title: 'Biblioteca',
    items: [
      { page: 'home', label: 'Início', icon: Home },
      { page: 'library', label: 'Biblioteca', icon: FolderHeart },
    ],
  },
  {
    title: 'Playlists',
    items: [
      { page: 'playlists', label: 'Suas playlists', icon: ListMusic },
      {
        page: 'youtube-playlists',
        label: 'Playlists do YouTube',
        icon: SiYoutube,
      },
    ],
  },
  {
    title: 'Ferramentas',
    items: [
      { page: 'downloads', label: 'Downloads', icon: Download },
      { page: 'history', label: 'Histórico', icon: History },
      { page: 'converter', label: 'Converter mídia', icon: SlidersHorizontal },
      { page: 'spotify', label: 'Spotify', icon: SiSpotify },
      { page: 'integrations', label: 'Integrações', icon: PlugZap },
    ],
  },
]
const navigation = [
  ...navigationGroups.flatMap((group) => group.items),
  { page: 'settings' as const, label: 'Configurações', icon: Settings2 },
]

function errorMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message : 'Ocorreu um erro inesperado.'
  if (message.includes('ENOENT') || message.includes('spawn yt-dlp'))
    return 'Engine de mídia não encontrado. Configure ORBE_YT_DLP_PATH para o executável oficial do yt-dlp.'
  return message
    .replace(/^Error invoking remote method '[^']+': Error: /, '')
    .slice(0, 350)
}

function youtubeCoverFallback(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (
      parsed.hostname !== 'youtube.com' &&
      !parsed.hostname.endsWith('.youtube.com')
    )
      return null
    const id = parsed.searchParams.get('v')
    return id && /^[A-Za-z0-9_-]{11}$/.test(id)
      ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
      : null
  } catch {
    return null
  }
}

function MediaCover({
  src,
  fallback,
  alt,
  className,
}: {
  src: string | null
  fallback: string | null
  alt: string
  className: string
}) {
  const [imageSrc, setImageSrc] = useState(src ?? fallback)
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden bg-[#252b38] ${className}`}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() =>
            setImageSrc((current) =>
              current !== fallback && fallback ? fallback : null,
            )
          }
        />
      ) : (
        <AudioLines role="img" aria-label={alt} className="text-slate-500" />
      )}
    </div>
  )
}

function FormatCards({
  options,
  selected,
  onSelect,
  favorite,
}: {
  options: MediaFormat[]
  selected: MediaFormat | undefined
  onSelect: (format: MediaFormat) => void
  favorite: MediaFormat | undefined
}) {
  const shown = simpleFormats(
    options,
    selected?.mediaType ?? options[0]?.mediaType ?? 'video',
  )
  for (const highlighted of [favorite, selected]) {
    if (highlighted && !shown.some((item) => item.id === highlighted.id)) {
      if (shown.length >= 4) shown.pop()
      shown.push(highlighted)
    }
  }
  if (!shown.length)
    return (
      <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100">
        Nenhum formato disponível para esta escolha.
      </p>
    )
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {shown.map((item) => {
        const active = selected?.id === item.id
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(item)}
            className={`format-choice group rounded-2xl border p-4 text-left transition-all focus-visible:outline-2 focus-visible:outline-violet-400 ${active ? 'border-violet-400/70 bg-gradient-to-br from-violet-500/18 to-blue-500/8 shadow-[0_0_0_3px_rgba(139,92,246,.09)]' : 'border-white/9 bg-white/3 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/6'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-lg border border-white/10 bg-white/9 px-2.5 py-1 text-xs font-extrabold tracking-wide">
                {item.extension.toUpperCase()}
              </span>
              <span
                className={`flex size-5 items-center justify-center rounded-full border ${active ? 'border-violet-300 bg-violet-500 text-white' : 'border-white/25'}`}
              >
                {active && <Check size={13} strokeWidth={3} />}
              </span>
            </div>
            <p className="mt-3 text-base font-bold">{item.quality}</p>
            <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-slate-400">
              {formatDescription(item)}
            </p>
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/8 pt-3 text-xs">
              <span className="text-slate-400">{formatSize(item)}</span>
              {favorite?.id === item.id && (
                <span className="font-semibold text-violet-300">
                  Seu favorito
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

export function MediaChoices({
  analysis,
  onClose,
}: {
  analysis: MediaAnalysis
  onClose?: () => void
}) {
  const modalRef = useModal<HTMLElement>(() => onClose?.())
  const { setPage } = useNavigation()
  const queryClient = useQueryClient()
  const preferenceQuery = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.orbe.getSettings(),
  })
  const preference = preferenceQuery.data?.preferredDownload
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const previewRef = useRef<HTMLAudioElement>(null)
  const previewRequest = useRef(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState('')
  const [previewLoading, setPreviewLoading] = useState<string | null>(null)
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [previewProgress, setPreviewProgress] = useState(0)
  const kindChanged = useRef(false)
  const [kind, setKind] = useState<'audio' | 'video'>(
    () =>
      queryClient.getQueryData<Settings>(['settings'])?.preferredDownload
        .kind ?? 'video',
  )
  const [formatId, setFormatId] = useState('')
  const [advanced, setAdvanced] = useState(false)
  const [selectedIndices, setSelectedIndices] = useState<number[]>(
    analysis.items.map((_, index) => index),
  )
  const [playlistItems, setPlaylistItems] = useState(analysis.items)
  const selectedItems = selectedIndices
    .map((index) => playlistItems[index]?.url)
    .filter((url): url is string => url != null)
  const [nextPage, setNextPage] = useState(analysis.nextPage ?? null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [playlistMode, setPlaylistMode] = useState<'same' | 'individual'>(
    'same',
  )
  const [prepared, setPrepared] = useState<Record<string, MediaAnalysis>>({})
  const [itemFormats, setItemFormats] = useState<Record<string, string>>({})
  const [sharedFormat, setSharedFormat] = useState('')
  const [preparing, setPreparing] = useState(false)
  const [preparingCount, setPreparingCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const formats = analysis.formats.filter((format) => format.mediaType === kind)
  const format =
    formats.find((item) => item.id === formatId) ??
    preferredFormat(analysis.formats, kind, preference)
  const formatKey = (item: MediaFormat) =>
    item.mediaType === 'audio'
      ? item.extension.toLowerCase()
      : `${item.quality}|${item.extension.toLowerCase()}`
  const preparedEntries = selectedItems
    .map((url) => prepared[url])
    .filter((item) => item != null)
  const commonFormats =
    preparedEntries.length === selectedItems.length && selectedItems.length
      ? preparedEntries[0]!.formats.filter(
          (option) =>
            option.mediaType === kind &&
            preparedEntries.every((entry) =>
              entry.formats.some(
                (candidate) =>
                  candidate.mediaType === kind &&
                  formatKey(candidate) === formatKey(option),
              ),
            ),
        )
      : []
  const preferredCommon = preferredFormat(commonFormats, kind, preference)
  const start = useMutation({
    mutationFn: async (input: {
      url: string
      format: MediaFormat
      analysis: MediaAnalysis
    }) => {
      const { url, format: chosen, analysis: media } = input
      return window.orbe.startDownload({
        url,
        title: media.title,
        provider: media.provider,
        mediaType: chosen.mediaType,
        formatId: chosen.id,
        extension: chosen.extension,
        hasAudio: chosen.hasAudio,
        quality: chosen.quality,
        thumbnail: media.thumbnail,
        artist: media.artist,
        channel: media.channel,
        durationMs: media.durationMs,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['downloads'] })
    },
    onError: (cause) => setError(errorMessage(cause)),
  })

  useEffect(() => {
    if (preference && !kindChanged.current) setKind(preference.kind)
  }, [preference])

  useEffect(() => {
    const audio = previewRef.current
    return () => {
      previewRequest.current += 1
      audio?.pause()
    }
  }, [])

  async function togglePreview(url: string, title: string): Promise<void> {
    const audio = previewRef.current
    if (!audio) return
    if (previewUrl === url && audio.src) {
      if (audio.paused) await audio.play()
      else audio.pause()
      setPreviewPlaying(!audio.paused)
      return
    }
    const request = ++previewRequest.current
    audio.pause()
    setPreviewPlaying(false)
    setPreviewLoading(url)
    setError('')
    try {
      const source = await window.orbe.previewAudio(url)
      if (request !== previewRequest.current) return
      audio.src = source
      audio.load()
      await audio.play()
      setPreviewUrl(url)
      setPreviewTitle(title)
      setPreviewProgress(0)
      setPreviewPlaying(true)
    } catch (cause) {
      if (request === previewRequest.current) setError(errorMessage(cause))
    } finally {
      if (request === previewRequest.current) setPreviewLoading(null)
    }
  }

  async function advance(): Promise<void> {
    setError('')
    if (step === 0) {
      setStep(1)
      if (analysis.isPlaylist)
        void preparePlaylist().catch((cause) => setError(errorMessage(cause)))
      return
    }
    if (analysis.isPlaylist) {
      try {
        const entries = await preparePlaylist()
        if (
          playlistMode === 'same' &&
          !entries[selectedItems[0] ?? '']?.formats.some(
            (option) =>
              option.mediaType === kind &&
              selectedItems.every((url) =>
                entries[url]?.formats.some(
                  (candidate) =>
                    candidate.mediaType === kind &&
                    formatKey(candidate) === formatKey(option),
                ),
              ),
          )
        )
          throw new Error(
            'Não há formato comum. Escolha qualidade individual para continuar.',
          )
      } catch (cause) {
        setError(errorMessage(cause))
        return
      }
    }
    setStep(2)
  }

  async function submit(): Promise<void> {
    if (analysis.isPlaylist) {
      await startPlaylist()
      return
    }
    if (!format) return
    try {
      await start.mutateAsync({ url: analysis.sourceUrl, format, analysis })
      setPage('downloads')
      onClose?.()
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  async function loadMore(): Promise<void> {
    if (nextPage == null) return
    setLoadingMore(true)
    setError('')
    try {
      const next = await window.orbe.analyze(analysis.sourceUrl, {
        mode: 'playlist',
        page: nextPage,
      })
      if (!next.isPlaylist)
        throw new Error('Não foi possível carregar a playlist.')
      const newItems = next.items
      const selectNew = playlistItems.every((_, index) =>
        selectedIndices.includes(index),
      )
      setPlaylistItems((current) => [...current, ...newItems])
      if (selectNew)
        setSelectedIndices((current) => [
          ...current,
          ...newItems.map((_, index) => playlistItems.length + index),
        ])
      setNextPage(newItems.length > 0 ? (next.nextPage ?? null) : null)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setLoadingMore(false)
    }
  }

  async function preparePlaylist(): Promise<Record<string, MediaAnalysis>> {
    setPreparing(true)
    setPreparingCount(0)
    try {
      const next = { ...prepared }
      for (const url of selectedItems) {
        if (!next[url]) next[url] = await window.orbe.analyze(url)
        setPreparingCount((count) => count + 1)
      }
      setPrepared(next)
      return next
    } finally {
      setPreparing(false)
    }
  }

  async function startPlaylist(): Promise<void> {
    setError('')
    setSubmitting(true)
    try {
      const entries = await preparePlaylist()
      const first = entries[selectedItems[0] ?? '']
      const common =
        first?.formats.filter(
          (option) =>
            option.mediaType === kind &&
            selectedItems.every((url) =>
              entries[url]?.formats.some(
                (candidate) =>
                  candidate.mediaType === kind &&
                  formatKey(candidate) === formatKey(option),
              ),
            ),
        ) ?? []
      const chosenKey =
        sharedFormat &&
        common.some((option) => formatKey(option) === sharedFormat)
          ? sharedFormat
          : preferredFormat(common, kind, preference)
            ? formatKey(preferredFormat(common, kind, preference)!)
            : ''
      if (playlistMode === 'same' && !chosenKey)
        throw new Error(
          'Não há formato comum para os itens selecionados. Configure individualmente.',
        )
      for (const url of selectedItems) {
        const item = entries[url]
        if (!item)
          throw new Error('Não foi possível analisar um item da playlist.')
        const options = item.formats.filter(
          (option) => option.mediaType === kind,
        )
        const available =
          playlistMode === 'same'
            ? options.find((option) => formatKey(option) === chosenKey)
            : (options.find((option) => option.id === itemFormats[url]) ??
              preferredFormat(options, kind, preference))
        if (!available) throw new Error(`Formato indisponível: ${item.title}`)
        await start.mutateAsync({ url, format: available, analysis: item })
      }
      setPage('downloads')
      onClose?.()
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#05060b]/85 p-3 text-white backdrop-blur-xl sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <motion.section
        ref={modalRef}
        tabIndex={-1}
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        role="dialog"
        aria-modal="true"
        aria-label="Preparar download"
        className={`flex w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/12 bg-[#11141b] shadow-[0_32px_110px_rgba(0,0,0,.65)] ${analysis.isPlaylist ? 'h-[min(92dvh,900px)]' : 'max-h-[92dvh]'}`}
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/8 px-5 py-4 sm:px-7">
          <div>
            <p className="section-eyebrow">NOVO DOWNLOAD</p>
            <h2 className="mt-1 text-lg font-bold">Prepare sua mídia</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-slate-400 sm:block">
              Etapa {step + 1} de 3
            </span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Fechar preparação do download"
              onClick={onClose}
            >
              <X size={19} />
            </Button>
          </div>
        </header>
        <div className="grid shrink-0 grid-cols-3 border-b border-white/8 px-5 sm:px-7">
          {(['Escolher mídia', 'Formato', 'Revisar'] as const).map(
            (label, index) => (
              <div
                key={label}
                aria-current={step === index ? 'step' : undefined}
                className={`border-b-2 py-3 text-center text-xs font-semibold sm:text-sm ${step === index ? 'border-violet-400 text-violet-200' : index < step ? 'border-emerald-400/60 text-emerald-200' : 'border-transparent text-slate-500'}`}
              >
                <span className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-white/8 text-[10px]">
                  {index < step ? <Check size={12} /> : index + 1}
                </span>
                {label}
              </div>
            ),
          )}
        </div>
        <div className="orbe-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <div className="flex items-center gap-5 rounded-2xl border border-white/8 bg-white/3 p-3">
            <MediaCover
              src={analysis.thumbnail}
              fallback={youtubeCoverFallback(analysis.sourceUrl)}
              alt={`Capa de ${analysis.title}`}
              className="aspect-video w-28 rounded-xl sm:w-40"
            />
            <div className="min-w-0 flex-1">
              <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-300">
                {mediaSourceNames[analysis.provider]}
              </span>
              <h3 className="mt-2 line-clamp-2 text-base font-semibold leading-snug sm:text-lg">
                {analysis.title}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {analysis.channel ??
                  analysis.artist ??
                  (analysis.isPlaylist
                    ? 'Playlist de vídeos'
                    : 'Autor não informado')}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {analysis.isPlaylist
                  ? `${playlistItems.length} itens carregados`
                  : analysis.durationMs
                    ? `${Math.floor(analysis.durationMs / 60000)} min`
                    : 'Duração não informada'}
              </p>
            </div>
          </div>
          {step === 1 && (
            <div className="mt-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                O que você quer guardar?
              </p>
              <div
                role="group"
                aria-label="Tipo de download"
                className="grid gap-3 sm:grid-cols-2"
              >
                {(
                  [
                    {
                      value: 'video',
                      label: 'Vídeo completo',
                      hint: 'Imagem e som juntos',
                      icon: Film,
                    },
                    {
                      value: 'audio',
                      label: 'Só o áudio',
                      hint: 'Música ou fala, sem imagem',
                      icon: Music2,
                    },
                  ] as const
                ).map(({ value, label, hint, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    aria-label={value === 'video' ? 'Vídeo' : 'Áudio'}
                    aria-pressed={kind === value}
                    onClick={() => {
                      kindChanged.current = true
                      setKind(value)
                      setFormatId('')
                      setSharedFormat('')
                    }}
                    className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition-all focus-visible:outline-2 focus-visible:outline-violet-400 ${kind === value ? 'border-violet-400/70 bg-violet-500/13 shadow-[0_0_0_3px_rgba(139,92,246,.09)]' : 'border-white/10 bg-white/3 hover:border-white/25 hover:bg-white/6'}`}
                  >
                    <span
                      className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${kind === value ? 'bg-violet-500/25 text-violet-200' : 'bg-white/7 text-slate-400'}`}
                    >
                      <Icon size={21} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">{label}</span>
                      <span className="mt-1 block text-xs text-slate-400">
                        {hint}
                      </span>
                    </span>
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${kind === value ? 'border-violet-300 bg-violet-500' : 'border-white/25'}`}
                    >
                      {kind === value && <Check size={13} strokeWidth={3} />}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {analysis.isPlaylist ? (
            <>
              {step === 0 && (
                <>
                  <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/8 pb-4">
                    <div>
                      <strong className="text-base">Itens da playlist</strong>
                      <p className="mt-1 text-xs text-slate-400">
                        {selectedItems.length} selecionados de{' '}
                        {playlistItems.length} carregados
                      </p>
                    </div>
                    <div
                      role="group"
                      aria-label="Ações de seleção"
                      className="playlist-actions flex gap-2"
                    >
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="playlist-select-all border border-violet-400/30 bg-violet-500/12 text-violet-200 hover:bg-violet-500/20"
                        onClick={() =>
                          setSelectedIndices(
                            playlistItems.map((_, index) => index),
                          )
                        }
                      >
                        <ListChecks size={16} />
                        Selecionar todos
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="border border-white/12 bg-white/5"
                        disabled={!selectedItems.length}
                        onClick={() => setSelectedIndices([])}
                      >
                        <X size={16} />
                        Desmarcar
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {playlistItems.map((item, index) => (
                      <div
                        key={`${item.url}-${index}`}
                        className="flex items-center gap-2"
                      >
                        <button
                          type="button"
                          role="checkbox"
                          aria-label={item.title}
                          aria-checked={selectedIndices.includes(index)}
                          data-selected={selectedIndices.includes(index)}
                          onClick={() =>
                            setSelectedIndices((current) =>
                              current.includes(index)
                                ? current.filter((value) => value !== index)
                                : [...current, index].sort((a, b) => a - b),
                            )
                          }
                          className={`playlist-row flex min-w-0 flex-1 cursor-pointer items-center gap-4 rounded-2xl border p-3 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-violet-400 ${selectedIndices.includes(index) ? 'border-violet-400/35 bg-violet-500/10 hover:bg-violet-500/15' : 'border-white/8 bg-[#171b24] hover:border-white/20 hover:bg-[#202632]'}`}
                        >
                          <span
                            aria-hidden="true"
                            className={`flex size-5 shrink-0 items-center justify-center rounded-md border ${selectedIndices.includes(index) ? 'border-violet-400 bg-violet-500 text-white' : 'border-slate-500 bg-transparent'}`}
                          >
                            {selectedIndices.includes(index) && (
                              <Check size={14} strokeWidth={3} />
                            )}
                          </span>
                          <MediaCover
                            src={item.thumbnail}
                            fallback={youtubeCoverFallback(item.url)}
                            alt={`Capa de ${item.title}`}
                            className="aspect-video w-24 rounded-lg"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-slate-100">
                              {item.title}
                            </span>
                            <span className="mt-1 block text-xs text-slate-400">
                              {String(index + 1).padStart(2, '0')}
                              {item.durationMs != null &&
                                ` · ${Math.floor(item.durationMs / 60000)}:${String(Math.floor(item.durationMs / 1000) % 60).padStart(2, '0')}`}
                            </span>
                          </span>
                        </button>
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          title={`Ouvir prévia de ${item.title}`}
                          aria-label={`Ouvir prévia de ${item.title}`}
                          disabled={previewLoading === item.url}
                          onClick={() =>
                            void togglePreview(item.url, item.title)
                          }
                        >
                          {previewLoading === item.url ? (
                            <LoaderCircle size={17} className="animate-spin" />
                          ) : previewUrl === item.url && previewPlaying ? (
                            <Pause size={17} />
                          ) : (
                            <Headphones size={17} />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                  {nextPage != null && (
                    <Button
                      className="mt-3"
                      size="sm"
                      variant="secondary"
                      disabled={loadingMore}
                      onClick={() => void loadMore()}
                    >
                      {loadingMore && (
                        <LoaderCircle size={16} className="animate-spin" />
                      )}
                      {loadingMore
                        ? 'Carregando mais...'
                        : 'Carregar mais 25 itens'}
                    </Button>
                  )}
                </>
              )}
              {step === 1 && (
                <>
                  <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold">
                        Como você quer salvar a playlist?
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Escolha um formato para todos ou ajuste cada item.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!selectedItems.length || preparing}
                      onClick={() =>
                        void preparePlaylist().catch((cause) =>
                          setError(errorMessage(cause)),
                        )
                      }
                    >
                      {preparing && (
                        <LoaderCircle size={16} className="animate-spin" />
                      )}
                      {preparing
                        ? 'Analisando formatos...'
                        : preparedEntries.length === selectedItems.length
                          ? 'Atualizar formatos'
                          : 'Carregar formatos'}
                    </Button>
                  </div>
                  <div
                    role="group"
                    aria-label="Qualidade da playlist"
                    className="mt-4 grid gap-3 sm:grid-cols-2"
                  >
                    {(
                      [
                        {
                          value: 'same',
                          title: 'Mesma escolha para todos',
                          description: 'Mais rápido e consistente',
                        },
                        {
                          value: 'individual',
                          title: 'Personalizar cada item',
                          description: 'Escolha a qualidade por vídeo',
                        },
                      ] as const
                    ).map(({ value, title, description }) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={playlistMode === value}
                        onClick={() => setPlaylistMode(value)}
                        className={`rounded-2xl border p-4 text-left transition-colors ${playlistMode === value ? 'border-violet-400/60 bg-violet-500/12' : 'border-white/10 bg-white/3 hover:border-white/25'}`}
                      >
                        <span className="block text-sm font-bold">{title}</span>
                        <span className="mt-1 block text-xs text-slate-400">
                          {description}
                        </span>
                      </button>
                    ))}
                  </div>
                  {preparing && (
                    <p
                      role="status"
                      className="mt-4 flex items-center gap-2 text-sm text-violet-200"
                    >
                      <LoaderCircle size={16} className="animate-spin" />
                      Buscando opções de qualidade: {preparingCount} de{' '}
                      {selectedItems.length}
                    </p>
                  )}
                  {playlistMode === 'same' && commonFormats.length > 0 && (
                    <>
                      <FormatCards
                        options={commonFormats}
                        selected={
                          commonFormats.find(
                            (item) => formatKey(item) === sharedFormat,
                          ) ?? preferredCommon
                        }
                        onSelect={(item) => setSharedFormat(formatKey(item))}
                        favorite={preferredCommon}
                      />
                      <button
                        type="button"
                        aria-label={
                          advanced
                            ? 'Ocultar opções avançadas'
                            : 'Mostrar opções avançadas'
                        }
                        aria-expanded={advanced}
                        onClick={() => setAdvanced((value) => !value)}
                        className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#1b1f2b] p-4 text-left hover:border-violet-400/35 focus-visible:outline-2 focus-visible:outline-violet-400"
                      >
                        <span className="flex size-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                          <SlidersHorizontal size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold">
                            Opções avançadas
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-400">
                            Todos os formatos compatíveis com a playlist
                          </span>
                        </span>
                        <ChevronDown
                          size={18}
                          className={`text-slate-400 transition-transform ${advanced ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {advanced && (
                        <select
                          aria-label="Formato comum da playlist"
                          value={
                            sharedFormat ||
                            (preferredCommon ? formatKey(preferredCommon) : '')
                          }
                          onChange={(event) =>
                            setSharedFormat(event.target.value)
                          }
                          className="mt-3 w-full rounded-xl border border-white/10 bg-[#171b24] px-3 py-3 text-sm"
                        >
                          {commonFormats.map((option) => (
                            <option key={option.id} value={formatKey(option)}>
                              {option.quality} ·{' '}
                              {option.extension.toUpperCase()} ·{' '}
                              {option.codec ?? 'Codec não informado'} ·{' '}
                              {formatSize(option)}
                            </option>
                          ))}
                        </select>
                      )}
                    </>
                  )}
                  {playlistMode === 'same' &&
                    !preparing &&
                    preparedEntries.length === selectedItems.length &&
                    !commonFormats.length && (
                      <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100">
                        Os itens não oferecem um formato em comum. Escolha
                        “Personalizar cada item”.
                      </p>
                    )}
                  {playlistMode === 'individual' &&
                    selectedItems.map((url) => {
                      const item = prepared[url]
                      if (!item) return null
                      const options = item.formats.filter(
                        (option) => option.mediaType === kind,
                      )
                      return (
                        <label
                          key={url}
                          className="mt-3 flex items-center gap-3 text-sm"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {item.title}
                          </span>
                          <select
                            aria-label={`Formato de ${item.title}`}
                            value={
                              itemFormats[url] ??
                              preferredFormat(options, kind, preference)?.id ??
                              ''
                            }
                            onChange={(event) =>
                              setItemFormats((current) => ({
                                ...current,
                                [url]: event.target.value,
                              }))
                            }
                            className="max-w-60 rounded-xl bg-[#171b24] px-3 py-2"
                          >
                            {options.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.quality} ·{' '}
                                {option.extension.toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </label>
                      )
                    })}
                </>
              )}
            </>
          ) : (
            <>
              {step === 0 && (
                <div className="mt-6 rounded-2xl border border-violet-400/15 bg-violet-500/6 p-5">
                  <h3 className="text-base font-bold">
                    Este é o conteúdo escolhido
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Ouça um trecho antes de escolher MP3, MP4 ou outra opção. A
                    prévia fica em um arquivo temporário e não entra na sua
                    biblioteca.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-4"
                    disabled={previewLoading === analysis.sourceUrl}
                    onClick={() =>
                      void togglePreview(analysis.sourceUrl, analysis.title)
                    }
                  >
                    {previewLoading === analysis.sourceUrl ? (
                      <LoaderCircle size={17} className="animate-spin" />
                    ) : previewUrl === analysis.sourceUrl && previewPlaying ? (
                      <Pause size={17} />
                    ) : (
                      <Headphones size={17} />
                    )}
                    {previewLoading === analysis.sourceUrl
                      ? 'Preparando prévia...'
                      : previewUrl === analysis.sourceUrl && previewPlaying
                        ? 'Pausar prévia'
                        : 'Ouvir prévia de 30 segundos'}
                  </Button>
                </div>
              )}
              {step === 1 && (
                <>
                  <div className="mt-6 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold">
                        Como você quer salvar?
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Escolha pelo formato e pela qualidade. Você pode ver os
                        detalhes técnicos se quiser.
                      </p>
                    </div>
                    <span className="rounded-full bg-violet-400/10 px-2.5 py-1 text-[11px] font-semibold text-violet-200">
                      Escolha simples
                    </span>
                  </div>
                  <FormatCards
                    options={formats}
                    selected={format}
                    onSelect={(item) => setFormatId(item.id)}
                    favorite={preferredFormat(formats, kind, preference)}
                  />
                  <button
                    type="button"
                    aria-label={
                      advanced
                        ? 'Ocultar opções avançadas'
                        : 'Mostrar opções avançadas'
                    }
                    aria-expanded={advanced}
                    onClick={() => setAdvanced((value) => !value)}
                    className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#1b1f2b] p-4 text-left transition-colors hover:border-violet-400/35 hover:bg-[#222638] focus-visible:outline-2 focus-visible:outline-violet-400"
                  >
                    <span className="flex size-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                      <SlidersHorizontal size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">
                        Opções avançadas
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-400">
                        Ver codecs, tamanho e todos os formatos da fonte
                      </span>
                    </span>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 transition-transform ${advanced ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {advanced && (
                    <div className="mt-3 rounded-2xl border border-white/8 bg-[#171b24] p-4">
                      <label
                        htmlFor="media-format"
                        className="block text-xs font-semibold text-slate-300"
                      >
                        Todos os formatos da fonte
                      </label>
                      <select
                        id="media-format"
                        value={format?.id ?? ''}
                        onChange={(event) => setFormatId(event.target.value)}
                        className="mt-2 h-12 w-full rounded-xl border border-white/8 bg-[#10131a] px-4 text-sm text-white"
                      >
                        {formats.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.quality} · {item.extension.toUpperCase()} ·{' '}
                            {item.codec ?? 'codec não informado'} ·{' '}
                            {formatSize(item)}
                            {!item.hasAudio && item.mediaType === 'video'
                              ? ' · áudio combinado ao baixar'
                              : ''}
                          </option>
                        ))}
                      </select>
                      <div className="mt-3 space-y-1 text-xs leading-5 text-slate-400">
                        <p>
                          <strong className="text-slate-200">Resolução:</strong>{' '}
                          mais pixels deixam a imagem mais nítida, mas podem
                          aumentar o arquivo.
                        </p>
                        <p>
                          <strong className="text-slate-200">Codec:</strong>{' '}
                          método de compressão usado pelo arquivo. MP4 costuma
                          ter suporte mais amplo.
                        </p>
                        <p>
                          <strong className="text-slate-200">Tamanho:</strong>{' '}
                          estimativa da fonte; o arquivo final pode mudar após a
                          conversão.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {step === 2 && (
            <div className="mt-6 space-y-5">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/6 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
                  Pronto para baixar
                </p>
                <h3 className="mt-2 text-xl font-bold">
                  {analysis.isPlaylist
                    ? `${selectedItems.length} itens selecionados`
                    : analysis.title}
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  {kind === 'audio' ? 'Música' : 'Vídeo'} ·{' '}
                  {analysis.isPlaylist
                    ? playlistMode === 'same'
                      ? (commonFormats
                          .find((item) => formatKey(item) === sharedFormat)
                          ?.extension.toUpperCase() ??
                        preferredCommon?.extension.toUpperCase() ??
                        'Formato comum')
                      : 'Formato por item'
                    : `${format?.extension.toUpperCase() ?? ''} · ${format?.quality ?? ''}`}
                </p>
              </div>
              {analysis.isPlaylist && (
                <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Seleção
                  </p>
                  {selectedIndices.slice(0, 5).map((index) => (
                    <p key={index} className="truncate py-1 text-sm">
                      {playlistItems[index]?.title}
                    </p>
                  ))}
                  {selectedIndices.length > 5 && (
                    <p className="mt-2 text-xs text-slate-400">
                      E mais {selectedIndices.length - 5} itens.
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs leading-5 text-slate-400">
                O download será adicionado à fila. Você poderá acompanhar o
                progresso na aba Downloads.
              </p>
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/6 p-3 text-sm text-rose-200"
            >
              <p>{error}</p>
              {/YouTube pediu uma verificação/i.test(error) && (
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => {
                    onClose?.()
                    setPage('integrations')
                  }}
                >
                  Configurar sessão do YouTube <ArrowUpRight size={16} />
                </Button>
              )}
            </div>
          )}
        </div>
        <audio
          ref={previewRef}
          onTimeUpdate={(event) => {
            const audio = event.currentTarget
            setPreviewProgress(
              audio.duration > 0 ? audio.currentTime / audio.duration : 0,
            )
          }}
          onEnded={() => setPreviewPlaying(false)}
          onPause={() => setPreviewPlaying(false)}
          onPlay={() => setPreviewPlaying(true)}
        />
        <footer className="shrink-0 border-t border-white/8 bg-[#151923] px-5 py-4 sm:px-7">
          {(previewUrl || previewLoading) && (
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-200">
                {previewLoading ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Headphones size={16} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">
                  {previewLoading
                    ? 'Preparando trecho de áudio...'
                    : previewTitle}
                </p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-violet-400 transition-[width]"
                    style={{ width: `${previewProgress * 100}%` }}
                  />
                </div>
              </div>
              {previewUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  aria-label={
                    previewPlaying ? 'Pausar prévia' : 'Reproduzir prévia'
                  }
                  onClick={() => void togglePreview(previewUrl, previewTitle)}
                >
                  {previewPlaying ? <Pause size={17} /> : <Play size={17} />}
                </Button>
              )}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={step === 0 || preparing || submitting}
              onClick={() => setStep((current) => (current === 2 ? 1 : 0))}
            >
              <ArrowLeft size={16} /> Voltar
            </Button>
            <Button
              type="button"
              disabled={
                preparing ||
                submitting ||
                start.isPending ||
                (analysis.isPlaylist && selectedItems.length === 0) ||
                (step === 1 && !analysis.isPlaylist && !format)
              }
              onClick={() => void (step === 2 ? submit() : advance())}
            >
              {(preparing || submitting || start.isPending) && (
                <LoaderCircle size={16} className="animate-spin" />
              )}
              {submitting || start.isPending
                ? 'Adicionando à fila...'
                : preparing
                  ? 'Analisando formatos...'
                  : step === 0
                    ? 'Próximo: formato'
                    : step === 1
                      ? 'Revisar download'
                      : analysis.isPlaylist
                        ? `Baixar ${selectedItems.length} itens`
                        : 'Iniciar download'}
            </Button>
          </div>
        </footer>
      </motion.section>
    </div>,
    document.body,
  )
}

export function hasYoutubePlaylistChoice(input: string): boolean {
  try {
    const url = new URL(input)
    const host = url.hostname.toLowerCase()
    const isYoutube =
      host === 'youtube.com' ||
      host.endsWith('.youtube.com') ||
      host === 'youtu.be'
    const videoId =
      host === 'youtu.be'
        ? url.pathname.slice(1)
        : url.pathname === '/watch'
          ? url.searchParams.get('v')
          : null
    return (
      isYoutube &&
      /^[A-Za-z0-9_-]{11}$/.test(videoId ?? '') &&
      !!url.searchParams.get('list')
    )
  } catch {
    return false
  }
}

function QuickDownloadDialog({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState('')
  const [choiceUrl, setChoiceUrl] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<MediaAnalysis | null>(null)
  const modalRef = useModal<HTMLElement>(onClose, !analysis)
  const analyze = useMutation({
    mutationFn: (input: { url: string; mode?: 'video' | 'playlist' }) =>
      window.orbe.analyze(input.url, input.mode ? { mode: input.mode } : {}),
    onSuccess: (result) => setAnalysis(result),
  })
  if (analysis) return <MediaChoices analysis={analysis} onClose={onClose} />
  const submit = (mode?: 'video' | 'playlist') => {
    if (analyze.isPending) return
    try {
      const input = AnalyzeRequestSchema.parse({ url: url.trim() }).url
      if (!mode && hasYoutubePlaylistChoice(input)) {
        setChoiceUrl(input)
        return
      }
      setChoiceUrl(null)
      analyze.mutate(mode ? { url: input, mode } : { url: input })
    } catch {
      // Native URL validation keeps the form focused until it is valid.
    }
  }
  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-[#05060b]/85 px-4 pt-[min(18dvh,150px)] backdrop-blur-xl"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <motion.section
        ref={modalRef}
        tabIndex={-1}
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        role="dialog"
        aria-modal="true"
        aria-label="Novo download"
        className="w-full max-w-xl rounded-[1.75rem] border border-white/12 bg-[#171b25] p-6 text-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-eyebrow">ADICIONAR MÍDIA</p>
            <h2 className="mt-2 text-2xl font-bold">Novo download</h2>
            <p className="mt-2 text-sm text-slate-400">
              Cole um link para escolher o vídeo ou a música e como quer salvar.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label="Fechar"
            onClick={onClose}
          >
            <X size={20} />
          </Button>
        </div>
        <form
          className="mt-6 flex gap-2 rounded-2xl border border-white/15 bg-[#0f121a] p-2"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <SourceInputMark url={url} />
          <input
            data-modal-autofocus
            aria-label="Link para baixar"
            type="url"
            required
            pattern="https://.*"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value)
              setChoiceUrl(null)
            }}
            placeholder="https://..."
            className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
          />
          <Button type="submit" disabled={analyze.isPending}>
            {analyze.isPending && (
              <LoaderCircle size={16} className="animate-spin" />
            )}
            {analyze.isPending ? 'Analisando...' : 'Continuar'}
          </Button>
        </form>
        <SourceRecognition url={url} compact />
        {choiceUrl && (
          <div className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-400/8 p-4">
            <p className="text-sm font-semibold">
              Este link também contém uma playlist. O que deseja baixar?
            </p>
            <div className="mt-3 flex gap-2">
              <Button type="button" onClick={() => submit('video')}>
                Só este vídeo
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => submit('playlist')}
              >
                Playlist inteira
              </Button>
            </div>
          </div>
        )}
        {analyze.error && (
          <p role="alert" className="mt-4 text-sm text-rose-300">
            {errorMessage(analyze.error)}
          </p>
        )}
      </motion.section>
    </div>,
    document.body,
  )
}

function HomePage() {
  const { draftUrl, clearDraftUrl, setPage } = useNavigation()
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<{ url: string }>({
    resolver: zodResolver(AnalyzeRequestSchema),
    defaultValues: { url: '' },
  })
  const url = useWatch({ control, name: 'url' })
  useEffect(() => {
    if (draftUrl) {
      reset({ url: draftUrl })
      clearDraftUrl()
    }
  }, [draftUrl, reset, clearDraftUrl])
  const [analysis, setAnalysis] = useState<MediaAnalysis | null>(null)
  const [choicesOpen, setChoicesOpen] = useState(false)
  const closeChoices = useCallback(() => setChoicesOpen(false), [])
  const [choiceUrl, setChoiceUrl] = useState<string | null>(null)
  const analyze = useMutation({
    mutationFn: (input: { url: string; mode?: 'video' | 'playlist' }) =>
      window.orbe.analyze(input.url, input.mode ? { mode: input.mode } : {}),
    onSuccess: (result) => {
      setAnalysis(result)
      setChoicesOpen(true)
    },
  })
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <ListeningHome />
        <div className="quick-add-heading">
          <Download size={17} />
          <h2>Mais música na sua coleção</h2>
          <span>Cole um link para começar</span>
        </div>
        <form
          onSubmit={handleSubmit(({ url: input }) => {
            setAnalysis(null)
            setChoicesOpen(false)
            analyze.reset()
            if (hasYoutubePlaylistChoice(input)) setChoiceUrl(input)
            else {
              setChoiceUrl(null)
              analyze.mutate({ url: input })
            }
          })}
          className="home-link-input premium-input mt-3 flex gap-3 rounded-2xl border border-white/10 bg-[#171b24] p-2"
        >
          <SourceInputMark url={url ?? ''} />
          <input
            aria-label="Link de mídia"
            type="url"
            required
            pattern="https://.*"
            {...register('url')}
            placeholder="Cole um link de mídia..."
            className="h-12 min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-slate-500"
          />
          <Button type="submit" disabled={analyze.isPending}>
            {analyze.isPending && (
              <LoaderCircle size={17} className="animate-spin" />
            )}
            {analyze.isPending ? 'Analisando...' : 'Analisar'}
          </Button>
        </form>
        {choiceUrl === url && (
          <div className="mt-4 max-w-3xl rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4">
            <p className="text-sm font-semibold">
              Este link contém um vídeo e uma playlist. O que deseja analisar?
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={analyze.isPending}
                onClick={() => {
                  setChoiceUrl(null)
                  analyze.mutate({ url: choiceUrl, mode: 'video' })
                }}
              >
                Só este vídeo
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={analyze.isPending}
                onClick={() => {
                  setChoiceUrl(null)
                  analyze.mutate({ url: choiceUrl, mode: 'playlist' })
                }}
              >
                Playlist inteira (25 por página)
              </Button>
            </div>
          </div>
        )}
        <SourceRecognition url={url ?? ''} />
        {errors.url && (
          <p role="alert" className="mt-2 text-sm text-rose-400">
            Informe um link válido.
          </p>
        )}
        {analyze.isPending && (
          <div
            role="status"
            className="mt-4 max-w-3xl rounded-xl border border-violet-400/15 bg-violet-400/7 p-4 text-sm text-violet-200"
          >
            <span className="flex items-center gap-2">
              <LoaderCircle size={17} className="animate-spin" /> Analisando o
              link e buscando as opções disponíveis...
            </span>
            <span className="mt-3 block h-1 overflow-hidden rounded-full bg-white/8">
              <span className="orbe-loading-line block h-full w-1/3 bg-gradient-to-r from-violet-500 to-blue-400" />
            </span>
          </div>
        )}
        {analyze.isError && (
          <div
            role="alert"
            className="mt-3 max-w-3xl rounded-xl border border-rose-400/20 bg-rose-400/6 p-4 text-sm text-rose-200"
          >
            <p>{errorMessage(analyze.error)}</p>
            {/YouTube pediu uma verificação|confirm you.re not a bot/i.test(
              errorMessage(analyze.error),
            ) && (
              <Button
                type="button"
                variant="secondary"
                className="mt-3"
                onClick={() => setPage('integrations')}
              >
                Configurar sessão do YouTube <ArrowUpRight size={16} />
              </Button>
            )}
          </div>
        )}
      </motion.div>
      {analysis && (
        <div className="mt-8 flex items-center gap-4 rounded-2xl border border-white/10 bg-[#151923] p-4">
          <MediaCover
            src={analysis.thumbnail}
            fallback={youtubeCoverFallback(analysis.sourceUrl)}
            alt={`Capa de ${analysis.title}`}
            className="aspect-video w-28 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-violet-300">
              {mediaSourceNames[analysis.provider]} · Pronto para escolher
            </p>
            <p className="mt-1 truncate font-bold">{analysis.title}</p>
            <p className="mt-1 text-xs text-slate-400">
              {analysis.isPlaylist
                ? `${analysis.items.length} itens carregados`
                : 'Escolha como salvar esta mídia'}
            </p>
          </div>
          <Button onClick={() => setChoicesOpen(true)}>
            Preparar download
          </Button>
        </div>
      )}
      {analysis && choicesOpen && (
        <MediaChoices
          key={`${analysis.sourceUrl}-${analysis.isPlaylist}`}
          analysis={analysis}
          onClose={closeChoices}
        />
      )}
    </>
  )
}

export function App() {
  const mainRef = useRef<HTMLElement>(null)
  const loadingQueries = useIsFetching({
    predicate: (query) =>
      query.state.data === undefined && query.state.fetchStatus === 'fetching',
  })
  const saving = useIsMutating()
  const {
    page,
    setPage,
    downloadDialogOpen,
    librarySearch,
    openDownloadDialog,
    closeDownloadDialog,
  } = useNavigation()
  const queryClient = useQueryClient()
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [page])
  const onboarding = useQuery({
    queryKey: ['onboarding'],
    queryFn: () => window.orbe.onboardingComplete(),
  })
  const [version, setVersion] = useState('')
  const preferences = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.orbe.getSettings(),
  })
  const libraryOverview = useQuery({
    queryKey: ['library'],
    queryFn: () => window.orbe.listLibrary(),
    refetchInterval: 10000,
  })
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => setSystemDark(media.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])
  useEffect(() => {
    void window.orbe.health().then((result) => setVersion(result.version))
  }, [])
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (!event.ctrlKey) return
      if (event.key.toLowerCase() === 'n') {
        event.preventDefault()
        openDownloadDialog()
      }
      if (event.key.toLowerCase() === 'h') {
        event.preventDefault()
        setPage('history')
      }
      if (event.key === ',') {
        event.preventDefault()
        setPage('settings')
      }
      if (event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        void window.orbe.openDownloadsFolder()
      }
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [setPage, openDownloadDialog])
  const current =
    navigation.find((item) => item.page === page)?.label ?? 'Início'
  const light =
    preferences.data?.theme === 'light' ||
    (preferences.data?.theme === 'system' && !systemDark)
  if (onboarding.data === false)
    return (
      <Onboarding
        finish={() => queryClient.setQueryData(['onboarding'], true)}
      />
    )
  if (onboarding.isError)
    return (
      <div
        role="alert"
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0b0d12] p-8 text-center text-white"
      >
        <h1 className="text-xl font-bold">Não foi possível abrir o Orbe.</h1>
        <p className="max-w-md text-sm text-slate-400">
          Não foi possível ler as informações iniciais. Tente novamente; sua
          biblioteca permanece no computador.
        </p>
        <Button onClick={() => void onboarding.refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  if (onboarding.data === undefined)
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center gap-3 bg-[#0b0d12] text-sm text-violet-200"
      >
        <LoaderCircle size={20} className="animate-spin" /> Abrindo Orbe...
      </div>
    )
  return (
    <div
      data-theme={light ? 'light' : 'dark'}
      className="app-shell fixed inset-0 flex h-dvh overflow-hidden bg-[#0b0d12] text-[#f4f6fa]"
    >
      <aside className="music-sidebar orbe-scroll flex h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-white/7 bg-[#10131b] px-3 py-5">
        <div className="flex items-center gap-3 border-b border-white/7 px-3 pb-5">
          <div className="flex size-11 shrink-0 items-center justify-center">
            <img src={brandMark} alt="" className="size-full" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-extrabold tracking-tight">Orbe</div>
            <div className="text-[10px] text-slate-500">
              Sua coleção, na sua órbita
            </div>
          </div>
        </div>
        <nav aria-label="Navegação principal" className="pb-4">
          {navigationGroups.map((group) => (
            <div
              key={group.title}
              className="border-b border-white/6 py-4 last:border-0"
            >
              <p className="mb-2 px-3 text-[10px] font-bold tracking-[0.18em] text-slate-500">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map(({ page: target, label, icon: Icon }) => (
                  <button
                    key={target}
                    type="button"
                    onClick={() => setPage(target)}
                    aria-current={page === target ? 'page' : undefined}
                    className={`sidebar-item group flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-all ${page === target ? 'bg-gradient-to-r from-violet-500/24 to-blue-500/9 font-semibold text-white shadow-[inset_3px_0_0_#a78bfa]' : 'text-slate-400 hover:bg-white/6 hover:text-white'}`}
                  >
                    <Icon
                      size={18}
                      className={
                        page === target
                          ? 'text-violet-300'
                          : 'text-slate-500 group-hover:text-slate-200'
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {target === 'library' && !!libraryOverview.data?.length && (
                      <span
                        aria-hidden="true"
                        className="rounded-md bg-white/7 px-1.5 py-0.5 text-[10px] text-slate-300"
                      >
                        {libraryOverview.data.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <DownloadActivity />
        <div className="mt-auto border-t border-white/7 pt-3">
          <button
            type="button"
            onClick={() => setPage('settings')}
            aria-current={page === 'settings' ? 'page' : undefined}
            className={`flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors ${page === 'settings' ? 'bg-violet-500/18 font-semibold text-violet-100' : 'text-slate-400 hover:bg-white/6 hover:text-white'}`}
          >
            <Settings2 size={18} /> Configurações
          </button>
          <p className="px-3 pt-3 text-[10px] text-slate-600">
            Orbe {version ? `v${version}` : ''}
          </p>
        </div>
      </aside>
      <main
        ref={mainRef}
        className="music-main orbe-scroll h-screen min-w-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <header className="music-topbar sticky top-0 z-10 flex h-20 items-center border-b border-white/5 bg-[#0b0d12]/95 px-10 text-sm text-slate-400 backdrop-blur-xl">
          <span className="topbar-location">{current}</span>
          <label className="global-search">
            <Search size={17} />
            <input
              aria-label="Buscar na biblioteca"
              placeholder="Buscar músicas, artistas…"
              value={librarySearch}
              onChange={(event) =>
                useNavigation.getState().setLibrarySearch(event.target.value)
              }
            />
          </label>
          {(loadingQueries > 0 || saving > 0) && (
            <span
              role="status"
              className="ml-auto flex items-center gap-2 text-xs text-violet-200"
            >
              <LoaderCircle size={15} className="animate-spin" />
              {saving > 0 ? 'Salvando...' : 'Carregando...'}
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={openDownloadDialog}
            data-dialog-fallback
            className="ml-auto"
          >
            <Plus size={15} /> Novo download{' '}
            <span className="text-violet-200/50">Ctrl+N</span>
          </Button>
          {(loadingQueries > 0 || saving > 0) && (
            <span className="absolute bottom-0 left-0 h-0.5 w-full overflow-hidden bg-violet-400/10">
              <span className="orbe-loading-line block h-full w-1/3 rounded-full bg-gradient-to-r from-violet-500 to-blue-400" />
            </span>
          )}
        </header>
        <div className="music-content mx-auto max-w-6xl px-10 py-12 pb-32">
          {page !== 'settings' && <LibraryHealthNotice />}
          {page === 'home' && <HomePage />}
          {page === 'downloads' && <DownloadList />}
          {page === 'history' && <DownloadList history />}
          {page === 'library' && <LibraryPage />}
          {page === 'playlists' && <LocalPlaylistsPage />}
          {page === 'youtube-playlists' && <PlaylistsPage />}
          {page === 'spotify' && <SpotifyPage />}
          {page === 'integrations' && <IntegrationsPage />}
          {page === 'converter' && <ConverterPage />}
          {page === 'settings' && <SettingsPage />}
        </div>
      </main>
      <PlayerBar />
      {downloadDialogOpen && (
        <QuickDownloadDialog onClose={closeDownloadDialog} />
      )}
    </div>
  )
}
