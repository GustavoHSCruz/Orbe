import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { zipSync, strToU8 } from 'fflate'
import { expect, it } from 'vitest'
import { parseSpotifyExportJson, readSpotifyExport } from './spotify-export'

const playlist = {
  playlists: [{ name: 'Rock', items: [
    { track: { trackName: 'ZOMBIFIED', artistName: 'Falling In Reverse', albumName: 'Coming Home', trackUri: 'spotify:track:2ib8fuTavdc48X6MjhE4Ft' } },
    { track: { trackName: 'ZOMBIFIED', artistName: 'Falling In Reverse', albumName: 'Coming Home', trackUri: 'spotify:track:2ib8fuTavdc48X6MjhE4Ft' } },
  ] }],
}

it('reads official playlist items and keeps repeated positions', () => {
  const parsed = parseSpotifyExportJson(playlist)
  expect(parsed).toHaveLength(1)
  expect(parsed[0]?.itemCount).toBe(2)
  expect(parsed[0]?.tracks.map((item) => item.title)).toEqual(['ZOMBIFIED', 'ZOMBIFIED'])
})

it('finds playlist JSON inside a Spotify ZIP without reading unrelated personal data', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'orbe-spotify-export-'))
  const path = join(directory, 'spotify.zip')
  writeFileSync(path, zipSync({
    'AccountData/Playlist1.json': strToU8(JSON.stringify(playlist)),
    'AccountData/Userdata.json': strToU8(JSON.stringify({ email: 'private@example.com' })),
  }))
  const parsed = await readSpotifyExport(path)
  expect(parsed[0]?.name).toBe('Rock')
  expect(parsed[0]?.tracks).toHaveLength(2)
})
