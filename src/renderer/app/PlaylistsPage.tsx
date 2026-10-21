import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ListMusic, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigation } from '../stores/navigation'

export function PlaylistsPage() {
  const openMediaUrl = useNavigation((state) => state.openMediaUrl)
  const queryClient = useQueryClient()
  const overview = useQuery({
    queryKey: ['youtube'],
    queryFn: () => window.orbe.youTubeOverview(),
    retry: false,
  })
  const [playlistId, setPlaylistId] = useState<string | null>(null)
  const items = useQuery({
    queryKey: ['youtube-playlist', playlistId],
    queryFn: () => window.orbe.youTubePlaylistItems(playlistId ?? ''),
    enabled: !!playlistId,
    retry: false,
  })
  const connect = useMutation({
    mutationFn: () => window.orbe.connectYouTube(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['youtube'] })
    },
  })
  const disconnect = useMutation({
    mutationFn: () => window.orbe.disconnectYouTube(),
    onSuccess: async () => {
      setPlaylistId(null)
      await queryClient.invalidateQueries({ queryKey: ['youtube'] })
    },
  })
  const data = overview.data
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Playlists do YouTube</h1>
          <p className="mt-2 text-sm text-slate-400">
            Acesse metadados das suas playlists pela API oficial.
          </p>
        </div>
        {data?.connected ? (
          <Button
            variant="secondary"
            disabled={disconnect.isPending}
            onClick={() => disconnect.mutate()}
          >
            {disconnect.isPending && (
              <LoaderCircle size={16} className="animate-spin" />
            )}
            {disconnect.isPending ? 'Desconectando...' : 'Desconectar'}
          </Button>
        ) : (
          <Button disabled={connect.isPending} onClick={() => connect.mutate()}>
            {connect.isPending && (
              <LoaderCircle size={16} className="animate-spin" />
            )}
            {connect.isPending ? 'Conectando...' : 'Conectar YouTube'}
          </Button>
        )}
      </div>
      {connect.isError && (
        <p role="alert" className="mt-5 text-sm text-rose-400">
          {connect.error instanceof Error
            ? connect.error.message
            : 'Falha ao conectar.'}
        </p>
      )}
      {overview.isError && (
        <p role="alert" className="mt-5 text-sm text-rose-400">
          Não foi possível carregar as playlists.
        </p>
      )}
      {overview.isPending && (
        <div
          role="status"
          aria-label="Carregando playlists do YouTube"
          className="mt-8 space-y-3"
        >
          <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-44 animate-pulse rounded-2xl bg-white/5" />
        </div>
      )}
      {overview.isPending ? null : !data?.connected ? (
        <div className="mt-8 rounded-3xl border border-white/6 bg-[#11141b] p-10 text-center">
          <ListMusic className="mx-auto text-violet-300" />
          <p className="mt-4 text-sm text-slate-400">
            Configure um Google Desktop Client ID na aba Integrações e conecte
            sua conta.
          </p>
        </div>
      ) : (
        <div className="mt-8">
          <div className="flex items-center gap-4 rounded-2xl bg-[#11141b] p-5">
            {data.avatar && (
              <img src={data.avatar} alt="" className="size-14 rounded-full" />
            )}
            <div>
              <div className="font-semibold">{data.name ?? 'Conta Google'}</div>
              <div className="text-xs text-slate-400">{data.email}</div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {data.playlists.map((playlist) => (
              <button
                type="button"
                key={playlist.id}
                onClick={() => setPlaylistId(playlist.id)}
                className="flex items-center gap-4 rounded-2xl bg-[#11141b] p-4 text-left"
              >
                {playlist.thumbnail && (
                  <img
                    src={playlist.thumbnail}
                    alt=""
                    className="size-16 rounded-xl object-cover"
                  />
                )}
                <div>
                  <div className="font-semibold">{playlist.title}</div>
                  <div className="text-xs text-slate-400">
                    {playlist.itemCount} vídeos
                  </div>
                </div>
              </button>
            ))}
          </div>
          {playlistId && (
            <section className="mt-6 rounded-2xl bg-[#11141b] p-6">
              <h2 className="font-semibold">Vídeos da playlist</h2>
              <Button
                className="mt-4"
                size="sm"
                onClick={() =>
                  openMediaUrl(
                    `https://www.youtube.com/playlist?list=${playlistId}`,
                  )
                }
              >
                Analisar playlist para download
              </Button>
              {items.isError && (
                <p className="mt-3 text-sm text-rose-400">
                  Não foi possível carregar os vídeos.
                </p>
              )}
              {items.isPending && (
                <p
                  role="status"
                  className="mt-4 flex items-center gap-2 text-sm text-violet-200"
                >
                  <LoaderCircle size={16} className="animate-spin" /> Carregando
                  vídeos...
                </p>
              )}
              {items.data?.map((item) => (
                <div
                  key={item.id}
                  className="mt-3 flex items-center gap-3 text-sm"
                >
                  {item.thumbnail && (
                    <img
                      src={item.thumbnail}
                      alt=""
                      className="h-12 w-20 rounded object-cover"
                    />
                  )}
                  <span className="flex-1">{item.title}</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openMediaUrl(item.url)}
                  >
                    Analisar
                  </Button>
                </div>
              ))}
              <p className="mt-5 text-xs text-slate-500">
                Conectar a conta não concede permissão para baixar vídeos
                protegidos.
              </p>
            </section>
          )}
        </div>
      )}
    </>
  )
}
