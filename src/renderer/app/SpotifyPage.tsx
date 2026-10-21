import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, LoaderCircle } from 'lucide-react'
import { SiSpotify } from 'react-icons/si'
import { Button } from '@/components/ui/button'
import { PlaylistImportPanel } from './PlaylistImportPanel'
import { useNavigation } from '../stores/navigation'
import './playlist-transfer.css'

export function SpotifyPage() {
  const setPage = useNavigation((state) => state.setPage)
  const queryClient = useQueryClient()
  const overview = useQuery({
    queryKey: ['spotify'],
    queryFn: () => window.orbe.spotifyOverview(),
    refetchInterval: 15000,
    retry: false,
  })
  const [playlistId, setPlaylistId] = useState<string | null>(null)
  const items = useQuery({
    queryKey: ['spotify-playlist', playlistId],
    queryFn: () => window.orbe.spotifyPlaylistItems(playlistId ?? ''),
    enabled: !!playlistId,
    retry: false,
  })
  const connect = useMutation({
    mutationFn: () => window.orbe.connectSpotify(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['spotify'] })
    },
  })
  const disconnect = useMutation({
    mutationFn: () => window.orbe.disconnectSpotify(),
    onSuccess: async () => {
      setPlaylistId(null)
      await queryClient.invalidateQueries({ queryKey: ['spotify'] })
    },
  })
  const data = overview.data
  return (
    <>
      <div className="spotify-page-heading">
        <SiSpotify
          size={34}
          className="transfer-spotify shrink-0"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">Do Spotify para sua biblioteca</h1>
          <p className="mt-2 text-sm text-slate-400">
            Traga sua lista de músicas, encontre as versões no YouTube e baixe
            os áudios no Orbe.
          </p>
        </div>
      </div>
      <PlaylistImportPanel />
      <details className="spotify-account">
        <summary>
          <SiSpotify
            size={21}
            className="transfer-spotify"
            aria-hidden="true"
          />
          <span>
            Conta Spotify{' '}
            <span className="transfer-muted">
              · {data?.connected ? 'Conectada' : 'Opcional'}
            </span>
          </span>
          <ChevronDown size={17} aria-hidden="true" />
        </summary>
        <div className="spotify-account-body">
          <p className="transfer-muted mb-4">
            Conecte sua conta para ver o que está tocando, suas músicas recentes
            e playlists. A importação pelo link funciona sem conexão.
          </p>
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
            <Button
              variant="secondary"
              disabled={connect.isPending || overview.isPending}
              onClick={() => connect.mutate()}
            >
              {connect.isPending && (
                <LoaderCircle size={16} className="animate-spin" />
              )}
              {connect.isPending ? 'Conectando...' : 'Conectar conta Spotify'}
            </Button>
          )}
          {connect.isError && (
            <p role="alert" className="mt-5 text-sm text-rose-400">
              {connect.error instanceof Error
                ? connect.error.message
                : 'Falha ao conectar.'}
            </p>
          )}
          {disconnect.isError && (
            <p role="alert" className="mt-4 text-sm text-rose-400">
              Não foi possível desconectar. Tente novamente.
            </p>
          )}
          {overview.isError && (
            <p role="alert" className="mt-5 text-sm text-rose-400">
              Spotify indisponível. Tente novamente mais tarde.
            </p>
          )}
          {overview.isPending && (
            <div
              role="status"
              aria-label="Carregando Spotify"
              className="mt-8 space-y-3"
            >
              <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
              <div className="h-44 animate-pulse rounded-2xl bg-white/5" />
            </div>
          )}
          {overview.isPending ? null : !data?.connected ? (
            <div className="mt-4">
              <p className="text-sm text-slate-400">
                Na primeira conexão, configure o Spotify Client ID em
                Integrações.
              </p>
              <Button
                variant="ghost"
                className="mt-2"
                onClick={() => setPage('integrations')}
              >
                Configurar conexão
              </Button>
            </div>
          ) : (
            <div className="mt-8 space-y-6">
              <div className="flex items-center gap-4 rounded-2xl bg-[#11141b] p-5">
                {data.profile?.avatar && (
                  <img
                    src={data.profile.avatar}
                    alt=""
                    className="size-14 rounded-full"
                  />
                )}
                <div>
                  <div className="text-xs text-slate-400">Conectado como</div>
                  <div className="font-semibold">{data.profile?.name}</div>
                </div>
              </div>
              <section className="rounded-2xl bg-[#11141b] p-6">
                <h2 className="text-lg font-semibold">Tocando agora</h2>
                {data.nowPlaying ? (
                  <div className="mt-4 flex items-center gap-4">
                    {data.nowPlaying.artwork && (
                      <img
                        src={data.nowPlaying.artwork}
                        alt="Capa do álbum"
                        className="size-20 object-contain"
                      />
                    )}
                    <div>
                      <div className="font-semibold">
                        {data.nowPlaying.title}
                      </div>
                      <div className="text-sm text-slate-400">
                        {data.nowPlaying.artist}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {data.nowPlaying.isPlaying ? 'Reproduzindo' : 'Pausado'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">
                    Nada em reprodução.
                  </p>
                )}
              </section>
              <section className="rounded-2xl bg-[#11141b] p-6">
                <h2 className="text-lg font-semibold">Ouvidas recentemente</h2>
                {data.recentlyPlayed.map((track, index) => (
                  <div key={`${track.title}-${index}`} className="mt-3 text-sm">
                    {track.title}{' '}
                    <span className="text-slate-400">· {track.artist}</span>
                  </div>
                ))}
                {!data.recentlyPlayed.length && (
                  <p className="mt-3 text-sm text-slate-400">
                    Nenhuma faixa recente.
                  </p>
                )}
              </section>
              <section className="rounded-2xl bg-[#11141b] p-6">
                <h2 className="text-lg font-semibold">Suas playlists</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {data.playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      type="button"
                      onClick={() => setPlaylistId(playlist.id)}
                      className="flex items-center gap-3 rounded-xl bg-white/5 p-3 text-left text-sm"
                    >
                      {playlist.image && (
                        <img
                          src={playlist.image}
                          alt=""
                          className="size-12 object-contain"
                        />
                      )}
                      <span>
                        {playlist.name}
                        <span className="block text-xs text-slate-400">
                          {playlist.total} itens
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                {playlistId && (
                  <div className="mt-6">
                    <h3 className="font-semibold">Itens da playlist</h3>
                    {items.isError && (
                      <p className="mt-2 text-sm text-rose-400">
                        Não foi possível carregar esta playlist.
                      </p>
                    )}
                    {items.isPending && (
                      <p
                        role="status"
                        className="mt-4 flex items-center gap-2 text-sm text-violet-200"
                      >
                        <LoaderCircle size={16} className="animate-spin" />{' '}
                        Carregando músicas...
                      </p>
                    )}
                    {items.data?.map((item, index) => (
                      <div
                        key={`${item.title}-${index}`}
                        className="mt-2 text-sm"
                      >
                        {item.title}{' '}
                        <span className="text-slate-400">· {item.artist}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </details>
    </>
  )
}
