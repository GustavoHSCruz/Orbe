import { useState } from 'react'
import {
  ArrowRight,
  Check,
  FolderOpen,
  Link2,
  Settings2,
} from 'lucide-react'
import brandMark from '@orbe/brand/mark.svg'
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useNavigation } from '../stores/navigation'

export function Onboarding({ finish }: { finish: () => void }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [directory, setDirectory] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { setPage, openDownloadDialog } = useNavigation()
  const complete = async () => {
    try {
      await window.orbe.finishOnboarding()
      finish()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao concluir.')
    }
  }
  const startWithFiles = async () => {
    setBusy(true)
    setError('')
    try {
      await window.orbe.importLocalFiles()
      await window.orbe.finishOnboarding()
      await queryClient.invalidateQueries({ queryKey: ['library'] })
      setPage('library')
      finish()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível adicionar os arquivos. Tente novamente.',
      )
    } finally {
      setBusy(false)
    }
  }
  const startWithLink = async () => {
    setBusy(true)
    setError('')
    try {
      await window.orbe.finishOnboarding()
      setPage('home')
      finish()
      openDownloadDialog()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível abrir o Orbe. Tente novamente.',
      )
    } finally {
      setBusy(false)
    }
  }
  const continueToIntegrations = async () => {
    try {
      if (directory) {
        const current = await window.orbe.getSettings()
        await window.orbe.saveSettings({
          ...current,
          downloadDirectory: directory,
        })
        await queryClient.invalidateQueries({ queryKey: ['settings'] })
      }
      setStep(2)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível salvar a pasta.',
      )
    }
  }
  return (
    <div className="onboarding-shell relative flex min-h-screen items-center justify-center p-8 text-white">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="onboarding-card premium-card relative w-full max-w-xl rounded-2xl border border-white/10 p-10"
      >
        <div className="flex items-center justify-between">
          <div className="flex size-14 items-center justify-center">
            <img src={brandMark} alt="" className="size-full" />
          </div>
          {step === 0 ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => void complete()}
            >
              Pular introdução
            </Button>
          ) : (
            <span className="text-xs font-semibold tracking-widest text-slate-400">
              0{step + 1} / 03
            </span>
          )}
        </div>
        <div className="mt-6 flex gap-1.5">
          {[0, 1, 2].map((value) => (
            <span
              key={value}
              className={`h-1 flex-1 rounded-full ${value <= step ? 'bg-[#ff647e]' : 'bg-white/10'}`}
            />
          ))}
        </div>
        {step === 0 && (
          <>
            <h1 className="mt-8 text-4xl font-bold tracking-tight">
              Bem-vindo ao Orbe
            </h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-400">
              Seus vídeos e músicas organizados em um lugar confortável de usar.
              Adicione arquivos do computador para começar a ouvir e assistir.
              Você também pode começar com um link.
            </p>
            <div className="mt-6 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
              <span className="flex items-center gap-2">
                <Check size={15} className="text-emerald-400" /> Downloads
                simples
              </span>
              <span className="flex items-center gap-2">
                <Check size={15} className="text-emerald-400" /> Biblioteca e
                player
              </span>
            </div>
            <div className="onboarding-start-actions">
              <Button disabled={busy} onClick={() => void startWithFiles()}>
                <FolderOpen size={17} />{' '}
                {busy ? 'Abrindo...' : 'Adicionar arquivos'}
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => void startWithLink()}
              >
                <Link2 size={17} /> Baixar por link
              </Button>
            </div>
            <div className="onboarding-footer">
              <span>
                <Settings2 size={16} /> Configure suas preferências primeiro
              </span>
              <Button variant="secondary" onClick={() => setStep(1)}>
                Começar <ArrowRight size={16} />
              </Button>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h1 className="mt-8 text-3xl font-bold tracking-tight">
              Configure a pasta de downloads, se quiser
            </h1>
            <p className="mt-3 text-sm text-slate-400">
              Se preferir, você pode usar a pasta padrão e alterá-la depois.
            </p>
            <div className="mt-5 flex gap-2">
              <input
                aria-label="Pasta escolhida"
                readOnly
                value={directory || 'Pasta padrão do Orbe'}
                className="min-w-0 flex-1 rounded-xl bg-[#171b24] px-3 text-sm"
              />
              <Button
                aria-label="Escolher pasta de downloads"
                variant="secondary"
                onClick={() =>
                  void window.orbe.chooseDownloadDirectory().then((path) => {
                    if (path) setDirectory(path)
                  })
                }
              >
                <FolderOpen size={17} /> Escolher pasta
              </Button>
            </div>
            <div className="onboarding-step-actions">
              <Button variant="secondary" onClick={() => setStep(0)}>
                Voltar
              </Button>
              <Button onClick={() => void continueToIntegrations()}>
                Continuar <ArrowRight size={16} />
              </Button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h1 className="mt-8 text-3xl font-bold tracking-tight">
              Conecte quando quiser
            </h1>
            <p className="mt-3 text-sm text-slate-400">
              O Orbe já funciona sem contas. Você pode configurar Spotify,
              YouTube e Discord depois na aba Integrações.
            </p>
            <div className="onboarding-step-actions">
              <Button variant="secondary" onClick={() => void complete()}>
                Pular
              </Button>
              <Button onClick={() => void complete()}>
                Abrir Orbe <ArrowRight size={16} />
              </Button>
            </div>
          </>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-rose-400">
            {error}
          </p>
        )}
      </motion.div>
    </div>
  )
}
