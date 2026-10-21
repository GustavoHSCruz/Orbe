import type { MediaFormat } from '../../shared/contracts/media'

export function formatSize(format: MediaFormat): string {
  return format.fileSize == null
    ? 'Tamanho não informado'
    : `${(format.fileSize / 1048576).toFixed(1)} MB`
}

export function formatDescription(format: MediaFormat): string {
  const extension = format.extension.toLowerCase()
  if (format.mediaType === 'video') {
    const support =
      extension === 'mp4'
        ? 'Abre em quase qualquer celular, TV ou computador.'
        : extension === 'webm'
          ? 'Boa opção para navegadores; alguns aparelhos não aceitam.'
          : 'Mantém o formato oferecido pela fonte.'
    const quality = /\d+p/.test(format.quality)
      ? `${format.quality} de definição. Resoluções maiores mostram mais detalhes e geralmente ocupam mais espaço.`
      : format.quality === 'HD'
        ? 'Versão em alta definição, quando disponível.'
        : format.quality === 'SD'
          ? 'Versão mais leve, com menos detalhes.'
          : 'A fonte não informou a resolução.'
    return `${support} ${quality}`
  }
  if (extension === 'mp3')
    return 'Mais compatível com aparelhos e aplicativos. O Orbe converte o áudio após baixar.'
  if (extension === 'm4a')
    return 'Boa qualidade com arquivo geralmente compacto; funciona bem em celulares.'
  if (extension === 'flac')
    return 'Áudio sem perda de qualidade; o arquivo costuma ser maior.'
  return 'Mantém o formato de áudio oferecido pela fonte.'
}

function score(format: MediaFormat): number {
  const resolution = Number.parseInt(format.quality, 10)
  const quality = Number.isFinite(resolution)
    ? resolution
    : format.quality === 'HD'
      ? 720
      : format.quality === 'SD'
        ? 480
        : 0
  return quality * 1000 + (format.bitrateKbps ?? 0) + (format.hasAudio ? 1 : 0)
}

export function simpleFormats(
  formats: MediaFormat[],
  kind: 'video' | 'audio',
): MediaFormat[] {
  const sorted = formats
    .filter((item) => item.mediaType === kind)
    .sort((a, b) => score(b) - score(a))
  if (kind === 'video') {
    const mp4 = sorted.filter((item) => item.extension.toLowerCase() === 'mp4')
    const other = sorted.filter(
      (item) => item.extension.toLowerCase() !== 'mp4',
    )
    const chosen = new Set<string>()
    return [...mp4, ...other]
      .filter((item) => {
        const key = `${item.extension}:${item.quality}`
        if (chosen.has(key)) return false
        chosen.add(key)
        return true
      })
      .slice(0, 4)
  }
  const priority = ['mp3', 'm4a', 'flac', 'opus', 'ogg', 'aac', 'wav']
  const chosen = new Set<string>()
  return sorted
    .sort(
      (a, b) =>
        (priority.indexOf(a.extension.toLowerCase()) < 0
          ? 99
          : priority.indexOf(a.extension.toLowerCase())) -
        (priority.indexOf(b.extension.toLowerCase()) < 0
          ? 99
          : priority.indexOf(b.extension.toLowerCase())),
    )
    .filter((item) => {
      const key = item.extension.toLowerCase()
      if (chosen.has(key)) return false
      chosen.add(key)
      return true
    })
    .slice(0, 4)
}
