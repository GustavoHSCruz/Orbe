import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AudioLines, Check, LoaderCircle, Search } from 'lucide-react'
import type { LyricsResult } from '../../shared/contracts/lyrics'
import { Button } from '@/components/ui/button'

export function LyricsSearch({
  title: initialTitle,
  artist: initialArtist,
  duration,
  onSelect,
  onReset,
}: {
  title: string
  artist: string
  duration: number
  onSelect: (result: NonNullable<LyricsResult>) => void
  onReset: () => void
}) {
  const [title, setTitle] = useState(initialTitle)
  const [artist, setArtist] = useState(initialArtist)
  const search = useMutation({
    mutationFn: (input: { title: string; artist: string }) =>
      window.orbe.searchLyricsCandidates({
        ...input,
        durationMs: duration > 0 ? Math.round(duration * 1000) : null,
      }),
  })
  return (
    <section className="lyrics-search-panel" aria-label="Encontrar letra">
      <h3>Encontre a versão certa</h3>
      <p>Busque pelo nome da música. O artista é opcional.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (title.trim())
            search.mutate({ title: title.trim(), artist: artist.trim() })
        }}
      >
        <input
          aria-label="Nome da música para buscar letra"
          placeholder="Nome da música"
          required
          maxLength={200}
          value={title}
          disabled={search.isPending}
          onChange={(event) => {
            setTitle(event.target.value)
            search.reset()
          }}
        />
        <input
          aria-label="Artista para buscar letra"
          placeholder="Artista (opcional)"
          maxLength={200}
          value={artist}
          disabled={search.isPending}
          onChange={(event) => {
            setArtist(event.target.value)
            search.reset()
          }}
        />
        <Button type="submit" size="sm" disabled={search.isPending}>
          {search.isPending ? (
            <LoaderCircle size={15} className="animate-spin" />
          ) : (
            <Search size={15} />
          )}
          {search.isPending ? 'Buscando…' : 'Pesquisar'}
        </Button>
      </form>
      {search.isError && (
        <p role="alert" className="lyrics-search-error">
          {search.error.message.replace(
            /^Error invoking remote method '[^']+': Error: /,
            '',
          )}
        </p>
      )}
      {search.isSuccess && !search.data.length && (
        <p role="status">
          Nenhuma letra encontrada. Tente apenas o título, sem “vídeo oficial”
          ou nome do canal.
        </p>
      )}
      {!!search.data?.length && (
        <div
          className="lyrics-search-results"
          aria-label="Resultados da busca de letras"
        >
          {search.data.map((result, index) => (
            <button
              type="button"
              key={`${result.trackName}-${result.artistName}-${index}`}
              onClick={() => onSelect(result)}
            >
              <AudioLines size={20} />
              <span>
                <strong>{result.trackName}</strong>
                <small>
                  {result.artistName} ·{' '}
                  {result.duration
                    ? `${Math.floor(result.duration / 60)}:${String(Math.floor(result.duration % 60)).padStart(2, '0')} · `
                    : ''}
                  {result.syncedLyrics ? 'Sincronizada' : 'Somente texto'}
                </small>
              </span>
              <Check size={16} />
            </button>
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="lyrics-auto-reset"
        onClick={onReset}
      >
        Usar busca automática
      </Button>
    </section>
  )
}
