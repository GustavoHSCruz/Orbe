import { useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  ExternalLink,
  FolderOpen,
  LoaderCircle,
  Music2,
} from 'lucide-react'
import {
  FaDiscord,
  FaFacebook,
  FaInstagram,
  FaSpotify,
  FaYoutube,
  FaXTwitter,
} from 'react-icons/fa6'
import type { Settings } from '../../shared/contracts/media'
import { Button } from '@/components/ui/button'
import { useNavigation } from '../stores/navigation'

function Card({
  icon,
  title,
  detail,
  color,
  status,
  children,
}: {
  icon: ReactNode
  title: string
  detail: string
  color: string
  status?: string
  children: ReactNode
}) {
  return (
    <section className="premium-card overflow-hidden rounded-3xl border border-white/8 p-6">
      <div className="flex items-start gap-4">
        <span
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
          style={{ backgroundColor: `${color}24`, color }}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
        </div>
        {status && (
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
            {status}
          </span>
        )}
      </div>
      <div className="mt-6 border-t border-white/8 pt-5">{children}</div>
    </section>
  )
}

const fieldClass =
  'mt-2 h-11 w-full rounded-xl border border-white/8 bg-[#171b24] px-4 text-sm outline-none focus:border-violet-400/50'

export function IntegrationsPage() {
  const queryClient = useQueryClient()
  const { setPage } = useNavigation()
  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.orbe.getSettings(),
  })
  const spotify = useQuery({
    queryKey: ['spotify'],
    queryFn: () => window.orbe.spotifyOverview(),
    retry: false,
  })
  const youtube = useQuery({
    queryKey: ['youtube'],
    queryFn: () => window.orbe.youTubeOverview(),
    retry: false,
  })
  const [draft, setDraft] = useState<Settings | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const settings = draft ?? settingsQuery.data
  const save = async (value: Settings) => {
    const saved = await window.orbe.saveSettings(value)
    setDraft(saved)
    queryClient.setQueryData(['settings'], saved)
    setMessage('Integrações salvas.')
  }
  const action = async (run: () => Promise<void>) => {
    setBusy(true)
    setMessage('')
    try {
      await run()
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível concluir a ação.',
      )
    } finally {
      setBusy(false)
    }
  }
  if (!settings)
    return (
      <div
        role="status"
        aria-label="Carregando integrações"
        className="grid gap-5 xl:grid-cols-2"
      >
        {[0, 1, 2, 3].map((number) => (
          <div
            key={number}
            className="h-60 animate-pulse rounded-3xl bg-white/5"
          />
        ))}
      </div>
    )
  const updateDiscord = (change: Partial<Settings['discord']>) =>
    setDraft({ ...settings, discord: { ...settings.discord, ...change } })
  return (
    <>
      <div className="mb-8">
        <span className="section-eyebrow">CONECTE SEU MUNDO</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Integrações</h1>
        <p className="mt-2 text-sm text-slate-400">
          Configure cada serviço no seu próprio ritmo.
        </p>
      </div>
      {busy && (
        <p
          role="status"
          className="mb-5 flex items-center gap-2 text-sm text-violet-200"
        >
          <LoaderCircle size={17} className="animate-spin" /> Processando
          integração...
        </p>
      )}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card
          icon={<FaSpotify />}
          title="Spotify"
          detail="Mostra reprodução, recentes e playlists da sua conta. Sem downloads."
          color="#1ed760"
          status={spotify.data?.connected ? 'Conectado' : 'Desconectado'}
        >
          <label
            htmlFor="spotify-client"
            className="text-xs font-semibold text-slate-300"
          >
            Client ID do Spotify
          </label>
          <input
            id="spotify-client"
            value={settings.spotifyClientId}
            onChange={(event) =>
              setDraft({ ...settings, spotifyClientId: event.target.value })
            }
            placeholder="Cole o Client ID da sua aplicação"
            className={fieldClass}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {spotify.data?.connected ? (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await window.orbe.disconnectSpotify()
                    await queryClient.invalidateQueries({
                      queryKey: ['spotify'],
                    })
                  })
                }
              >
                Desconectar
              </Button>
            ) : (
              <Button
                disabled={busy || !settings.spotifyClientId}
                onClick={() =>
                  void action(async () => {
                    await save(settings)
                    await window.orbe.connectSpotify()
                    await queryClient.invalidateQueries({
                      queryKey: ['spotify'],
                    })
                  })
                }
              >
                Conectar Spotify
              </Button>
            )}
            <Button variant="ghost" onClick={() => setPage('spotify')}>
              Abrir Spotify <ExternalLink size={14} />
            </Button>
          </div>
        </Card>
        <Card
          icon={<FaYoutube />}
          title="YouTube"
          detail="Importe playlists e use sua sessão para analisar, ouvir prévias e baixar vídeos."
          color="#ff4e5b"
          status={
            settings.youtubeCookiesFile || settings.youtubeBrowser !== 'none'
              ? 'Sessão para mídia configurada'
              : 'Links públicos'
          }
        >
          <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
            <p className="text-sm font-semibold text-slate-100">
              Sessão para vídeos e músicas
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Se o YouTube pedir para confirmar que você não é um robô, use o
              navegador em que sua conta está conectada. Feche o navegador antes
              de tentar novamente. A sessão também vale para prévias e
              downloads.
            </p>
            <label
              htmlFor="youtube-browser"
              className="mt-4 block text-xs font-semibold text-slate-300"
            >
              Usar sessão do navegador
            </label>
            <select
              id="youtube-browser"
              value={settings.youtubeBrowser}
              onChange={(event) =>
                setDraft({
                  ...settings,
                  youtubeBrowser: event.target
                    .value as Settings['youtubeBrowser'],
                })
              }
              className={fieldClass}
            >
              <option value="none">Não usar navegador</option>
              <option value="chrome">Google Chrome</option>
              <option value="edge">Microsoft Edge</option>
              <option value="firefox">Mozilla Firefox</option>
              <option value="brave">Brave</option>
            </select>
            <p className="mt-4 text-xs font-semibold text-slate-300">
              Ou escolher um arquivo cookies.txt
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              O arquivo tem prioridade sobre o navegador. O Orbe guarda
              apenas o caminho local; mantenha o arquivo privado.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                aria-label="Cookies do YouTube"
                readOnly
                value={settings.youtubeCookiesFile}
                placeholder="Nenhum arquivo selecionado"
                className={`${fieldClass} mt-0 min-w-0 flex-1`}
              />
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void window.orbe.chooseCookiesFile().then((path) => {
                    if (path)
                      setDraft({ ...settings, youtubeCookiesFile: path })
                  })
                }
              >
                <FolderOpen size={16} /> Escolher
              </Button>
            </div>
            {settings.youtubeCookiesFile && (
              <Button
                variant="ghost"
                className="mt-2"
                onClick={() =>
                  setDraft({ ...settings, youtubeCookiesFile: '' })
                }
              >
                Remover arquivo
              </Button>
            )}
          </div>
          <div className="mt-5 border-t border-white/8 pt-5">
            <p className="text-sm font-semibold text-slate-100">
              Playlists da sua conta{' '}
              <span className="text-xs font-normal text-slate-400">
                (opcional)
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-400">
              A conexão com o Google importa suas playlists. Ela não autentica
              os downloads.
            </p>
            <label
              htmlFor="google-client"
              className="mt-4 block text-xs font-semibold text-slate-300"
            >
              Google Desktop Client ID
            </label>
            <input
              id="google-client"
              value={settings.googleClientId}
              onChange={(event) =>
                setDraft({ ...settings, googleClientId: event.target.value })
              }
              placeholder="Cole o Client ID OAuth do Google"
              className={fieldClass}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {youtube.data?.connected ? (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    void action(async () => {
                      await window.orbe.disconnectYouTube()
                      await queryClient.invalidateQueries({
                        queryKey: ['youtube'],
                      })
                    })
                  }
                >
                  Desconectar
                </Button>
              ) : (
                <Button
                  disabled={busy || !settings.googleClientId}
                  onClick={() =>
                    void action(async () => {
                      await save(settings)
                      await window.orbe.connectYouTube()
                      await queryClient.invalidateQueries({
                        queryKey: ['youtube'],
                      })
                    })
                  }
                >
                  Conectar YouTube
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => setPage('youtube-playlists')}
              >
                Abrir playlists <ExternalLink size={14} />
              </Button>
            </div>
          </div>
        </Card>
        <Card
          icon={<FaDiscord />}
          title="Discord"
          detail="Mostre o que está tocando no seu perfil, com controle sobre cada detalhe."
          color="#8792ff"
          status={settings.discord.enabled ? 'Ativado' : 'Desativado'}
        >
          <label
            htmlFor="discord-client"
            className="text-xs font-semibold text-slate-300"
          >
            Application ID do Discord
          </label>
          <input
            id="discord-client"
            value={settings.discordClientId}
            onChange={(event) =>
              setDraft({ ...settings, discordClientId: event.target.value })
            }
            placeholder="Cole o Application ID"
            className={fieldClass}
          />
          <label className="mt-4 flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={settings.discord.enabled}
              onChange={(event) =>
                updateDiscord({ enabled: event.target.checked })
              }
            />{' '}
            Ativar Rich Presence
          </label>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
            {(
              [
                ['showTitle', 'Título'],
                ['showArtist', 'Artista'],
                ['showAlbum', 'Álbum'],
                ['showArtwork', 'Capa'],
                ['showPlaybackTime', 'Tempo de reprodução'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.discord[key]}
                  onChange={(event) =>
                    updateDiscord({ [key]: event.target.checked })
                  }
                />{' '}
                {label}
              </label>
            ))}
          </div>
          <label
            htmlFor="discord-source"
            className="mt-5 block text-xs font-semibold text-slate-300"
          >
            Fonte da presença
          </label>
          <select
            id="discord-source"
            value={settings.discord.source}
            onChange={(event) =>
              updateDiscord({
                source: event.target.value as Settings['discord']['source'],
              })
            }
            className={fieldClass}
          >
            <option value="automatic">Automática</option>
            <option value="orbe">Orbe</option>
            <option value="spotify">Spotify</option>
          </select>
          <label
            htmlFor="discord-priority"
            className="mt-4 block text-xs font-semibold text-slate-300"
          >
            Prioridade
          </label>
          <select
            id="discord-priority"
            value={settings.discord.priority}
            onChange={(event) =>
              updateDiscord({
                priority: event.target.value as Settings['discord']['priority'],
              })
            }
            className={fieldClass}
          >
            <option value="automatic">Automática</option>
            <option value="spotify-native">Spotify nativo</option>
            <option value="orbe">Orbe</option>
          </select>
          <label
            htmlFor="discord-paused"
            className="mt-4 block text-xs font-semibold text-slate-300"
          >
            Quando estiver pausado
          </label>
          <select
            id="discord-paused"
            value={settings.discord.paused}
            onChange={(event) =>
              updateDiscord({
                paused: event.target.value as Settings['discord']['paused'],
              })
            }
            className={fieldClass}
          >
            <option value="clear">Limpar presença</option>
            <option value="show">Mostrar pausado</option>
          </select>
        </Card>
        <Card
          icon={
            <div className="flex gap-1">
              <FaInstagram />
              <FaFacebook />
              <FaXTwitter />
            </div>
          }
          title="Redes sociais"
          detail="Instagram, Facebook e X. Use sua sessão quando uma publicação exigir login."
          color="#ee79aa"
          status={
            settings.socialCookiesFile ? 'Sessão configurada' : 'Links públicos'
          }
        >
          <label className="text-xs font-semibold text-slate-300">
            Arquivo cookies.txt (opcional)
          </label>
          <p className="mt-1 text-xs text-slate-400">
            Selecione um arquivo Netscape exportado da sua sessão. O Orbe
            salva apenas o caminho local.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              aria-label="Arquivo de cookies"
              readOnly
              value={settings.socialCookiesFile}
              placeholder="Nenhum arquivo selecionado"
              className={`${fieldClass} mt-0 min-w-0 flex-1`}
            />
            <Button
              variant="secondary"
              onClick={() =>
                void window.orbe.chooseCookiesFile().then((path) => {
                  if (path) setDraft({ ...settings, socialCookiesFile: path })
                })
              }
            >
              <FolderOpen size={16} /> Escolher
            </Button>
          </div>
          {settings.socialCookiesFile && (
            <Button
              variant="ghost"
              className="mt-2"
              onClick={() => setDraft({ ...settings, socialCookiesFile: '' })}
            >
              Remover sessão
            </Button>
          )}
        </Card>
        <Card
          icon={<Music2 />}
          title="Letras · LRCLIB"
          detail="Busca letras sincronizadas para músicas da sua biblioteca quando há título e artista reconhecíveis."
          color="#b69aff"
          status="Automático"
        >
          <p className="text-xs leading-5 text-slate-400">
            O player procura primeiro um arquivo .lrc ao lado da mídia. Se não
            encontrar, consulta o LRCLIB com título e artista. Abra o player
            expandido para acompanhar a letra.
          </p>
        </Card>
      </div>
      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-white/10 bg-[#171b24]/95 p-3 backdrop-blur-xl">
        <Button
          disabled={busy}
          onClick={() => void action(() => save(settings))}
        >
          {busy ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <Check size={16} />
          )}
          {busy ? 'Salvando...' : 'Salvar alterações'}
        </Button>
        {message && (
          <p role="status" className="text-xs text-slate-300">
            {message}
          </p>
        )}
      </div>
    </>
  )
}
