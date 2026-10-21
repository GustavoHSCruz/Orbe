export type AppErrorCode =
  | 'INVALID_URL'
  | 'UNSUPPORTED_URL'
  | 'MEDIA_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'ANALYSIS_TIMEOUT'
  | 'DOWNLOAD_FAILED'
  | 'PERMISSION_DENIED'
  | 'DISK_FULL'
  | 'LOGIN_REQUIRED'

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
  ) {
    super(message)
  }
}

export function userFacingMediaError(error: unknown): AppError {
  if (error instanceof AppError) return error
  const details = error instanceof Error ? error.message : ''
  if (/análise excedeu o tempo limite|analysis timed out/i.test(details))
    return new AppError(
      'ANALYSIS_TIMEOUT',
      'A análise demorou demais. Tente novamente ou use o link direto do vídeo.',
    )
  if (
    /confirm you.re not a bot|sign in to confirm|youtube.*(cookies|login)/i.test(
      details,
    )
  )
    return new AppError(
      'LOGIN_REQUIRED',
      'O YouTube pediu uma verificação da sua sessão. Abra Integrações > YouTube, escolha o navegador em que você está conectado ou um arquivo cookies.txt, salve e tente novamente.',
    )
  if (
    /could not copy.*cookie|could not decrypt.*cookie|failed to decrypt.*cookie|cookie database|failed to load cookies/i.test(
      details,
    )
  )
    return new AppError(
      'LOGIN_REQUIRED',
      'Não foi possível ler a sessão do navegador. Feche o navegador e tente novamente, ou escolha um arquivo cookies.txt em Integrações > YouTube.',
    )
  if (
    /login required|requires login|log in|sign in|cookies|authentication required|private (video|post|account)|not logged in|requires authentication/i.test(
      details,
    )
  )
    return new AppError(
      'LOGIN_REQUIRED',
      'Esta publicação exige login. Em Integrações, selecione um arquivo cookies.txt da sua sessão e tente novamente.',
    )
  if (/unsupported url|unsupported site|no suitable extractor/i.test(details))
    return new AppError(
      'UNSUPPORTED_URL',
      'Esta origem não é suportada pelo engine de mídia.',
    )
  if (/spawn .*enoent|spawn .* not found/i.test(details))
    return new AppError(
      'DOWNLOAD_FAILED',
      'Ferramenta de mídia não encontrada. Reinstale o Orbe.',
    )
  if (/\[twitter\].*no video could be found in this tweet/i.test(details))
    return new AppError(
      'MEDIA_NOT_FOUND',
      'O X não forneceu um vídeo deste post para download. Confira se o vídeo abre no X. Se ele exigir login, configure seu cookies.txt em Integrações > Redes sociais e tente novamente. Mesmo com sessão, alguns posts podem continuar indisponíveis no yt-dlp.',
    )
  if (/404|not found|unavailable video|video unavailable/i.test(details))
    return new AppError(
      'MEDIA_NOT_FOUND',
      'A mídia não está disponível neste link.',
    )
  if (/enospc|no space left|disk full/i.test(details))
    return new AppError('DISK_FULL', 'Não há espaço suficiente no disco.')
  if (/eacces|eperm|permission denied|access is denied/i.test(details))
    return new AppError(
      'PERMISSION_DENIED',
      'Sem permissão para salvar o arquivo nesta pasta.',
    )
  if (/timed out|timeout|connection|network|dns/i.test(details))
    return new AppError(
      'NETWORK_ERROR',
      'Falha de rede. Verifique a conexão e tente novamente.',
    )
  return new AppError(
    'DOWNLOAD_FAILED',
    'Não foi possível concluir esta operação de mídia.',
  )
}
