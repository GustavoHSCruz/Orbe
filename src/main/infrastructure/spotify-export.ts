import { readFile } from 'node:fs/promises'
import { unzipSync, strFromU8 } from 'fflate'
import type { SpotifySourceTrack } from './spotify-public-playlist'

export type ExportPlaylist = { name: string; tracks: SpotifySourceTrack[]; itemCount: number }

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

export function parseSpotifyExportJson(raw: unknown): ExportPlaylist[] {
  const root = record(raw)
  const playlists = Array.isArray(root?.playlists) ? root.playlists : []
  return playlists.flatMap((value) => {
    const playlist = record(value)
    if (typeof playlist?.name !== 'string' || !Array.isArray(playlist.items)) return []
    const tracks = playlist.items.flatMap((entry) => {
      const item = record(entry)
      const track = record(item?.track)
      if (!track || typeof track.trackName !== 'string' ||
          typeof track.artistName !== 'string') return []
      const uri = typeof track.trackUri === 'string' ? track.trackUri : ''
      const id = /^spotify:track:([A-Za-z0-9]{22})$/.exec(uri)?.[1] ?? ''
      return [{
        spotifyId: id,
        title: track.trackName,
        artist: track.artistName,
        durationMs: null,
      } satisfies SpotifySourceTrack]
    })
    return [{ name: playlist.name, tracks, itemCount: playlist.items.length }]
  })
}

export async function readSpotifyExport(path: string): Promise<ExportPlaylist[]> {
  const buffer = await readFile(path)
  if (buffer.length > 30 * 1024 * 1024)
    throw new Error('O arquivo de exportação excede 30 MB.')
  const jsonFiles: string[] = []
  if (path.toLowerCase().endsWith('.json')) {
    jsonFiles.push(buffer.toString('utf8'))
  } else if (path.toLowerCase().endsWith('.zip')) {
    let total = 0
    const files = unzipSync(buffer, {
      filter: (file) => {
        if (!/playlist[^/\\]*\.json$/i.test(file.name)) return false
        total += file.originalSize
        if (file.originalSize > 20 * 1024 * 1024 || total > 60 * 1024 * 1024)
          throw new Error('A exportação contém dados grandes demais.')
        return true
      },
    })
    for (const bytes of Object.values(files)) jsonFiles.push(strFromU8(bytes))
  } else {
    throw new Error('Escolha o ZIP oficial ou um arquivo Playlist*.json.')
  }
  const playlists: ExportPlaylist[] = []
  for (const json of jsonFiles) {
    let data: unknown
    try { data = JSON.parse(json) } catch { continue }
    playlists.push(...parseSpotifyExportJson(data))
  }
  if (!playlists.length)
    throw new Error('Não encontrei playlists neste arquivo. Escolha a exportação de dados da conta Spotify.')
  return playlists
}
