import {
  SiFacebook,
  SiInstagram,
  SiSoundcloud,
  SiX,
  SiYoutube,
} from 'react-icons/si'
import { Globe2 } from 'lucide-react'
import type { IconType } from 'react-icons'
import type { MediaAnalysis } from '../../shared/contracts/media'
import {
  mediaSourceForHost,
  mediaSourceNames,
} from '../../shared/contracts/media-sources'

type Source = Exclude<MediaAnalysis['provider'], 'local'>

const sourceIcons: Record<Source, IconType | typeof Globe2> = {
  youtube: SiYoutube,
  soundcloud: SiSoundcloud,
  instagram: SiInstagram,
  facebook: SiFacebook,
  twitter: SiX,
  generic: Globe2,
}

const listedSources: Source[] = [
  'youtube',
  'twitter',
  'instagram',
  'facebook',
  'soundcloud',
  'generic',
]

function recognize(input: string): { source: Source; host: string } | null {
  try {
    const url = new URL(input)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    const source = mediaSourceForHost(url.hostname)
    return {
      source: source && source !== 'local' ? source : 'generic',
      host: url.hostname,
    }
  } catch {
    return null
  }
}

export function SourceInputMark({ url }: { url: string }) {
  const source = recognize(url.trim())?.source
  const Icon = source ? sourceIcons[source] : Globe2
  return (
    <span
      className="source-input-mark"
      data-active={source ? 'true' : 'false'}
      aria-hidden="true"
    >
      <Icon size={19} />
    </span>
  )
}

export function SourceRecognition({
  url,
  compact = false,
}: {
  url: string
  compact?: boolean
}) {
  const detected = recognize(url.trim())
  if (!detected) {
    return (
      <div className="source-platforms" aria-label="Fontes para analisar">
        <span className="source-platforms-label">Fontes para analisar</span>
        <div className="source-platforms-list">
          {listedSources.map((source) => {
            const Icon = sourceIcons[source]
            return (
              <span className="source-platform" key={source}>
                <Icon aria-hidden="true" size={compact ? 13 : 14} />
                {mediaSourceNames[source]}
              </span>
            )
          })}
        </div>
      </div>
    )
  }

  const Icon = sourceIcons[detected.source]
  const known = detected.source !== 'generic'
  return (
    <div
      className={`source-recognition ${compact ? 'source-recognition-compact' : ''}`}
    >
      <span className="source-recognition-icon" aria-hidden="true">
        <Icon size={compact ? 21 : 27} />
      </span>
      <div className="source-recognition-copy">
        <strong role="status">{mediaSourceNames[detected.source]}</strong>
        <span>
          {known ? 'Link reconhecido' : 'Link HTTPS detectado'} ·{' '}
          {detected.host}
        </span>
      </div>
      <span className="source-recognition-state">Ainda não analisado</span>
      <p>
        {known
          ? 'A disponibilidade do vídeo e as qualidades aparecem após a análise.'
          : 'O Orbe tentará identificar a mídia quando você analisar o link.'}
      </p>
    </div>
  )
}
