import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AudioLines,
  Check,
  FolderOpen,
  HardDriveDownload,
  LoaderCircle,
  Palette,
} from 'lucide-react'
import type { Settings } from '../../shared/contracts/media'
import { Button } from '@/components/ui/button'
import { usePlayer } from '../stores/player'
import { LibraryFolders } from './LibraryFolders'
import type { PreviousDirectoryAction } from '../../shared/contracts/library-locations'

const field =
  'mt-2 h-11 w-full rounded-xl border border-white/8 bg-[#171b24] px-4 text-sm outline-none focus:border-violet-400/50'

export function SettingsPage() {
  const crossfadeSeconds = usePlayer((state) => state.crossfadeSeconds)
  const normalizeVolume = usePlayer((state) => state.normalizeVolume)
  const setCrossfadeSeconds = usePlayer((state) => state.setCrossfadeSeconds)
  const setNormalizeVolume = usePlayer((state) => state.setNormalizeVolume)
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.orbe.getSettings(),
  })
  const [draft, setDraft] = useState<Settings | null>(null)
  const [message, setMessage] = useState('')
  const [choosing, setChoosing] = useState(false)
  const [previousDirectoryAction, setPreviousDirectoryAction] = useState<
    PreviousDirectoryAction | undefined
  >()
  const settings = draft ?? query.data
  const save = useMutation({
    mutationFn: (value: Settings) =>
      window.orbe.saveSettings(value, previousDirectoryAction),
    onSuccess: (value) => {
      setDraft(value)
      queryClient.setQueryData(['settings'], value)
      setMessage('Configurações salvas.')
      setPreviousDirectoryAction(undefined)
      void queryClient.invalidateQueries({ queryKey: ['library-locations'] })
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Falha ao salvar.'),
  })
  if (!settings)
    return (
      <div
        role="status"
        aria-label="Carregando configurações"
        className="max-w-3xl space-y-5"
      >
        <div className="h-16 w-72 animate-pulse rounded-2xl bg-white/5" />
        <div className="h-60 animate-pulse rounded-3xl bg-white/5" />
        <div className="h-60 animate-pulse rounded-3xl bg-white/5" />
      </div>
    )
  return (
    <>
      <div>
        <span className="section-eyebrow">SEU ESPAÇO</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Configurações
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Ajuste o Orbe para o seu jeito de usar.
        </p>
      </div>
      <div className="mt-7 max-w-3xl space-y-5">
        <LibraryFolders
          onSettingsChange={(value) =>
            setDraft((current) =>
              current
                ? { ...current, libraryDirectories: value.libraryDirectories }
                : null,
            )
          }
        />
        <section className="premium-card rounded-3xl border border-white/8 p-7">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-400/12 text-emerald-300">
              <AudioLines size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold">Reprodução</h2>
              <p className="text-xs text-slate-400">
                Ajustes de áudio salvos automaticamente.
              </p>
            </div>
          </div>
          <label
            htmlFor="crossfade"
            className="mt-6 block text-sm font-semibold"
          >
            Transição suave entre músicas
          </label>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            A próxima faixa começa antes da atual terminar, com uma passagem
            gradual entre elas. Funciona também ao avançar manualmente.
          </p>
          <select
            id="crossfade"
            value={crossfadeSeconds}
            onChange={(event) =>
              setCrossfadeSeconds(Number(event.target.value))
            }
            className={field}
          >
            <option value="0">Desativada</option>
            <option value="2">2 segundos</option>
            <option value="4">4 segundos</option>
            <option value="6">6 segundos</option>
            <option value="8">8 segundos</option>
          </select>
          <label className="mt-6 flex items-start gap-3 border-t border-white/8 pt-5">
            <input
              type="checkbox"
              checked={normalizeVolume}
              onChange={(event) => setNormalizeVolume(event.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-semibold">
                Equilibrar o volume das músicas
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">
                O Orbe mede a intensidade de cada arquivo e aproxima as faixas
                de um mesmo nível. A primeira medição pode levar alguns
                segundos.
              </span>
            </span>
          </label>
        </section>
        <section className="premium-card rounded-3xl border border-white/8 p-7">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-violet-400/12 text-violet-300">
              <HardDriveDownload size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold">Downloads</h2>
              <p className="text-xs text-slate-400">
                Destino, velocidade e organização dos arquivos.
              </p>
            </div>
          </div>
          <label className="mt-6 block text-sm font-semibold">
            Pasta de downloads
          </label>
          <div className="mt-2 flex gap-3">
            <input
              aria-label="Pasta de downloads"
              readOnly
              value={settings.downloadDirectory}
              className={`${field} mt-0 min-w-0 flex-1 text-slate-300`}
            />
            <Button
              variant="secondary"
              disabled={choosing}
              onClick={() => {
                setChoosing(true)
                void window.orbe
                  .chooseDownloadDirectory()
                  .then((path) => {
                    if (path) {
                      setDraft({ ...settings, downloadDirectory: path })
                      setPreviousDirectoryAction(undefined)
                    }
                  })
                  .catch((cause) =>
                    setMessage(
                      cause instanceof Error
                        ? cause.message
                        : 'Falha ao abrir pasta.',
                    ),
                  )
                  .finally(() => setChoosing(false))
              }}
            >
              {choosing ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <FolderOpen size={17} />
              )}
              {choosing ? 'Abrindo...' : 'Escolher'}
            </Button>
          </div>
          {query.data &&
            settings.downloadDirectory !== query.data.downloadDirectory && (
              <fieldset className="download-directory-choice">
                <legend>O que fazer com a pasta anterior?</legend>
                <p className="folder-path">{query.data.downloadDirectory}</p>
                <p>
                  Seus arquivos e os itens já importados continuam na
                  biblioteca. Escolha onde buscar novos arquivos.
                </p>
                <label>
                  <input
                    type="radio"
                    name="previous-directory"
                    checked={previousDirectoryAction === 'keep'}
                    onChange={() => setPreviousDirectoryAction('keep')}
                  />
                  <span>
                    <strong>Continuar buscando na pasta anterior</strong>
                    <small>
                      A pasta anterior fica nas pastas de mídia, junto com o
                      novo destino.
                    </small>
                  </span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="previous-directory"
                    checked={previousDirectoryAction === 'stop'}
                    onChange={() => setPreviousDirectoryAction('stop')}
                  />
                  <span>
                    <strong>Parar de buscar na pasta anterior</strong>
                    <small>
                      Os arquivos existentes não serão movidos nem excluídos.
                    </small>
                  </span>
                </label>
              </fieldset>
            )}
          <div className="mt-6 rounded-2xl border border-violet-400/15 bg-violet-500/5 p-5">
            <h3 className="text-sm font-bold">Formato favorito</h3>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Sua escolha aparece selecionada ao preparar vídeos e playlists.
              Você pode mudar em cada download.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="preferred-kind"
                  className="text-xs font-semibold"
                >
                  Abrir como
                </label>
                <select
                  id="preferred-kind"
                  value={settings.preferredDownload.kind}
                  onChange={(event) =>
                    setDraft({
                      ...settings,
                      preferredDownload: {
                        ...settings.preferredDownload,
                        kind: event.target
                          .value as Settings['preferredDownload']['kind'],
                      },
                    })
                  }
                  className={field}
                >
                  <option value="video">Vídeo completo</option>
                  <option value="audio">Só o áudio</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="preferred-video-extension"
                  className="text-xs font-semibold"
                >
                  Formato de vídeo
                </label>
                <select
                  id="preferred-video-extension"
                  value={settings.preferredDownload.videoExtension}
                  onChange={(event) =>
                    setDraft({
                      ...settings,
                      preferredDownload: {
                        ...settings.preferredDownload,
                        videoExtension: event.target
                          .value as Settings['preferredDownload']['videoExtension'],
                      },
                    })
                  }
                  className={field}
                >
                  <option value="mp4">MP4 · mais compatível</option>
                  <option value="webm">WebM · bom para navegadores</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="preferred-video-quality"
                  className="text-xs font-semibold"
                >
                  Qualidade de vídeo
                </label>
                <select
                  id="preferred-video-quality"
                  value={settings.preferredDownload.videoQuality}
                  onChange={(event) =>
                    setDraft({
                      ...settings,
                      preferredDownload: {
                        ...settings.preferredDownload,
                        videoQuality: event.target
                          .value as Settings['preferredDownload']['videoQuality'],
                      },
                    })
                  }
                  className={field}
                >
                  <option value="best">Melhor disponível</option>
                  <option value="1080p">1080p · alta definição</option>
                  <option value="720p">720p · equilibrado</option>
                  <option value="480p">480p · arquivo menor</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="preferred-audio-extension"
                  className="text-xs font-semibold"
                >
                  Formato de áudio
                </label>
                <select
                  id="preferred-audio-extension"
                  value={settings.preferredDownload.audioExtension}
                  onChange={(event) =>
                    setDraft({
                      ...settings,
                      preferredDownload: {
                        ...settings.preferredDownload,
                        audioExtension: event.target
                          .value as Settings['preferredDownload']['audioExtension'],
                      },
                    })
                  }
                  className={field}
                >
                  <option value="mp3">MP3 · mais compatível</option>
                  <option value="m4a">M4A · arquivo compacto</option>
                  <option value="opus">Opus · arquivo compacto</option>
                </select>
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="concurrency" className="text-sm font-semibold">
                Downloads simultâneos
              </label>
              <select
                id="concurrency"
                value={settings.concurrentDownloads}
                onChange={(event) =>
                  setDraft({
                    ...settings,
                    concurrentDownloads: Number(event.target.value),
                  })
                }
                className={field}
              >
                {[1, 2, 3, 4].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="naming-template"
                className="text-sm font-semibold"
              >
                Nome dos arquivos
              </label>
              <select
                id="naming-template"
                value={settings.namingTemplate}
                onChange={(event) =>
                  setDraft({
                    ...settings,
                    namingTemplate: event.target
                      .value as Settings['namingTemplate'],
                  })
                }
                className={field}
              >
                <option value="title">Título</option>
                <option value="title-quality">Título e qualidade</option>
                <option value="channel-title">Canal e título</option>
              </select>
            </div>
          </div>
          <label
            htmlFor="speed-limit"
            className="mt-5 block text-sm font-semibold"
          >
            Limite de velocidade (KB/s)
          </label>
          <p className="mt-1 text-xs text-slate-400">Use 0 para não limitar.</p>
          <input
            id="speed-limit"
            type="number"
            min="0"
            max="1000000"
            value={settings.speedLimitKbps}
            onChange={(event) =>
              setDraft({
                ...settings,
                speedLimitKbps: Number(event.target.value),
              })
            }
            className={field}
          />
          <div className="mt-6 space-y-3 border-t border-white/8 pt-5 text-sm">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.notifyOnComplete}
                onChange={(event) =>
                  setDraft({
                    ...settings,
                    notifyOnComplete: event.target.checked,
                  })
                }
              />{' '}
              Notificar quando concluir
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.askWhereToSave}
                onChange={(event) =>
                  setDraft({
                    ...settings,
                    askWhereToSave: event.target.checked,
                  })
                }
              />{' '}
              Perguntar onde salvar cada download
            </label>
          </div>
        </section>
        <section className="premium-card rounded-3xl border border-white/8 p-7">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-blue-400/12 text-blue-300">
              <Palette size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold">Aparência</h2>
              <p className="text-xs text-slate-400">
                Escolha um visual confortável para você.
              </p>
            </div>
          </div>
          <label htmlFor="theme" className="mt-5 block text-sm font-semibold">
            Tema
          </label>
          <select
            id="theme"
            value={settings.theme}
            onChange={(event) =>
              setDraft({
                ...settings,
                theme: event.target.value as Settings['theme'],
              })
            }
            className={field}
          >
            <option value="dark">Escuro</option>
            <option value="light">Claro</option>
            <option value="system">Usar tema do sistema</option>
          </select>
        </section>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => save.mutate(settings)}
            disabled={
              save.isPending ||
              (!!query.data &&
                settings.downloadDirectory !== query.data.downloadDirectory &&
                !previousDirectoryAction)
            }
          >
            {save.isPending ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Check size={17} />
            )}{' '}
            {save.isPending ? 'Salvando...' : 'Salvar alterações'}
          </Button>
          {message && (
            <p role="status" className="text-sm text-slate-400">
              {message}
            </p>
          )}
        </div>
      </div>
    </>
  )
}
