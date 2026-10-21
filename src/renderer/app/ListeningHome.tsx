import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  ArrowUpRight,
  ChevronRight,
  Disc3,
  FolderPlus,
  Heart,
  ListMusic,
  Play,
} from 'lucide-react'
import { usePlayer } from '../stores/player'
import { useNavigation } from '../stores/navigation'
import type { LibraryRecord } from '../../shared/contracts/media'
import { useEffect, useRef, useState } from 'react'

export function CollectionCover({ item }: { item: LibraryRecord | undefined }) {
  const coverRef = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '120px' },
    )
    if (coverRef.current) observer.observe(coverRef.current)
    return () => observer.disconnect()
  }, [])
  const artwork = useQuery({
    queryKey: ['player-artwork', item?.id],
    queryFn: () => window.orbe.artworkForTrack(item!.id),
    enabled: visible && !!item && !item.thumbnail,
    staleTime: Infinity,
    retry: false,
  })
  const source = item?.thumbnail ?? artwork.data
  const [failedSource, setFailedSource] = useState<string | null>(null)
  return (
    <span className="collection-cover" ref={coverRef}>
      {source && failedSource !== source ? (
        <img
          src={source}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedSource(source)}
        />
      ) : (
        <Disc3 size={48} strokeWidth={1} />
      )}
    </span>
  )
}

export function ListeningHome() {
  const { setPage } = useNavigation()
  const queryClient = useQueryClient()
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const importFiles = async () => {
    setImporting(true)
    setImportError('')
    try {
      await window.orbe.importLocalFiles()
      await queryClient.invalidateQueries({ queryKey: ['library'] })
      setPage('library')
    } catch {
      setImportError('Não foi possível adicionar os arquivos. Tente novamente.')
    } finally {
      setImporting(false)
    }
  }
  const { play, queue, index, setExpanded } = usePlayer()
  const library = useQuery({
    queryKey: ['library'],
    queryFn: () => window.orbe.listLibrary(),
  })
  const items = library.data ?? []
  const recent = [...items]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5)
  const favorites = items.filter((item) => item.favorite)
  const current = queue[index]
  const featured = current ?? favorites[0] ?? recent[0]
  return (
    <div className="listening-home">
      <div className="page-heading">
        <div>
          <p className="music-eyebrow">FEITO PARA O SEU RITMO</p>
          <h1>Ouvir agora</h1>
          <p>Sua música. Seu momento.</p>
        </div>
        <span className="collection-count">
          <Disc3 size={16} /> {items.length} na coleção
        </span>
      </div>
      <div className="listening-features">
        <section className="listening-hero">
          <div className="hero-copy">
            <h2>{featured?.title ?? 'Sua coleção começa aqui.'}</h2>
            <p>
              {featured
                ? (featured.artist ??
                  (featured.mediaType === 'video'
                    ? 'Vídeo da sua coleção'
                    : 'Música da sua coleção'))
                : 'Escolha músicas e vídeos do seu computador.'}
            </p>
            {current && (
              <span className="hero-status">CONTINUE DE ONDE PAROU</span>
            )}
            <button
              type="button"
              className="hero-play"
              disabled={importing}
              onClick={() => {
                if (current) {
                  setExpanded(true)
                  if (!usePlayer.getState().playing)
                    usePlayer.getState().toggle()
                } else if (featured)
                  play(
                    items,
                    items.findIndex((item) => item.id === featured.id),
                  )
                else void importFiles()
              }}
            >
              {featured ? (
                <Play size={17} fill="currentColor" />
              ) : (
                <FolderPlus size={17} />
              )}
              {featured
                ? featured.mediaType === 'video'
                  ? 'Assistir agora'
                  : 'Ouvir agora'
                : importing
                  ? 'Abrindo arquivos...'
                  : 'Adicionar arquivos'}
            </button>
          </div>
          <div className="hero-artwork">
            <CollectionCover item={featured} />
          </div>
        </section>
        <div className="collection-shortcuts">
          <button
            type="button"
            className="collection-shortcut favorites-shortcut"
            onClick={() => {
              useNavigation.getState().setLibrarySearch('')
              useNavigation.getState().setLibraryFilter('favorite')
              setPage('library')
            }}
          >
            <span className="shortcut-icon">
              <Heart size={26} fill="currentColor" />
            </span>
            <span>
              <strong>Suas favoritas</strong>
              <small>
                {favorites.length
                  ? `${favorites.length} para ouvir de novo`
                  : 'As músicas que ficam'}
              </small>
            </span>
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            className="collection-shortcut"
            onClick={() => setPage('playlists')}
          >
            <span className="shortcut-icon">
              <ListMusic size={28} />
            </span>
            <span>
              <strong>Suas playlists</strong>
              <small>Uma para cada momento</small>
            </span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      {importError && (
        <p role="alert" className="mt-4 text-sm text-rose-400">
          {importError}
        </p>
      )}
      <section className="recent-collection">
        <div className="section-heading">
          <h2>Adicionados recentemente</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPage('library')}
          >
            Ver tudo <ChevronRight size={16} />
          </Button>
        </div>
        {library.isPending ? (
          <div role="status" className="collection-empty">
            Carregando sua coleção…
          </div>
        ) : library.isError ? (
          <div role="alert" className="collection-empty">
            Não foi possível carregar sua coleção.{' '}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void library.refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        ) : recent.length ? (
          <div className="album-shelf">
            {recent.map((item, position) => (
              <button
                type="button"
                key={item.id}
                className="album-card"
                aria-label={`Reproduzir ${item.title}`}
                onClick={() => play(recent, position)}
              >
                <span className="album-artwork">
                  <CollectionCover item={item} />
                  <span className="album-play">
                    <Play size={22} fill="currentColor" />
                  </span>
                </span>
                <strong>{item.title}</strong>
                <small>
                  {item.artist ??
                    (item.mediaType === 'audio' ? 'Música' : 'Vídeo')}
                </small>
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            className="collection-empty"
            disabled={importing}
            onClick={() => void importFiles()}
          >
            <FolderPlus size={28} />
            <span>
              <strong>Sua coleção começa com seus arquivos</strong>
              <small>
                Adicione músicas e vídeos do computador ou baixe pelo link
                abaixo.
              </small>
            </span>
            <ArrowUpRight size={19} />
          </button>
        )}
      </section>
    </div>
  )
}
