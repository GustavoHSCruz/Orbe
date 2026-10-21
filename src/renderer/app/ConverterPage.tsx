import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  AudioLines,
  Check,
  FileAudio,
  FileVideo,
  FolderOpen,
  LoaderCircle,
  RotateCw,
  Upload,
  WandSparkles,
} from 'lucide-react'
import type {
  ConversionFormat,
  ConversionResult,
  ConversionSource,
} from '../../shared/contracts/converter'
import { Button } from '@/components/ui/button'

const choices: { format: ConversionFormat; name: string; detail: string }[] = [
  {
    format: 'mp3',
    name: 'MP3',
    detail:
      'Funciona em quase qualquer aparelho. Boa escolha para compartilhar.',
  },
  {
    format: 'm4a',
    name: 'M4A',
    detail: 'Arquivo compacto com boa qualidade para música e podcasts.',
  },
  {
    format: 'opus',
    name: 'Opus',
    detail: 'Áudio compacto para apps e reprodução moderna.',
  },
  {
    format: 'flac',
    name: 'FLAC',
    detail: 'Áudio sem perda de qualidade; ocupa mais espaço.',
  },
  {
    format: 'wav',
    name: 'WAV',
    detail: 'Áudio sem compressão, ideal para edição; arquivo grande.',
  },
  {
    format: 'mp4',
    name: 'MP4',
    detail: 'Vídeo compatível com celulares, TVs e navegadores.',
  },
  {
    format: 'webm',
    name: 'WebM',
    detail: 'Vídeo eficiente para reprodução na web.',
  },
]

function displaySize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function ConverterPage() {
  const client = useQueryClient()
  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.orbe.getSettings(),
  })
  const [source, setSource] = useState<ConversionSource | null>(null)
  const [kind, setKind] = useState<'audio' | 'video'>('video')
  const [selected, setSelected] = useState<ConversionFormat>('mp4')
  const [busy, setBusy] = useState<
    'choosing' | 'converting' | 'cancelling' | null
  >(null)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ConversionResult | null>(null)
  const [error, setError] = useState('')
  useEffect(() => window.orbe.onConversionProgress(setProgress), [])

  const choose = async () => {
    setBusy('choosing')
    setError('')
    try {
      const next = await window.orbe.chooseConversionFile()
      if (!next) return
      setSource(next)
      setResult(null)
      setProgress(0)
      const preferred = settings.data?.preferredDownload
      const nextKind = !next.hasVideo
        ? 'audio'
        : !next.hasAudio
          ? 'video'
          : (preferred?.kind ?? 'video')
      setKind(nextKind)
      setSelected(
        nextKind === 'audio'
          ? (preferred?.audioExtension ?? 'mp3')
          : (preferred?.videoExtension ?? 'mp4'),
      )
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível abrir o arquivo.',
      )
    } finally {
      setBusy(null)
    }
  }
  const convert = async () => {
    if (!source) return
    setBusy('converting')
    setError('')
    setResult(null)
    setProgress(0)
    try {
      const done = await window.orbe.startConversion(source.id, selected)
      setResult(done)
      await client.invalidateQueries({ queryKey: ['library'] })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'A conversão falhou.')
    } finally {
      setBusy(null)
    }
  }
  return (
    <div className="mx-auto max-w-4xl">
      <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/8 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-300">
        <WandSparkles size={14} /> Ferramentas
      </div>
      <h1 className="mt-5 text-4xl font-bold tracking-tight">
        Converter mídia
      </h1>
      <p className="mt-2 text-slate-400">
        Troque o formato de um arquivo local ou extraia o áudio de um vídeo. O
        original fica intacto.
      </p>
      <div className="mt-8 space-y-5">
        <section className="rounded-[1.75rem] border border-white/10 bg-[#151923] p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
              1
            </span>
            <div>
              <h2 className="font-bold">Escolha um arquivo</h2>
              <p className="text-xs text-slate-400">
                Áudio ou vídeo salvo no computador
              </p>
            </div>
          </div>
          {source ? (
            <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-[#0d1018] p-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                {source.hasVideo ? <FileVideo /> : <FileAudio />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{source.name}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {source.extension.toUpperCase()} ·{' '}
                  {displaySize(source.sizeBytes)}
                  {source.durationMs
                    ? ` · ${Math.round(source.durationMs / 1000)} s`
                    : ''}
                </p>
              </div>
              <Button
                variant="secondary"
                disabled={busy !== null}
                onClick={() => void choose()}
              >
                Trocar
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void choose()}
              disabled={busy !== null}
              className="mt-5 flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-violet-400/30 bg-violet-400/5 px-6 py-9 text-center transition hover:border-violet-400/60 hover:bg-violet-400/10"
            >
              <Upload className="text-violet-300" />
              <span className="font-semibold">
                {busy === 'choosing'
                  ? 'Abrindo arquivo...'
                  : 'Selecionar arquivo'}
              </span>
              <span className="text-xs text-slate-400">
                MP3, M4A, M4P sem proteção, MP4, WebM e outros
              </span>
            </button>
          )}
        </section>
        {source && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[1.75rem] border border-white/10 bg-[#151923] p-6"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
                2
              </span>
              <div>
                <h2 className="font-bold">Como quer salvar?</h2>
                <p className="text-xs text-slate-400">
                  Escolha um formato compatível com o que você precisa
                </p>
              </div>
            </div>
            {source.hasAudio && source.hasVideo && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={kind === 'video'}
                  onClick={() => {
                    setKind('video')
                    setSelected(
                      settings.data?.preferredDownload.videoExtension ?? 'mp4',
                    )
                  }}
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-left ${kind === 'video' ? 'border-violet-400/60 bg-violet-500/15' : 'border-white/10 bg-white/3 hover:bg-white/6'}`}
                >
                  <FileVideo className="text-violet-300" />
                  <span>
                    <strong className="block">Manter vídeo</strong>
                    <small className="text-slate-400">
                      Imagem e som juntos
                    </small>
                  </span>
                </button>
                <button
                  type="button"
                  aria-pressed={kind === 'audio'}
                  onClick={() => {
                    setKind('audio')
                    setSelected(
                      settings.data?.preferredDownload.audioExtension ?? 'mp3',
                    )
                  }}
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-left ${kind === 'audio' ? 'border-violet-400/60 bg-violet-500/15' : 'border-white/10 bg-white/3 hover:bg-white/6'}`}
                >
                  <AudioLines className="text-violet-300" />
                  <span>
                    <strong className="block">Extrair áudio</strong>
                    <small className="text-slate-400">Só o som do vídeo</small>
                  </span>
                </button>
              </div>
            )}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {choices
                .filter((item) =>
                  kind === 'audio'
                    ? ['mp3', 'm4a', 'opus', 'flac', 'wav'].includes(
                        item.format,
                      )
                    : ['mp4', 'webm'].includes(item.format),
                )
                .map((item) => (
                  <button
                    key={item.format}
                    type="button"
                    aria-pressed={selected === item.format}
                    onClick={() => setSelected(item.format)}
                    className={`rounded-2xl border p-4 text-left transition ${selected === item.format ? 'border-violet-400/60 bg-violet-500/15' : 'border-white/10 bg-white/3 hover:bg-white/6'}`}
                  >
                    <div className="flex justify-between">
                      <strong>{item.name}</strong>
                      {selected === item.format && (
                        <Check size={18} className="text-violet-300" />
                      )}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      {item.detail}
                    </p>
                  </button>
                ))}
            </div>
            <p className="mt-5 text-xs text-slate-400">
              O resultado será salvo na pasta de downloads configurada e
              adicionado à sua biblioteca.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button onClick={() => void convert()} disabled={busy !== null}>
                {busy === 'converting' ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <RotateCw size={17} />
                )}{' '}
                {busy === 'converting'
                  ? 'Convertendo...'
                  : kind === 'audio' && source.hasVideo
                    ? 'Extrair áudio'
                    : 'Converter arquivo'}
              </Button>
              {busy === 'converting' && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setBusy('cancelling')
                    void window.orbe.cancelConversion()
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
            {busy === 'converting' || busy === 'cancelling' ? (
              <div role="status" className="mt-5">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>
                    {busy === 'cancelling'
                      ? 'Cancelando...'
                      : 'Convertendo arquivo...'}
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all"
                    style={{ width: `${Math.max(progress, 2)}%` }}
                  />
                </div>
              </div>
            ) : null}
          </motion.section>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-rose-400/25 bg-rose-400/8 p-4 text-sm text-rose-200"
          >
            {error}
          </p>
        )}
        {result && (
          <div
            role="status"
            className="rounded-2xl border border-emerald-400/25 bg-emerald-400/8 p-5"
          >
            <p className="flex items-center gap-2 font-bold text-emerald-200">
              <Check size={18} /> Conversão concluída
            </p>
            <p className="mt-2 break-all text-sm text-slate-300">
              {result.name}
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  void window.orbe.openConvertedFile(result.path)
                }
              >
                Abrir arquivo
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  void window.orbe.openConvertedFolder(result.path)
                }
              >
                <FolderOpen size={16} /> Mostrar na pasta
              </Button>
            </div>
          </div>
        )}
        <p className="text-xs leading-5 text-slate-500">
          Arquivos M4P protegidos por DRM não podem ser convertidos. O Orbe
          aceita M4P apenas quando o áudio pode ser lido normalmente.
        </p>
      </div>
    </div>
  )
}
