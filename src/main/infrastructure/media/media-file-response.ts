import { createReadStream, statSync } from 'node:fs'
import { extname } from 'node:path'
import { Readable } from 'node:stream'

function contentType(filePath: string, mediaType: 'audio' | 'video'): string {
  const extension = extname(filePath).toLowerCase()
  const known: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.mp4': mediaType === 'audio' ? 'audio/mp4' : 'video/mp4',
    '.webm': mediaType === 'audio' ? 'audio/webm' : 'video/webm',
    '.ogg': mediaType === 'audio' ? 'audio/ogg' : 'video/ogg',
    '.opus': 'audio/ogg',
    '.flac': 'audio/flac',
    '.wav': 'audio/wav',
    '.aac': 'audio/aac',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
  }
  return known[extension] ?? 'application/octet-stream'
}

export function mediaFileResponse(
  filePath: string,
  mediaType: 'audio' | 'video',
  rangeHeader: string | null,
): Response {
  let size: number
  try {
    const stats = statSync(filePath)
    if (!stats.isFile()) return new Response('Not found', { status: 404 })
    size = stats.size
  } catch {
    return new Response('Not found', { status: 404 })
  }

  const headers = new Headers({
    'Accept-Ranges': 'bytes',
    'Content-Type': contentType(filePath, mediaType),
  })
  if (size === 0) {
    headers.set('Content-Length', '0')
    if (rangeHeader != null) {
      headers.set('Content-Range', 'bytes */0')
      return new Response(null, { status: 416, headers })
    }
    return new Response(null, { status: 200, headers })
  }
  let start = 0
  let end = size - 1
  let status = 200

  if (rangeHeader != null) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim())
    const first = match?.[1] ?? ''
    const last = match?.[2] ?? ''
    if (!match || (!first && !last)) {
      headers.set('Content-Range', `bytes */${size}`)
      return new Response(null, { status: 416, headers })
    }
    if (!first) {
      const suffix = Number(last)
      start = Math.max(0, size - suffix)
    } else {
      start = Number(first)
      if (last) end = Math.min(Number(last), size - 1)
    }
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start >= size ||
      start > end
    ) {
      headers.set('Content-Range', `bytes */${size}`)
      return new Response(null, { status: 416, headers })
    }
    status = 206
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`)
  }

  headers.set('Content-Length', String(Math.max(0, end - start + 1)))
  const stream = Readable.toWeb(createReadStream(filePath, { start, end }))
  return new Response(stream as ReadableStream, { status, headers })
}
