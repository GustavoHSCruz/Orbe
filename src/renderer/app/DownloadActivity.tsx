import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownToLine, Check, ChevronRight, X } from 'lucide-react'
import type { DownloadRecord } from '../../shared/contracts/media'
import { useNavigation } from '../stores/navigation'

export const isActiveDownload = (item: DownloadRecord) =>
  ['queued', 'analyzing', 'downloading', 'processing'].includes(item.status)

export function DownloadProgress({
  item,
  compact = false,
}: {
  item: DownloadRecord
  compact?: boolean
}) {
  const complete = item.status === 'completed'
  const processing = item.status === 'processing'
  const unknown =
    !complete &&
    (item.status !== 'downloading' ||
      (item.downloadedBytes == null && item.progress === 0))
  const progress = complete
    ? 100
    : Math.max(0, Math.min(100, item.progress || 0))
  return (
    <div
      className={`transfer-progress ${compact ? 'transfer-compact' : ''}`}
      data-state={item.status}
    >
      <div
        className="transfer-orbit"
        style={{ '--transfer-progress': `${progress}%` } as CSSProperties}
        data-indeterminate={unknown}
      >
        <span>
          {complete ? (
            <Check size={compact ? 17 : 25} />
          ) : (
            <ArrowDownToLine size={compact ? 17 : 24} />
          )}
        </span>
      </div>
      {!compact && (
        <div className="transfer-meter">
          <div className="transfer-meter-label">
            <strong>
              {complete
                ? 'Pronto para dar play'
                : processing
                  ? 'Finalizando seu arquivo'
                  : item.status === 'queued'
                    ? 'Sua mídia está na fila'
                    : unknown
                      ? 'Conectando à fonte…'
                      : 'Chegando à sua coleção'}
            </strong>
            <span>
              {complete
                ? '100%'
                : unknown
                  ? 'Aguarde'
                  : `${Math.round(progress)}%`}
            </span>
          </div>
          <div
            className="transfer-track"
            role="progressbar"
            aria-label={`Progresso de ${item.title}`}
            aria-valuenow={unknown ? undefined : Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={
              unknown
                ? processing
                  ? 'Processando arquivo'
                  : 'Aguardando progresso'
                : `${Math.round(progress)}%`
            }
            data-indeterminate={unknown}
          >
            <span style={{ width: unknown ? '35%' : `${progress}%` }} />
          </div>
          <small>
            {complete
              ? 'Download concluído · disponível na biblioteca'
              : processing
                ? 'O download terminou. Estamos preparando a reprodução.'
                : 'Você pode continuar usando o Orbe.'}
          </small>
        </div>
      )}
    </div>
  )
}

export function DownloadActivity() {
  const client = useQueryClient()
  const { setPage } = useNavigation()
  const downloads = useQuery({
    queryKey: ['downloads'],
    queryFn: () => window.orbe.listDownloads(),
    refetchInterval: 600,
    refetchIntervalInBackground: true,
  })
  const previous = useRef<Map<string, string> | null>(null)
  const [finished, setFinished] = useState<DownloadRecord | null>(null)
  useEffect(() => {
    if (!downloads.data) return
    const completed = downloads.data.filter(
      (item) =>
        item.status === 'completed' &&
        previous.current &&
        previous.current.get(item.id) !== 'completed',
    )
    previous.current = new Map(
      downloads.data.map((item) => [item.id, item.status]),
    )
    if (completed.length) {
      setFinished(completed[0]!)
      void client.invalidateQueries({ queryKey: ['library'] })
    }
  }, [downloads.data, client])
  useEffect(() => {
    if (!finished) return
    const timer = setTimeout(() => setFinished(null), 6500)
    return () => clearTimeout(timer)
  }, [finished])
  const active = downloads.data?.filter(isActiveDownload) ?? []
  const current = active.find((item) => item.status !== 'queued') ?? active[0]
  return (
    <>
      {current && (
        <button
          type="button"
          className="download-activity"
          aria-label={`Abrir downloads: ${active.length} em andamento`}
          onClick={() => setPage('downloads')}
        >
          <DownloadProgress item={current} compact />
          <span>
            <strong>
              {active.length === 1
                ? 'Baixando sua mídia'
                : `${active.length} downloads`}
            </strong>
            <small>
              {current.status === 'processing'
                ? 'Finalizando arquivo…'
                : current.title}
            </small>
          </span>
          <ChevronRight size={15} />
        </button>
      )}
      {finished && (
        <div className="download-completion" role="status" key={finished.id}>
          <DownloadProgress item={finished} compact />
          <button
            type="button"
            onClick={() => {
              setPage('downloads')
              setFinished(null)
            }}
          >
            <strong>Já está na sua coleção</strong>
            <span>{finished.title}</span>
          </button>
          <button
            type="button"
            className="completion-dismiss"
            aria-label="Fechar aviso de download concluído"
            onClick={() => setFinished(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  )
}
