import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowDownToLine,
  FolderOpen,
  FolderPlus,
  LoaderCircle,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LibraryLocations } from '../../shared/contracts/library-locations'
import type { Settings } from '../../shared/contracts/media'
import { useNavigation } from '../stores/navigation'

export function useLibraryLocations() {
  return useQuery({
    queryKey: ['library-locations'],
    queryFn: () => window.orbe.libraryLocations(),
    refetchInterval: 10000,
  })
}

export function LibraryHealthNotice() {
  const report = useLibraryLocations()
  const count = report.data?.missing.length ?? 0
  const unavailable =
    report.data?.directories.filter((directory) => directory.state !== 'ready')
      .length ?? 0
  if (!count && !unavailable) return null
  return (
    <div className="library-health-notice" role="status">
      <AlertCircle size={20} aria-hidden="true" />
      <div>
        <p>
          {count
            ? `${count} ${count === 1 ? 'arquivo não foi encontrado' : 'arquivos não foram encontrados'}.`
            : 'Uma pasta de mídia está indisponível.'}
        </p>
        <span>
          Os registros continuam na biblioteca. Localize a pasta ou recupere os
          arquivos.
        </span>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => useNavigation.getState().setPage('settings')}
      >
        Verificar arquivos
      </Button>
    </div>
  )
}

export function LibraryFolders({
  onSettingsChange,
}: {
  onSettingsChange: (value: Settings) => void
}) {
  const report = useLibraryLocations()
  const client = useQueryClient()
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [limit, setLimit] = useState(10)
  const [confirmRemoval, setConfirmRemoval] = useState<string | null>(null)
  const run = async (
    key: string,
    action: () => Promise<LibraryLocations | unknown>,
  ) => {
    setBusy(key)
    setMessage('')
    setError('')
    try {
      const result = await action()
      const [next, settings] = await Promise.all([
        result &&
        typeof result === 'object' &&
        'directories' in result &&
        'missing' in result
          ? Promise.resolve(result as LibraryLocations)
          : window.orbe.scanLibraryLocations(),
        window.orbe.getSettings(),
      ])
      client.setQueryData(['library-locations'], next)
      client.setQueryData(['settings'], settings)
      onSettingsChange(settings)
      await Promise.all([
        client.invalidateQueries({ queryKey: ['library'] }),
        client.invalidateQueries({ queryKey: ['local-playlists'] }),
        client.invalidateQueries({ queryKey: ['downloads'] }),
        client.invalidateQueries({ queryKey: ['player-artwork'] }),
      ])
      setMessage(
        key.startsWith('download:')
          ? 'Download adicionado à fila. O item original será recuperado quando terminar.'
          : next.relinked
            ? `${next.relinked} ${next.relinked === 1 ? 'arquivo localizado' : 'arquivos localizados'}. Favoritos e playlists foram mantidos.`
            : `${next.imported} novos arquivos importados. Verificação concluída.`,
      )
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível verificar as pastas. Tente novamente.',
      )
    } finally {
      setBusy('')
    }
  }
  return (
    <section
      id="library-folders"
      className="premium-card library-folders rounded-3xl border border-white/8 p-7"
    >
      <div className="folder-section-heading">
        <div>
          <h2 className="text-lg font-bold">Pastas de mídia</h2>
          <p>
            Escolha onde o Orbe busca músicas e vídeos, incluindo subpastas. A
            verificação acontece ao abrir e a cada 45 segundos.
          </p>
        </div>
        <FolderOpen size={23} aria-hidden="true" />
      </div>
      <div className="folder-actions">
        <Button
          disabled={!!busy}
          onClick={() =>
            void run('add', () => window.orbe.addLibraryDirectory())
          }
        >
          <FolderPlus size={17} /> Adicionar pasta
        </Button>
        <Button
          variant="secondary"
          disabled={!!busy || report.data?.scanning}
          onClick={() =>
            void run('scan', () => window.orbe.scanLibraryLocations())
          }
        >
          <RefreshCw size={16} /> Verificar agora
        </Button>
      </div>
      {report.isPending && (
        <p role="status" className="folder-status">
          <LoaderCircle className="animate-spin" size={16} /> Carregando
          pastas...
        </p>
      )}
      {report.isError && (
        <div role="alert" className="folder-error">
          <p>Não foi possível carregar as pastas.</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void report.refetch()}
          >
            Tentar novamente
          </Button>
        </div>
      )}
      <ul className="folder-list">
        {report.data?.directories.map((directory) => (
          <li key={directory.path}>
            <div>
              <p className="folder-path">{directory.path}</p>
              <span>
                {directory.isDownloadDirectory ? 'Pasta de downloads · ' : ''}
                {directory.state === 'ready'
                  ? 'Disponível'
                  : directory.state === 'missing'
                    ? 'Pasta não encontrada ou desconectada'
                    : 'Não foi possível acessar a pasta'}
              </span>
            </div>
            <div className="folder-row-actions">
              <Button
                variant="ghost"
                size="sm"
                disabled={!!busy}
                onClick={() =>
                  void run(`locate:${directory.path}`, () =>
                    window.orbe.relocateLibraryDirectory(directory.path),
                  )
                }
              >
                <Search size={15} /> Localizar pasta
              </Button>
              {!directory.isDownloadDirectory && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!!busy}
                  onClick={() => setConfirmRemoval(directory.path)}
                >
                  Parar de buscar
                </Button>
              )}
            </div>
            {confirmRemoval === directory.path && (
              <div
                className="folder-confirm"
                role="group"
                aria-label="Parar de buscar nesta pasta"
              >
                <p>
                  Parar de buscar novos arquivos nesta pasta? Seus arquivos,
                  favoritos e playlists serão mantidos.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmRemoval(null)}
                >
                  Continuar buscando
                </Button>
                <Button
                  size="sm"
                  disabled={!!busy}
                  onClick={() => {
                    setConfirmRemoval(null)
                    void run('remove', () =>
                      window.orbe.removeLibraryDirectory(directory.path),
                    )
                  }}
                >
                  Parar de buscar nesta pasta
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {!!report.data?.missing.length && (
        <div className="missing-files">
          <h3>
            <AlertCircle size={18} /> {report.data.missing.length}{' '}
            {report.data.missing.length === 1
              ? 'arquivo precisa de atenção'
              : 'arquivos precisam de atenção'}
          </h3>
          <p>
            O arquivo pode ter sido movido, excluído ou estar em uma unidade
            desconectada. O Orbe mantém o item na biblioteca até você decidir.
          </p>
          <ul>
            {report.data.missing
              .slice(0, limit)
              .map(
                ({
                  item,
                  directory,
                  reason,
                  canDownloadAgain,
                  downloadStatus,
                }) => (
                  <li key={item.id}>
                    <h4>{item.title}</h4>
                    <p className="folder-path">{item.filePath}</p>
                    <p>
                      {reason === 'unreadable'
                        ? 'Sem acesso ao arquivo. Verifique as permissões antes de tentar recuperá-lo.'
                        : canDownloadAgain
                          ? 'Este arquivo tem um download registrado. Você pode tentar baixá-lo novamente na pasta atual.'
                          : [
                                'queued',
                                'downloading',
                                'processing',
                                'analyzing',
                              ].includes(downloadStatus ?? '')
                            ? 'Recuperação em andamento. Acompanhe o progresso em Downloads.'
                            : 'Localize o arquivo original ou a pasta para recuperar este item.'}
                    </p>
                    <div className="recovery-actions">
                      <div className="recovery-locate-actions">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={!!busy}
                          onClick={() =>
                            void run(`file:${item.id}`, () =>
                              window.orbe.locateLibraryFile(item.id),
                            )
                          }
                        >
                          <Search size={15} /> Localizar arquivo
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={!!busy}
                          onClick={() =>
                            void run(`locate:${directory}`, () =>
                              window.orbe.relocateLibraryDirectory(directory),
                            )
                          }
                        >
                          <FolderOpen size={15} /> Localizar pasta
                        </Button>
                      </div>
                      <div className="recovery-record-actions">
                        {canDownloadAgain && (
                          <Button
                            size="sm"
                            disabled={!!busy}
                            onClick={() =>
                              void run(`download:${item.id}`, () =>
                                window.orbe.redownloadLibraryFile(item.id),
                              )
                            }
                          >
                            <ArrowDownToLine size={15} /> Baixar novamente
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={!!busy}
                          onClick={() => setConfirmRemoval(item.id)}
                        >
                          <Trash2 size={14} /> Remover registro
                        </Button>
                      </div>
                    </div>
                    {confirmRemoval === item.id && (
                      <div
                        className="folder-confirm"
                        role="group"
                        aria-label={`Remover registro de ${item.title}`}
                      >
                        <p>
                          Remover este item da biblioteca e das playlists? Isso
                          não exclui nenhum arquivo do computador.
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setConfirmRemoval(null)}
                        >
                          Manter registro
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={!!busy}
                          onClick={() => {
                            setConfirmRemoval(null)
                            void run('remove-record', () =>
                              window.orbe.removeFromLibrary(item.id),
                            )
                          }}
                        >
                          Remover da biblioteca
                        </Button>
                      </div>
                    )}
                  </li>
                ),
              )}
          </ul>
          {limit < report.data.missing.length && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setLimit(limit + 20)}
            >
              Mostrar mais arquivos
            </Button>
          )}
        </div>
      )}
      {report.data?.errors.map((text) => (
        <p className="folder-error" key={text}>
          {text}
        </p>
      ))}
      {busy && (
        <p role="status" className="folder-status">
          <LoaderCircle size={16} className="animate-spin" />{' '}
          {busy.startsWith('download:')
            ? 'Preparando novo download...'
            : 'Verificando arquivos...'}
        </p>
      )}
      {message && (
        <p role="status" className="folder-status">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="folder-error">
          {error}
        </p>
      )}
      <p className="folder-footnote">
        Adicionar ou remover uma pasta da busca não move nem apaga os arquivos.
        Downloads de recuperação dependem da disponibilidade da origem.
      </p>
    </section>
  )
}
