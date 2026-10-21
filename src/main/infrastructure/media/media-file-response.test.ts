import { afterAll, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mediaFileResponse } from './media-file-response'

const directory = mkdtempSync(join(tmpdir(), 'orbe-media-range-'))
const filePath = join(directory, 'sample.mp3')
writeFileSync(filePath, '0123456789')
afterAll(() => rmSync(directory, { recursive: true, force: true }))

describe('media file response', () => {
  it('serves the requested bytes so playback can seek', async () => {
    const response = mediaFileResponse(filePath, 'audio', 'bytes=4-7')
    expect(response.status).toBe(206)
    expect(response.headers.get('content-range')).toBe('bytes 4-7/10')
    expect(response.headers.get('content-length')).toBe('4')
    expect(response.headers.get('content-type')).toBe('audio/mpeg')
    expect(await response.text()).toBe('4567')
  })

  it('supports open and suffix ranges', async () => {
    expect(await mediaFileResponse(filePath, 'audio', 'bytes=7-').text()).toBe(
      '789',
    )
    expect(await mediaFileResponse(filePath, 'audio', 'bytes=-3').text()).toBe(
      '789',
    )
  })

  it('rejects ranges outside the file', () => {
    const response = mediaFileResponse(filePath, 'audio', 'bytes=20-')
    expect(response.status).toBe(416)
    expect(response.headers.get('content-range')).toBe('bytes */10')
  })
})
