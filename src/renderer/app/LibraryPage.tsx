import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Music2,
  Film,
  LayoutGrid,
  List,
  MoreHorizontal,
  ExternalLink,
  FileX2,
  FolderOpen,
  FolderPlus,
  Heart,
  ListPlus,
  LoaderCircle,
  Play,
  Trash2,
} from 'lucide-react'
import { mediaSourceNames } from '../../shared/contracts/media-sources'
import { Button } from '@/components/ui/button'
import { usePlayer } from '../stores/player'
import { useNavigation } from '../stores/navigation'
import { CollectionCover } from './ListeningHome'

export function LibraryPage() {
  const queryClient = useQueryClient()
  const library = useQuery({
    queryKey: ['library'],
    queryFn: () => window.orbe.listLibrary(),
    refetchInterval: 4000,
  })
  const {
    libraryFilter: filter,
    setLibraryFilter: setFilter,
    librarySearch: search,
    setLibrarySearch: setSearch,
  } = useNavigation()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [playlistFor, setPlaylistFor] = useState<string | null>(null)
  const playlists = useQuery({
    queryKey: ['local-playlists'],
    queryFn: () => window.orbe.listLocalPlaylists(),
  })
  const { play } = usePlayer()
  const importFiles = useMutation({
    mutationFn: () => window.orbe.importLocalFiles(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['library'] })
    },
    onError: (cause) =>
      setError(cause instanceof Error ? cause.message : 'Falha na importação.'),
  })
  const items = (library.data ?? []).filter(
    (item) =>
      (filter === 'all' ||
        (filter === 'favorite' ? item.favorite : item.mediaType === filter)) &&
      `${item.title} ${item.artist ?? ''} ${item.album ?? ''}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  )
  const total = library.data?.length ?? 0
  const action = async (run: () => Promise<unknown>, id?: string) => {
    try {
      setError('')
      setBusyId(id ?? 'general')
      await run()
      await queryClient.invalidateQueries({ queryKey: ['library'] })
      await queryClient.invalidateQueries({ queryKey: ['local-playlists'] })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha na ação.')
    } finally {
      setBusyId(null)
    }
  }
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="section-eyebrow">SUA COLEÇÃO</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
            Biblioteca
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {total === 0
              ? 'Músicas e vídeos que você baixar ou importar aparecerão aqui.'
              : `${total} ${total === 1 ? 'arquivo salvo' : 'arquivos salvos'} · músicas e vídeos sempre à mão.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => useNavigation.getState().setPage('settings')}
          >
            <FolderOpen size={17} /> Pastas de mídia
          </Button>
          <Button
            onClick={() => importFiles.mutate()}
            disabled={importFiles.isPending}
          >
            {importFiles.isPending ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <FolderPlus size={17} />
            )}
            {importFiles.isPending ? 'Importando...' : 'Adicionar arquivos'}
          </Button>
        </div>
      </div>
      <div
        className="library-toolbar mt-7 flex flex-wrap gap-2"
        role="group"
        aria-label="Filtrar biblioteca"
      >
        {(
          [
            ['all', 'Todas', LayoutGrid],
            ['audio', 'Músicas', Music2],
            ['video', 'Vídeos', Film],
            ['favorite', 'Favoritos', Heart],
          ] as const
        ).map(([value, label, Icon]) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? 'default' : 'secondary'}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            <Icon size={16} /> {label}
          </Button>
        ))}
      </div>
      <div className="library-search-row">
        <span>
          {items.length} {items.length === 1 ? 'item' : 'itens'}
        </span>
        {(search || filter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => {
              setSearch('')
              setFilter('all')
            }}
          >
            Limpar busca e filtros
          </Button>
        )}
        <div
          className="view-switch"
          role="group"
          aria-label="Visualização da biblioteca"
        >
          <button
            aria-label="Ver como capas"
            title="Capas"
            aria-pressed={view === 'grid'}
            onClick={() => setView('grid')}
          >
            <LayoutGrid size={17} />
          </button>
          <button
            aria-label="Ver como lista"
            title="Lista"
            aria-pressed={view === 'list'}
            onClick={() => setView('list')}
          >
            <List size={19} />
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-rose-400">
          {error}
        </p>
      )}
      {library.isPending && (
        <div
          role="status"
          aria-label="Carregando biblioteca"
          className="mt-6 space-y-3"
        >
          {[0, 1, 2].map((number) => (
            <div
              key={number}
              className="premium-card h-24 animate-pulse rounded-2xl border border-white/8 bg-white/5"
            />
          ))}
        </div>
      )}
      {library.isError && (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-rose-400/25 bg-rose-400/7 p-5"
        >
          <p className="font-semibold">
            Não foi possível carregar sua biblioteca.
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Seus arquivos não foram removidos. Tente carregar novamente.
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => void library.refetch()}
          >
            Tentar novamente
          </Button>
        </div>
      )}
      <div className={`library-collection library-${view} mt-6`}>
        {items.map((item, index) => (
          <article
            key={item.id}
            className="library-item premium-card relative flex flex-wrap items-center gap-4 rounded-2xl border border-white/8 p-4 transition-colors hover:border-violet-400/20"
          >
            <div className="library-artwork flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5 text-violet-300">
              <CollectionCover item={item} />
            </div>
            <div className="library-item-info min-w-0 flex-1">
              <h2 className="line-clamp-2 text-sm font-bold leading-5">
                {item.title}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {item.artist ?? mediaSourceNames[item.provider]} ·{' '}
                {item.mediaType === 'video' ? 'Vídeo' : 'Música'} ·{' '}
                {item.format.toUpperCase()}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {mediaSourceNames[item.provider]}
              </p>
            </div>
            <div className="library-item-actions flex flex-wrap items-center gap-1">
              {busyId === item.id && (
                <span
                  role="status"
                  className="mr-2 flex items-center gap-1 text-xs text-violet-200"
                >
                  <LoaderCircle size={15} className="animate-spin" />{' '}
                  Salvando...
                </span>
              )}
              <Button
                aria-label={`Reproduzir ${item.title}`}
                title={`Reproduzir ${item.title}`}
                size="icon"
                className="library-play mr-1"
                onClick={() => play(items, index)}
              >
                <Play size={18} fill="currentColor" />
              </Button>
              <Button
                aria-label={item.favorite ? 'Desfavoritar' : 'Favoritar'}
                title={item.favorite ? 'Desfavoritar' : 'Favoritar'}
                aria-pressed={item.favorite}
                variant="ghost"
                size="icon"
                className={item.favorite ? 'text-rose-400' : ''}
                onClick={() =>
                  void action(
                    () => window.orbe.setFavorite(item.id, !item.favorite),
                    item.id,
                  )
                }
              >
                <Heart
                  size={18}
                  fill={item.favorite ? 'currentColor' : 'none'}
                />
              </Button>
              <Button
                aria-label={`Adicionar ${item.title} a uma playlist`}
                title="Adicionar a playlist"
                variant="ghost"
                size="icon"
                onClick={() =>
                  setPlaylistFor(playlistFor === item.id ? null : item.id)
                }
              >
                <ListPlus size={18} />
              </Button>
              {playlistFor === item.id && (
                <div className="absolute right-4 top-[calc(100%-4px)] z-30 min-w-56 rounded-2xl border border-white/12 bg-[#1b1d29] p-2 shadow-2xl">
                  <p className="px-2 py-2 text-xs font-semibold text-slate-400">
                    Adicionar a...
                  </p>
                  {playlists.isPending && (
                    <p
                      role="status"
                      className="flex items-center gap-2 px-2 py-3 text-xs"
                    >
                      <LoaderCircle size={14} className="animate-spin" />{' '}
                      Carregando...
                    </p>
                  )}
                  {playlists.data?.map((playlist) => (
                    <button
                      key={playlist.id}
                      type="button"
                      disabled={!!busyId}
                      onClick={() =>
                        void action(
                          () =>
                            window.orbe.addLocalPlaylistItem(
                              playlist.id,
                              item.id,
                            ),
                          item.id,
                        ).then(() => setPlaylistFor(null))
                      }
                      className="block w-full truncate rounded-xl px-3 py-2 text-left text-sm hover:bg-white/8 disabled:opacity-50"
                    >
                      {playlist.name}
                    </button>
                  ))}
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() =>
                      useNavigation.getState().setPage('playlists')
                    }
                    className="mt-2 w-full justify-start"
                  >
                    + Nova playlist
                  </Button>
                </div>
              )}
              <details
                className="library-more"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') event.currentTarget.open = false
                }}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget))
                    event.currentTarget.open = false
                }}
              >
                <summary
                  aria-label={`Mais opções para ${item.title}`}
                  title="Mais opções"
                >
                  <MoreHorizontal size={18} />
                </summary>
                <div className="library-more-menu">
                  <Button
                    aria-label="Abrir arquivo"
                    title="Abrir arquivo"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      void action(() => window.orbe.openLibraryFile(item.id))
                    }
                  >
                    <ExternalLink size={18} /> Abrir arquivo
                  </Button>
                  <Button
                    aria-label="Abrir pasta"
                    title="Abrir pasta"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      void action(() => window.orbe.openLibraryFolder(item.id))
                    }
                  >
                    <FolderOpen size={18} /> Abrir pasta
                  </Button>
                  <Button
                    aria-label="Remover da biblioteca"
                    title="Remover da biblioteca"
                    variant="destructive"
                    size="icon"
                    onClick={() =>
                      void action(() => window.orbe.removeFromLibrary(item.id))
                    }
                  >
                    <Trash2 size={18} /> Remover da biblioteca
                  </Button>
                  <Button
                    aria-label="Excluir arquivo"
                    title="Excluir arquivo do computador"
                    variant="destructive"
                    size="icon"
                    onClick={() =>
                      void action(() => window.orbe.deleteLibraryFile(item.id))
                    }
                  >
                    <FileX2 size={18} /> Excluir arquivo
                  </Button>
                </div>
              </details>
            </div>
          </article>
        ))}
        {!library.isPending && !library.isError && !items.length && (
          <div className="library-empty premium-card rounded-3xl border border-white/8 p-12 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-300">
              <FolderPlus size={24} />
            </div>
            <h2 className="mt-5 font-bold">
              {search
                ? 'Nenhum resultado para esta busca'
                : filter === 'all'
                  ? 'Sua coleção começa aqui'
                  : 'Nenhum arquivo nesta categoria'}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {search || filter !== 'all'
                ? 'Tente outra busca ou limpe os filtros para ver o restante da coleção.'
                : 'Adicione músicas e vídeos do computador para começar a ouvir e assistir.'}
            </p>
            {search || filter !== 'all' ? (
              <Button
                variant="secondary"
                className="mt-5"
                onClick={() => {
                  setSearch('')
                  setFilter('all')
                }}
              >
                Limpar busca e filtros
              </Button>
            ) : (
              <p className="mt-3 text-xs text-slate-400">
                Use “Adicionar arquivos” acima para escolher sua mídia.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  )
}
