import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AudioLines,
  CircleCheck,
  Download,
  ExternalLink,
  FolderOpen,
  LoaderCircle,
  Play,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import type { DownloadRecord } from '../../shared/contracts/media'
import { mediaSourceNames } from '../../shared/contracts/media-sources'
import { Button } from '@/components/ui/button'
import { usePlayer } from '../stores/player'
import { DownloadProgress, isActiveDownload } from './DownloadActivity'

function megabytes(bytes: number): string {
  return `${(bytes / 1048576).toFixed(1)} MB`
}

const statusLabels: Record<DownloadRecord['status'], string> = {
  queued: 'Na fila',
  analyzing: 'Analisando',
  downloading: 'Baixando',
  processing: 'Preparando arquivo',
  completed: 'Concluído',
  failed: 'Falhou',
  cancelled: 'Cancelado',
}

function statusColor(status: DownloadRecord['status']): string {
  if (status === 'completed') return 'download-status-success'
  if (status === 'failed') return 'download-status-error'
  if (status === 'cancelled') return 'download-status-muted'
  return 'download-status-active'
}

function DownloadCard({
  item,
  refresh,
}: {
  item: DownloadRecord
  refresh: () => Promise<unknown>
}) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const action = async (operation: () => Promise<unknown>) => {
    try {
      setError('')
      setBusy(true)
      await operation()
      await refresh()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível executar esta ação.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <article
      aria-busy={busy}
      data-state={item.status}
      className="download-card premium-card rounded-2xl border border-white/8 p-4 transition-colors hover:border-violet-400/20 sm:p-5"
    >
      <div className="flex items-start gap-4">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-20 w-28 shrink-0 rounded-xl bg-white/5 object-cover sm:h-24 sm:w-36"
          />
        ) : (
          <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-xl bg-white/5 text-violet-300 sm:h-24 sm:w-36">
            <AudioLines size={22} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="line-clamp-2 text-sm font-bold leading-6 sm:text-base">
                {item.title}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {mediaSourceNames[item.provider]} ·{' '}
                {item.mediaType === 'video' ? 'Vídeo' : 'Música'} ·{' '}
                {item.format.toUpperCase()}
                {item.quality ? ` · ${item.quality}` : ''}
                {item.fileSize ? ` · ${megabytes(item.fileSize)}` : ''}
              </p>
            </div>
            <span className={`download-status ${statusColor(item.status)}`}>
              {item.status === 'completed' && <CircleCheck size={13} />}
              {statusLabels[item.status]}
              {item.status === 'downloading' &&
                ` ${Math.round(item.progress)}%`}
            </span>
          </div>
          {item.status === 'downloading' && (
            <p className="mt-2 text-xs text-slate-400">
              {item.downloadedBytes != null
                ? megabytes(item.downloadedBytes)
                : ''}
              {item.fileSize != null ? ` / ${megabytes(item.fileSize)}` : ''}
              {item.speedBytesPerSecond != null
                ? ` · ${megabytes(item.speedBytesPerSecond)}/s`
                : ''}
              {item.etaSeconds != null
                ? ` · ${item.etaSeconds}s restantes`
                : ''}
            </p>
          )}
          {item.errorMessage && (
            <p className="mt-2 text-xs text-rose-400" role="alert">
              {item.errorMessage}
            </p>
          )}
          {error && (
            <p className="mt-2 text-xs text-rose-400" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
      {(isActiveDownload(item) || item.status === 'completed') && (
        <DownloadProgress key={item.status} item={item} />
      )}
      <div
        className={`mt-4 flex flex-wrap items-center gap-2 border-t border-white/8 pt-3 ${busy ? 'pointer-events-none opacity-50' : ''}`}
      >
        {busy && (
          <span
            role="status"
            className="flex items-center gap-2 text-xs text-violet-200"
          >
            <LoaderCircle size={16} className="animate-spin" /> Aguarde...
          </span>
        )}
        {['queued', 'downloading', 'processing'].includes(item.status) && (
          <Button
            aria-label="Cancelar download"
            title="Cancelar"
            variant="secondary"
            size="sm"
            onClick={() =>
              void action(() => window.orbe.cancelDownload(item.id))
            }
          >
            <X size={15} /> Cancelar
          </Button>
        )}
        {['failed', 'cancelled'].includes(item.status) && (
          <Button
            aria-label="Tentar novamente"
            title="Tentar novamente"
            variant="secondary"
            size="sm"
            onClick={() =>
              void action(() => window.orbe.retryDownload(item.id))
            }
          >
            <RotateCcw size={15} /> Tentar novamente
          </Button>
        )}
        {item.status === 'completed' && (
          <>
            <Button
              aria-label="Reproduzir"
              title="Reproduzir"
              size="sm"
              onClick={() =>
                void action(async () => {
                  const library = await window.orbe.listLibrary()
                  const media = library.find(
                    (entry) => entry.filePath === item.filePath,
                  )
                  if (!media)
                    throw new Error('Item não encontrado na biblioteca.')
                  const queue = library.filter(
                    (entry) => entry.mediaType === media.mediaType,
                  )
                  usePlayer.getState().play(
                    queue,
                    queue.findIndex((entry) => entry.id === media.id),
                  )
                })
              }
            >
              <Play size={15} fill="currentColor" /> Reproduzir
            </Button>
            <Button
              aria-label="Abrir arquivo"
              title="Abrir arquivo"
              variant="secondary"
              size="sm"
              onClick={() => void action(() => window.orbe.openFile(item.id))}
            >
              <ExternalLink size={15} /> Abrir
            </Button>
            <Button
              aria-label="Abrir pasta"
              title="Abrir pasta"
              variant="ghost"
              size="sm"
              onClick={() => void action(() => window.orbe.openFolder(item.id))}
            >
              <FolderOpen size={15} /> Pasta
            </Button>
          </>
        )}
        {['failed', 'cancelled', 'completed'].includes(item.status) && (
          <Button
            aria-label="Remover do histórico"
            title="Remover do histórico"
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() =>
              void action(() => window.orbe.removeDownload(item.id))
            }
          >
            <Trash2 size={15} /> Remover
          </Button>
        )}
      </div>
    </article>
  )
}

export function DownloadList({ history = false }: { history?: boolean }) {
  const query = useQuery({
    queryKey: ['downloads'],
    queryFn: () => window.orbe.listDownloads(),
    refetchInterval: 600,
    refetchIntervalInBackground: true,
  })
  const [search, setSearch] = useState('')
  const [source, setSource] = useState('all')
  const [mediaType, setMediaType] = useState('all')
  const [period, setPeriod] = useState('all')
  const [sort, setSort] = useState('newest')
  const [now] = useState(() => Date.now())
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const items = (query.data ?? [])
    .filter((item) =>
      history
        ? ['completed', 'failed', 'cancelled'].includes(item.status)
        : true,
    )
    .filter(
      (item) =>
        item.title.toLowerCase().includes(search.toLowerCase()) &&
        (source === 'all' || item.provider === source) &&
        (mediaType === 'all' || item.mediaType === mediaType) &&
        (period === 'all' ||
          item.createdAt >=
            (period === 'today'
              ? today.getTime()
              : now - Number(period) * 86400000)),
    )
    .sort((a, b) => {
      if (!history && isActiveDownload(a) !== isActiveDownload(b))
        return isActiveDownload(a) ? -1 : 1
      if (sort === 'name') return a.title.localeCompare(b.title)
      if (sort === 'size') return (b.fileSize ?? 0) - (a.fileSize ?? 0)
      if (sort === 'quality')
        return (b.quality ?? '').localeCompare(a.quality ?? '')
      return sort === 'oldest'
        ? a.createdAt - b.createdAt
        : b.createdAt - a.createdAt
    })
  const activeCount = (query.data ?? []).filter((item) =>
    ['queued', 'analyzing', 'downloading', 'processing'].includes(item.status),
  ).length
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-eyebrow">SUA MÍDIA, ORGANIZADA</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
            {history ? 'Histórico' : 'Downloads'}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {history
              ? 'Encontre os arquivos concluídos e revise suas tentativas.'
              : 'Acompanhe o progresso e abra seus arquivos em um só lugar.'}
          </p>
        </div>
        {!history && activeCount > 0 && (
          <span className="download-status download-status-active">
            {activeCount} em andamento
          </span>
        )}
      </div>
      <div className="my-6 flex flex-wrap gap-3 rounded-2xl border border-white/8 bg-[#11141b] p-3">
        <div className="relative min-w-52 flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-3.5 text-slate-500"
          />
          <input
            aria-label="Pesquisar downloads"
            placeholder="Pesquisar por título"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 w-full rounded-xl border border-white/8 bg-[#171b24] pl-10 pr-4 text-sm outline-none"
          />
        </div>
        <select
          aria-label="Filtrar fonte"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          className="rounded-xl border border-white/8 bg-[#171b24] px-4 text-sm"
        >
          <option value="all">Todas as fontes</option>
          <option value="youtube">YouTube</option>
          <option value="soundcloud">SoundCloud</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
          <option value="twitter">X / Twitter</option>
          <option value="generic">Outras fontes</option>
        </select>
        <select
          aria-label="Filtrar tipo"
          value={mediaType}
          onChange={(event) => setMediaType(event.target.value)}
          className="rounded-xl border border-white/8 bg-[#171b24] px-4 text-sm"
        >
          <option value="all">Vídeo e áudio</option>
          <option value="video">Vídeo</option>
          <option value="audio">Áudio</option>
        </select>
        <select
          aria-label="Filtrar período"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          className="rounded-xl border border-white/8 bg-[#171b24] px-4 text-sm"
        >
          <option value="all">Todas as datas</option>
          <option value="today">Hoje</option>
          <option value="7">7 dias</option>
          <option value="30">30 dias</option>
        </select>
        <select
          aria-label="Ordenar downloads"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          className="rounded-xl border border-white/8 bg-[#171b24] px-4 text-sm"
        >
          <option value="newest">Mais recentes</option>
          <option value="oldest">Mais antigos</option>
          <option value="name">Nome</option>
          <option value="size">Tamanho</option>
          <option value="quality">Qualidade</option>
        </select>
      </div>
      {query.isError && (
        <p role="alert" className="text-rose-400">
          Não foi possível carregar os downloads.
        </p>
      )}
      {query.isPending ? (
        <div
          role="status"
          className="space-y-3"
          aria-label="Carregando downloads"
        >
          {[0, 1, 2].map((number) => (
            <div
              key={number}
              className="premium-card h-32 animate-pulse rounded-2xl border border-white/6 bg-white/5"
            />
          ))}
        </div>
      ) : items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <DownloadCard
              key={item.id}
              item={item}
              refresh={() => query.refetch()}
            />
          ))}
        </div>
      ) : (
        <div className="premium-card rounded-3xl border border-white/8 p-12 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-300">
            <Download size={24} />
          </div>
          <h2 className="mt-5 font-bold">
            {search ||
            source !== 'all' ||
            mediaType !== 'all' ||
            period !== 'all'
              ? 'Nenhum resultado para estes filtros'
              : history
                ? 'Seu histórico está vazio'
                : 'Sua fila está pronta'}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {history
              ? 'Seus downloads concluídos aparecerão aqui.'
              : 'Cole um link na tela Início para começar.'}
          </p>
        </div>
      )}
    </>
  )
}
