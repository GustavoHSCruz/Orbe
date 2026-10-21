import { useRef, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  FileArchive,
  Library,
  LoaderCircle,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { SiSpotify, SiYoutube } from 'react-icons/si'
import { Button } from '@/components/ui/button'
import { useNavigation } from '../stores/navigation'
import type { PlaylistImport } from '../../shared/contracts/playlist-import'

type PlaylistImportItem = PlaylistImport['items'][number]
const activeDownloads = ['queued', 'analyzing', 'downloading', 'processing']

function needsAttention(item: PlaylistImportItem) {
  return (
    ['review', 'error'].includes(item.matchStatus) ||
    !!item.errorMessage ||
    ['failed', 'cancelled'].includes(item.downloadStatus ?? '')
  )
}

function trackStatus(item: PlaylistImportItem) {
  if (item.downloadStatus === 'completed') return 'Salva na sua biblioteca'
  if (item.downloadStatus === 'failed')
    return 'Não foi possível baixar. Tente novamente.'
  if (item.downloadStatus === 'cancelled') return 'Download cancelado'
  if (item.downloadStatus === 'analyzing') return 'Preparando download...'
  if (item.downloadStatus === 'downloading') return 'Baixando áudio...'
  if (item.downloadStatus === 'processing') return 'Preparando áudio...'
  if (item.downloadStatus === 'queued') return 'Na fila de downloads'
  if (item.matchStatus === 'matched') return 'Versão do YouTube selecionada'
  if (item.matchStatus === 'skipped')
    return 'Fora do download · você pode incluir depois'
  if (item.matchStatus === 'searching') return 'Procurando no YouTube...'
  if (item.matchStatus === 'review')
    return 'Escolha uma versão para esta música'
  if (item.matchStatus === 'error')
    return 'A busca falhou. Tente outra busca ou cole um link.'
  return 'Ainda não procurada no YouTube'
}

export function PlaylistImportPanel() {
  const queryClient = useQueryClient()
  const setPage = useNavigation((state) => state.setPage)
  const imports = useQuery({
    queryKey: ['playlist-imports'],
    queryFn: () => window.orbe.listPlaylistImports(),
    refetchInterval: 2000,
  })
  const [url, setUrl] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<'all' | 'review'>('all')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [manualValues, setManualValues] = useState<Record<string, string>>({})
  const listHeading = useRef<HTMLHeadingElement>(null)
  const selected =
    imports.data?.find((entry) => entry.id === selectedId) ?? imports.data?.[0]
  const items = selected?.items ?? []
  const loaded = items.filter((item) => item.title && item.artist).length
  const matched = items.filter((item) => item.matchStatus === 'matched').length
  const pending = items.filter((item) =>
    ['pending', 'error'].includes(item.matchStatus),
  ).length
  const unresolved = items.filter((item) =>
    ['pending', 'searching', 'review', 'error'].includes(item.matchStatus),
  ).length
  const attention = items.filter(needsAttention).length
  const downloaded = items.filter(
    (item) => item.downloadStatus === 'completed',
  ).length
  const queued = items.some((item) =>
    activeDownloads.includes(item.downloadStatus ?? ''),
  )
  const remaining = items.filter(
    (item) =>
      item.matchStatus === 'matched' &&
      item.downloadStatus !== 'completed' &&
      !activeDownloads.includes(item.downloadStatus ?? ''),
  ).length
  const finished = matched > 0 && downloaded === matched && unresolved === 0
  const downloading = !!selected?.downloading || queued
  const showForm = !selected || adding
  const step =
    showForm || !selected?.complete
      ? 1
      : unresolved || editingItemId || !matched
        ? 2
        : 3
  const visible =
    filter === 'all'
      ? items
      : items.filter(
          (item) => needsAttention(item) || item.id === editingItemId,
        )
  const locked = !!busy || !!selected?.matching || downloading

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['playlist-imports'] })
    await queryClient.invalidateQueries({ queryKey: ['local-playlists'] })
    await queryClient.invalidateQueries({ queryKey: ['library'] })
  }
  const run = async (label: string, action: () => Promise<unknown>) => {
    setBusy(label)
    setError('')
    setNotice('')
    try {
      await action()
      await refresh()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível concluir. Tente novamente.',
      )
    } finally {
      setBusy('')
    }
  }
  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void run('importando', async () => {
      const result = await window.orbe.createPlaylistImport(url.trim())
      setSelectedId(result[0]?.id ?? null)
      setAdding(false)
      setEditingItemId(null)
      setDeleteConfirm(false)
      setFilter('all')
      setUrl('')
      setNotice(
        'Playlist adicionada. Confira a lista e continue para o YouTube.',
      )
    })
  }
  const choose = (item: PlaylistImportItem, link: string | null) => {
    void run(`escolhendo-${item.id}`, async () => {
      await window.orbe.choosePlaylistMatch(item.id, link)
      setEditingItemId(null)
      setNotice(
        link
          ? 'Vídeo selecionado para esta música.'
          : 'Música retirada deste download. Você pode incluí-la depois.',
      )
    })
  }
  const search = (item: PlaylistImportItem) => {
    const query =
      manualValues[item.id]?.trim() ||
      `${item.artist ?? ''} ${item.title ?? ''}`
    void run(`buscando-${item.id}`, () =>
      window.orbe.searchPlaylistItem(item.id, query),
    )
  }
  const review = () => {
    setFilter('review')
    listHeading.current?.focus()
    listHeading.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }

  return (
    <section
      aria-label="Importar playlist do Spotify"
      className="playlist-transfer"
    >
      <ol className="transfer-steps" aria-label="Etapas da importação">
        {[
          {
            title: 'Adicionar playlist',
            detail: 'Lista do Spotify',
            Icon: SiSpotify,
            brand: 'spotify',
          },
          {
            title: 'Conferir versões',
            detail: 'Áudios do YouTube',
            Icon: SiYoutube,
            brand: 'youtube',
          },
          {
            title: 'Baixar e ouvir',
            detail: 'Sua biblioteca no Orbe',
            Icon: Library,
            brand: 'local',
          },
        ].map(({ title, detail, Icon, brand }, index) => (
          <li
            key={title}
            data-state={
              !showForm && (step > index + 1 || finished)
                ? 'done'
                : step === index + 1
                  ? 'current'
                  : 'next'
            }
            aria-current={step === index + 1 ? 'step' : undefined}
          >
            <span className={`transfer-platform transfer-platform-${brand}`}>
              <Icon size={23} aria-hidden="true" />
            </span>
            <span>
              <strong>
                {index + 1}. {title}
              </strong>
              <small>{detail}</small>
            </span>
            {!showForm && (step > index + 1 || finished) ? (
              <Check size={17} aria-label="Concluída" />
            ) : null}
          </li>
        ))}
      </ol>

      {showForm && (
        <div className="transfer-source">
          <h2>Qual playlist você quer trazer?</h2>
          <p className="transfer-muted">
            Use o link de uma playlist pública. Você não precisa conectar sua
            conta Spotify.
          </p>
          <form onSubmit={create} className="transfer-form">
            <label htmlFor="spotify-playlist-link">
              Link da playlist do Spotify
            </label>
            <div className="transfer-form-row">
              <div className="transfer-input-wrap">
                <SiSpotify
                  size={20}
                  className="transfer-spotify"
                  aria-hidden="true"
                />
                <input
                  id="spotify-playlist-link"
                  type="url"
                  required
                  value={url}
                  disabled={!!busy}
                  aria-describedby="spotify-link-help"
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://open.spotify.com/playlist/..."
                />
              </div>
              <Button type="submit" disabled={!!busy || !url.trim()}>
                {busy === 'importando' ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                {busy === 'importando'
                  ? 'Lendo playlist...'
                  : 'Adicionar playlist'}
              </Button>
              {selected && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!!busy}
                  onClick={() => setAdding(false)}
                >
                  Cancelar
                </Button>
              )}
            </div>
            <p id="spotify-link-help" className="transfer-muted">
              No Spotify, abra a playlist e escolha Compartilhar → Copiar link
              da playlist.
            </p>
          </form>
          <p className="transfer-source-note">
            <Library size={16} aria-hidden="true" /> Primeiro você confere as
            músicas. O download só começa quando você escolher baixar.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="transfer-message transfer-error">
          <CircleAlert size={18} />
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="transfer-message">
          {notice}
        </p>
      )}
      {imports.isPending && (
        <p role="status" className="transfer-message">
          Carregando suas importações...
        </p>
      )}
      {imports.isError && (
        <div role="alert" className="transfer-message transfer-error">
          Não foi possível carregar suas importações.{' '}
          <Button variant="secondary" onClick={() => void imports.refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {selected && !showForm && (
        <div className="transfer-workspace">
          <div className="transfer-playlist-heading">
            <div className="min-w-0">
              {imports.data && imports.data.length > 1 ? (
                <>
                  <label htmlFor="transfer-playlist" className="transfer-muted">
                    Continuar importação
                  </label>
                  <select
                    id="transfer-playlist"
                    value={selected.id}
                    disabled={!!busy}
                    onChange={(event) => {
                      setSelectedId(event.target.value)
                      setEditingItemId(null)
                      setDeleteConfirm(false)
                      setFilter('all')
                      setError('')
                      setNotice('')
                    }}
                  >
                    {imports.data.map((entry) => (
                      <option value={entry.id} key={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <h2 className="break-words">{selected.name}</h2>
              )}
              <p className="transfer-muted">
                {loaded} de {selected.expectedCount ?? '?'} músicas
                identificadas no Spotify
              </p>
            </div>
            <Button
              variant="secondary"
              disabled={!!busy}
              onClick={() => {
                setAdding(true)
                setNotice('')
                setError('')
              }}
            >
              <Plus size={16} /> Outra playlist
            </Button>
          </div>

          <div
            className="transfer-next"
            aria-busy={!!selected.matching || downloading}
          >
            <div className="min-w-0">
              <h3>
                {!selected.complete
                  ? 'Vamos completar a lista de músicas'
                  : selected.matching
                    ? 'Procurando versões no YouTube'
                    : finished
                      ? 'Sua playlist está pronta para ouvir'
                      : downloading
                        ? 'Levando as músicas para sua biblioteca'
                        : pending > 0
                          ? 'Agora, encontre as músicas no YouTube'
                          : unresolved > 0
                            ? 'Algumas músicas precisam da sua escolha'
                            : editingItemId
                              ? 'Conclua a escolha do vídeo abaixo'
                              : matched > 0
                                ? 'Tudo pronto para baixar'
                                : 'Nenhuma música selecionada para baixar'}
              </h3>
              <p className="transfer-muted">
                {!selected.complete
                  ? 'A lista ainda está incompleta. Você poderá continuar quando todas as músicas forem identificadas.'
                  : selected.matching
                    ? `${items.length - unresolved} de ${items.length} músicas resolvidas. Você pode sair desta tela e voltar depois.`
                    : finished
                      ? `${downloaded} ${downloaded === 1 ? 'música salva' : 'músicas salvas'} em “${selected.name}”, em Suas playlists.`
                      : downloading
                        ? `${downloaded} de ${matched} músicas salvas. Acompanhe o andamento em Downloads.`
                        : pending > 0
                          ? 'O Orbe busca uma versão para cada música. Depois você pode conferir e trocar os vídeos antes de baixar.'
                          : unresolved > 0
                            ? 'Escolha um vídeo ou pule cada música que falta. As demais versões já estão selecionadas.'
                            : editingItemId
                              ? 'Selecione um vídeo, pule a música ou cancele a alteração para continuar.'
                              : matched > 0
                                ? `${matched} ${matched === 1 ? 'música selecionada' : 'músicas selecionadas'}. Os áudios serão salvos em uma playlist chamada “${selected.name}” no Orbe.`
                                : 'As músicas foram puladas. Use “Escolher vídeo” na lista para incluir as que quiser.'}
              </p>
            </div>
            {selected.complete &&
              (selected.matching ? (
                <span className="transfer-working" role="status">
                  <LoaderCircle size={18} className="animate-spin" />{' '}
                  Buscando...
                </span>
              ) : finished ? (
                <Button onClick={() => setPage('playlists')}>
                  <Library size={17} /> Ir para Suas playlists
                </Button>
              ) : downloading ? (
                <Button
                  variant="secondary"
                  onClick={() => setPage('downloads')}
                >
                  <ArrowDownToLine size={17} /> Ver downloads
                </Button>
              ) : pending > 0 ? (
                <Button
                  disabled={!!busy}
                  onClick={() =>
                    void run('buscando', () =>
                      window.orbe.startPlaylistMatching(selected.id),
                    )
                  }
                >
                  <SiYoutube size={18} />
                  {busy === 'buscando'
                    ? 'Iniciando busca...'
                    : 'Buscar versões no YouTube'}
                </Button>
              ) : unresolved > 0 ? (
                <Button onClick={review}>
                  Conferir {unresolved}{' '}
                  {unresolved === 1 ? 'música' : 'músicas'}{' '}
                  <ArrowRight size={17} />
                </Button>
              ) : matched > 0 ? (
                <Button
                  disabled={!!busy || !!editingItemId || !remaining}
                  onClick={() =>
                    void run('baixando', () =>
                      window.orbe.startPlaylistDownloads(selected.id),
                    )
                  }
                >
                  <ArrowDownToLine size={17} />
                  {busy === 'baixando'
                    ? 'Preparando downloads...'
                    : downloaded > 0 ||
                        items.some(
                          (item) => item.errorMessage || item.downloadId,
                        )
                      ? `Baixar ${remaining} restantes`
                      : `Baixar ${matched} ${matched === 1 ? 'música' : 'músicas'}`}
                </Button>
              ) : null)}
          </div>

          {!selected.complete && (
            <details className="transfer-help">
              <summary>
                A lista parou de carregar?{' '}
                <ChevronDown size={16} aria-hidden="true" />
              </summary>
              <p className="transfer-muted">
                Tente ler o link novamente. Se faltarem músicas, você também
                pode carregar o arquivo de dados da sua conta Spotify que contém
                esta playlist (ZIP ou JSON).
              </p>
              <div className="transfer-actions">
                <Button
                  variant="secondary"
                  disabled={!!busy}
                  onClick={() =>
                    void run('repetindo', () =>
                      window.orbe.retryPlaylistSource(selected.id),
                    )
                  }
                >
                  <RotateCcw size={16} /> Ler playlist novamente
                </Button>
                <Button
                  variant="ghost"
                  disabled={!!busy}
                  onClick={() =>
                    void run('exportando', async () => {
                      if (await window.orbe.importSpotifyExport(selected.id))
                        setNotice(
                          'Lista carregada. Agora você pode buscar as versões no YouTube.',
                        )
                    })
                  }
                >
                  <FileArchive size={16} /> Carregar arquivo do Spotify
                </Button>
              </div>
            </details>
          )}

          {!!items.length && (
            <div className="playlist-transfer-tracks">
              <div className="transfer-list-heading">
                <h3 ref={listHeading} tabIndex={-1}>
                  Músicas da playlist
                </h3>
                <div className="transfer-filters" aria-label="Filtrar músicas">
                  <button
                    type="button"
                    aria-pressed={filter === 'all'}
                    onClick={() => setFilter('all')}
                  >
                    Todas ({items.length})
                  </button>
                  <button
                    type="button"
                    aria-pressed={filter === 'review'}
                    onClick={() => setFilter('review')}
                  >
                    Precisam de atenção ({attention})
                  </button>
                </div>
              </div>
              {!!matched && (
                <p className="transfer-muted transfer-match-count">
                  {matched}{' '}
                  {matched === 1
                    ? 'versão selecionada'
                    : 'versões selecionadas'}{' '}
                  no YouTube · {downloaded}{' '}
                  {downloaded === 1 ? 'música baixada' : 'músicas baixadas'}
                </p>
              )}
              {!visible.length && (
                <p className="transfer-message">
                  Nenhuma música precisa de atenção. Veja a lista completa em
                  “Todas”.
                </p>
              )}
              <ol className="playlist-transfer-track-list orbe-scroll">
                {visible.map((item) => {
                  const editing =
                    editingItemId === item.id ||
                    ['review', 'error'].includes(item.matchStatus)
                  const chosen = item.candidates.find(
                    (candidate) => candidate.url === item.youtubeUrl,
                  )
                  const manualLink = /^https:\/\//i.test(
                    manualValues[item.id]?.trim() ?? '',
                  )
                  return (
                    <li key={item.id} className="playlist-transfer-track">
                      <span className="playlist-transfer-track-number">
                        {item.position + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="playlist-transfer-track-heading">
                          <div className="min-w-0">
                            <h4>{item.title ?? 'Identificando música...'}</h4>
                            <p className="transfer-muted">
                              {item.artist ?? 'Lendo dados do Spotify'}
                            </p>
                          </div>
                          {selected.complete &&
                            !item.downloadId &&
                            ['matched', 'skipped'].includes(item.matchStatus) &&
                            !editing && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={locked}
                                onClick={() => setEditingItemId(item.id)}
                              >
                                {item.matchStatus === 'matched'
                                  ? 'Trocar vídeo'
                                  : 'Escolher vídeo'}
                              </Button>
                            )}
                        </div>
                        <p
                          className={`playlist-transfer-track-status ${needsAttention(item) ? 'transfer-warning' : ''}`}
                        >
                          {trackStatus(item)}
                        </p>
                        {item.errorMessage && (
                          <p className="transfer-error text-sm">
                            {item.errorMessage}
                          </p>
                        )}
                        {item.matchStatus === 'matched' &&
                          item.youtubeUrl &&
                          !editing && (
                            <p className="transfer-chosen">
                              <SiYoutube
                                size={17}
                                className="transfer-youtube"
                                aria-hidden="true"
                              />
                              <span>{chosen?.title ?? item.youtubeUrl}</span>
                            </p>
                          )}
                        {editing && selected.complete && !item.downloadId && (
                          <div className="transfer-review">
                            {!item.candidates.length && (
                              <p className="transfer-muted">
                                Nenhuma versão encontrada. Busque pelo nome e
                                artista ou cole o link de um vídeo do YouTube.
                              </p>
                            )}
                            {item.candidates.map((candidate) => (
                              <div
                                key={candidate.id}
                                className="transfer-candidate"
                              >
                                <SiYoutube
                                  size={20}
                                  className="transfer-youtube"
                                  aria-hidden="true"
                                />
                                <div className="min-w-0 flex-1">
                                  <p>{candidate.title}</p>
                                  <p className="transfer-muted">
                                    {candidate.channel ?? 'YouTube'}
                                    {candidate.durationMs
                                      ? ` · ${Math.floor(candidate.durationMs / 60000)}:${String(Math.floor(candidate.durationMs / 1000) % 60).padStart(2, '0')}`
                                      : ''}
                                  </p>
                                </div>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={locked}
                                  onClick={() => choose(item, candidate.url)}
                                >
                                  <Check size={15} /> Usar este vídeo
                                </Button>
                              </div>
                            ))}
                            <form
                              className="transfer-manual"
                              onSubmit={(event) => {
                                event.preventDefault()
                                if (manualLink)
                                  choose(
                                    item,
                                    manualValues[item.id]?.trim() ?? '',
                                  )
                                else search(item)
                              }}
                            >
                              <label htmlFor={`manual-${item.id}`}>
                                Outra versão de {item.title ?? 'esta música'}
                              </label>
                              <div className="transfer-form-row">
                                <input
                                  id={`manual-${item.id}`}
                                  value={manualValues[item.id] ?? ''}
                                  onChange={(event) =>
                                    setManualValues((values) => ({
                                      ...values,
                                      [item.id]: event.target.value,
                                    }))
                                  }
                                  placeholder="Nome e artista, ou link do YouTube"
                                />
                                <Button
                                  type="submit"
                                  variant="secondary"
                                  disabled={locked}
                                >
                                  {busy === `buscando-${item.id}` ? (
                                    <LoaderCircle
                                      size={16}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Search size={16} />
                                  )}
                                  {manualLink
                                    ? 'Usar este link'
                                    : 'Buscar no YouTube'}
                                </Button>
                              </div>
                            </form>
                            <div className="transfer-actions">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={locked}
                                onClick={() => choose(item, null)}
                              >
                                Pular esta música
                              </Button>
                              {editingItemId === item.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={!!busy}
                                  onClick={() => setEditingItemId(null)}
                                >
                                  <X size={14} /> Cancelar alteração
                                </Button>
                              )}
                              <span className="transfer-muted">
                                Músicas puladas não serão baixadas.
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
          <div className="transfer-footer">
            <span className="transfer-muted">
              Seu progresso fica salvo para continuar depois.
            </span>
            {!deleteConfirm ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={locked}
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 size={15} /> Remover importação
              </Button>
            ) : (
              <div className="transfer-delete">
                <p>
                  Remover “{selected.name}” desta tela? As músicas já baixadas
                  continuam na biblioteca.
                </p>
                <div className="transfer-actions">
                  <Button
                    variant="secondary"
                    disabled={locked}
                    onClick={() =>
                      void run('excluindo', async () => {
                        await window.orbe.deletePlaylistImport(selected.id)
                        setSelectedId(null)
                        setDeleteConfirm(false)
                      })
                    }
                  >
                    Remover importação
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={!!busy}
                    onClick={() => setDeleteConfirm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
