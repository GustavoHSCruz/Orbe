import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowUp,
  Check,
  Disc3,
  ListMusic,
  LoaderCircle,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePlayer } from '../stores/player'
import { useNavigation } from '../stores/navigation'

export function LocalPlaylistsPage() {
  const queryClient = useQueryClient()
  const playlists = useQuery({
    queryKey: ['local-playlists'],
    queryFn: () => window.orbe.listLocalPlaylists(),
  })
  const library = useQuery({
    queryKey: ['library'],
    queryFn: () => window.orbe.listLibrary(),
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const selected =
    playlists.data?.find((playlist) => playlist.id === selectedId) ??
    playlists.data?.[0]
  const available = (library.data ?? []).filter(
    (item) =>
      !selected?.items.some((entry) => entry.id === item.id) &&
      `${item.title} ${item.artist ?? ''}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  )
  const run = async (label: string, action: () => Promise<unknown>) => {
    setBusy(label)
    setError('')
    setNotice('')
    try {
      await action()
      await queryClient.invalidateQueries({ queryKey: ['local-playlists'] })
      setNotice('Playlist atualizada.')
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível atualizar a playlist.',
      )
    } finally {
      setBusy('')
    }
  }
  const newPlaylist = () => {
    setSelectedId(null)
    setName('')
    setDescription('')
    setEditing(true)
    setDeleteConfirm(false)
  }
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-eyebrow">SUA MÚSICA, DO SEU JEITO</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
            Minhas playlists
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Organize músicas e vídeos da sua biblioteca em coleções pessoais.
          </p>
        </div>
        <Button onClick={newPlaylist}>
          <Plus size={17} /> Nova playlist
        </Button>
      </div>
      {(playlists.isPending || library.isPending) && (
        <div role="status" className="mt-8 grid gap-4 md:grid-cols-[260px_1fr]">
          <div className="h-72 animate-pulse rounded-3xl bg-white/5" />
          <div className="h-72 animate-pulse rounded-3xl bg-white/5" />
          <span className="sr-only">Carregando playlists...</span>
        </div>
      )}
      {(playlists.isError || library.isError || error) && (
        <p role="alert" className="mt-5 text-sm text-rose-300">
          {error || 'Não foi possível carregar suas playlists.'}
        </p>
      )}
      {notice && !busy && (
        <p role="status" className="mt-5 text-sm text-emerald-300">
          <Check size={15} className="mr-1 inline" />
          {notice}
        </p>
      )}
      {busy && (
        <p
          role="status"
          className="mt-5 flex items-center gap-2 text-sm text-violet-200"
        >
          <LoaderCircle size={16} className="animate-spin" />
          {busy}...
        </p>
      )}
      {!playlists.isPending && !library.isPending && (
        <div className="mt-8 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="premium-card self-start rounded-3xl border border-white/8 p-3">
            <div className="px-3 py-3 text-xs font-bold uppercase tracking-widest text-slate-400">
              Coleções · {playlists.data?.length ?? 0}
            </div>
            {(playlists.data ?? []).map((playlist) => (
              <button
                key={playlist.id}
                type="button"
                onClick={() => {
                  setSelectedId(playlist.id)
                  setEditing(false)
                  setAdding(false)
                  setDeleteConfirm(false)
                }}
                className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${selected?.id === playlist.id && !editing ? 'bg-violet-500/20 text-white' : 'text-slate-300 hover:bg-white/7'}`}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/35 to-blue-500/25">
                  <ListMusic size={21} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">
                    {playlist.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {playlist.items.length}{' '}
                    {playlist.items.length === 1 ? 'item' : 'itens'}
                  </span>
                </span>
              </button>
            ))}
            {!playlists.data?.length && (
              <p className="px-3 py-5 text-sm text-slate-400">
                Crie sua primeira playlist para começar.
              </p>
            )}
          </aside>
          <section className="premium-card min-h-80 rounded-3xl border border-white/8 p-6 md:p-8">
            {editing ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  void run(selectedId ? 'Salvando' : 'Criando', async () => {
                    if (selectedId)
                      await window.orbe.updateLocalPlaylist(selectedId, {
                        name,
                        description,
                      })
                    else {
                      const created = await window.orbe.createLocalPlaylist({
                        name,
                        description,
                      })
                      setSelectedId(created.id)
                    }
                    setEditing(false)
                  })
                }}
                className="max-w-xl space-y-5"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">
                    {selectedId ? 'Editar playlist' : 'Nova playlist'}
                  </h2>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Cancelar"
                    onClick={() => setEditing(false)}
                  >
                    <X size={18} />
                  </Button>
                </div>
                <label className="block text-sm font-semibold">
                  Nome
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={80}
                    required
                    autoFocus
                    placeholder="Ex.: Favoritas da semana"
                    className="mt-2 w-full rounded-xl border border-white/12 bg-[#171b24] px-4 py-3 outline-none focus:border-violet-400"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Descrição{' '}
                  <span className="font-normal text-slate-400">(opcional)</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={300}
                    rows={3}
                    placeholder="Um pouco sobre esta coleção"
                    className="mt-2 w-full resize-none rounded-xl border border-white/12 bg-[#171b24] px-4 py-3 outline-none focus:border-violet-400"
                  />
                </label>
                <Button type="submit" disabled={!!busy || !name.trim()}>
                  {busy ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : (
                    <Check size={17} />
                  )}
                  {selectedId ? 'Salvar mudanças' : 'Criar playlist'}
                </Button>
              </form>
            ) : selected ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-5">
                    <span className="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/40 to-blue-500/30 shadow-xl">
                      <Disc3 size={38} />
                    </span>
                    <div>
                      <p className="section-eyebrow">PLAYLIST PESSOAL</p>
                      <h2 className="mt-2 text-2xl font-bold">
                        {selected.name}
                      </h2>
                      <p className="mt-1 text-sm text-slate-400">
                        {selected.description ||
                          `${selected.items.length} itens para ouvir quando quiser`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar playlist"
                      title="Editar"
                      onClick={() => {
                        setSelectedId(selected.id)
                        setName(selected.name)
                        setDescription(selected.description)
                        setEditing(true)
                      }}
                    >
                      <Pencil size={17} />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      aria-label="Excluir playlist"
                      title="Excluir"
                      onClick={() => setDeleteConfirm(true)}
                    >
                      <Trash2 size={17} />
                    </Button>
                  </div>
                </div>
                {deleteConfirm && (
                  <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-rose-400/20 bg-rose-400/8 p-3 text-sm">
                    <span>
                      Excluir “{selected.name}”? Os arquivos continuarão na
                      biblioteca.
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setDeleteConfirm(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      disabled={!!busy}
                      onClick={() =>
                        void run('Excluindo', async () => {
                          await window.orbe.deleteLocalPlaylist(selected.id)
                          setSelectedId(null)
                          setDeleteConfirm(false)
                        })
                      }
                    >
                      Excluir
                    </Button>
                  </div>
                )}
                <div className="mt-7 flex flex-wrap gap-2">
                  <Button
                    disabled={!selected.items.length || !!busy}
                    onClick={() => usePlayer.getState().play(selected.items, 0)}
                  >
                    <Play size={17} fill="currentColor" /> Reproduzir tudo
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setAdding((value) => !value)}
                  >
                    <Plus size={17} /> Adicionar da biblioteca
                  </Button>
                </div>
                {adding && (
                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/4 p-4">
                    <label className="flex items-center gap-2 rounded-xl bg-[#171b24] px-3 py-2">
                      <Search size={17} className="text-slate-400" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar na biblioteca"
                        aria-label="Buscar na biblioteca"
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                      />
                    </label>
                    <div className="orbe-scroll mt-3 max-h-60 space-y-1 overflow-y-auto">
                      {available.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          disabled={!!busy}
                          onClick={() =>
                            void run('Adicionando', () =>
                              window.orbe.addLocalPlaylistItem(
                                selected.id,
                                item.id,
                              ),
                            )
                          }
                          className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/7 disabled:opacity-50"
                        >
                          {item.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt=""
                              className="size-10 rounded-lg object-cover"
                            />
                          ) : (
                            <Disc3 size={24} className="mx-2 text-slate-400" />
                          )}
                          <span className="min-w-0 flex-1 truncate text-sm">
                            {item.title}
                          </span>
                          <Plus size={17} />
                        </button>
                      ))}
                      {!available.length && (
                        <p className="py-4 text-center text-sm text-slate-400">
                          {library.data?.length
                            ? 'Nenhum item disponível.'
                            : 'Adicione arquivos à biblioteca primeiro.'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                <div className="mt-7 space-y-2">
                  {selected.items.map((item, index) => (
                    <div
                      key={item.playlistItemId}
                      className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/4 p-2"
                    >
                      <span className="w-6 text-center text-xs text-slate-500">
                        {index + 1}
                      </span>
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt=""
                          className="size-12 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex size-12 items-center justify-center rounded-lg bg-white/5">
                          <Disc3 size={20} />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {item.title}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {item.artist ||
                            (item.mediaType === 'video' ? 'Vídeo' : 'Música')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Reproduzir ${item.title}`}
                        onClick={() =>
                          usePlayer.getState().play(selected.items, index)
                        }
                      >
                        <Play size={17} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Mover para cima"
                        disabled={index === 0 || !!busy}
                        onClick={() =>
                          void run('Reordenando', () =>
                            window.orbe.moveLocalPlaylistItem(
                              selected.id,
                              item.playlistItemId,
                              'up',
                            ),
                          )
                        }
                      >
                        <ArrowUp size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Mover para baixo"
                        disabled={index === selected.items.length - 1 || !!busy}
                        onClick={() =>
                          void run('Reordenando', () =>
                            window.orbe.moveLocalPlaylistItem(
                              selected.id,
                              item.playlistItemId,
                              'down',
                            ),
                          )
                        }
                      >
                        <ArrowDown size={16} />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        aria-label={`Remover ${item.title} da playlist`}
                        disabled={!!busy}
                        onClick={() =>
                          void run('Removendo', () =>
                            window.orbe.removeLocalPlaylistItem(
                              selected.id,
                              item.playlistItemId,
                            ),
                          )
                        }
                      >
                        <X size={17} />
                      </Button>
                    </div>
                  ))}
                  {!selected.items.length && (
                    <p className="rounded-2xl border border-dashed border-white/12 py-12 text-center text-sm text-slate-400">
                      Esta playlist ainda está vazia. Adicione algo da
                      biblioteca.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center text-center">
                <ListMusic size={38} className="text-violet-300" />
                <h2 className="mt-4 text-lg font-bold">
                  Sua próxima coleção começa aqui
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Crie uma playlist e junte suas músicas e vídeos favoritos.
                </p>
                <Button className="mt-6" onClick={newPlaylist}>
                  <Plus size={17} /> Criar playlist
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => useNavigation.getState().setPage('library')}
                >
                  Ir para a biblioteca
                </Button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
