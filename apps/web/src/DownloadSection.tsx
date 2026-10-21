import { Apple, ArrowDownToLine, Monitor, Smartphone, Terminal } from 'lucide-react'
import mark from '@orbe/brand/mark.svg'

function downloadUrl(value: string | undefined) {
  try {
    const url = new URL(value || '')
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.href
      : null
  } catch {
    return null
  }
}

const downloads = {
  windows:
    downloadUrl(import.meta.env.VITE_DOWNLOAD_WINDOWS_URL) ||
    downloadUrl(import.meta.env.VITE_DOWNLOAD_URL),
  appImage: downloadUrl(import.meta.env.VITE_DOWNLOAD_LINUX_APPIMAGE_URL),
  deb: downloadUrl(import.meta.env.VITE_DOWNLOAD_LINUX_DEB_URL),
}

function InstallerLink({
  href,
  children,
  primary = false,
}: {
  href: string | null
  children: string
  primary?: boolean
}) {
  if (!href) {
    return (
      <span className="download-missing" role="status">
        {children}<span>Download indisponível</span>
      </span>
    )
  }

  return (
    <a
      className={`button download-file${primary ? '' : ' download-file-secondary'}`}
      href={href}
      rel="noopener noreferrer"
    >
      <ArrowDownToLine size={17} aria-hidden="true" />
      {children}
    </a>
  )
}

export function DownloadSection() {
  return (
    <section id="download" className="download-section wrap" aria-labelledby="download-title">
      <div className="download-intro">
        <img className="download-mark" src={mark} width="64" height="64" alt="" />
        <h2 id="download-title">Escolha<br />seu sistema.</h2>
        <p>Sua próxima música favorita.<br />No seu computador. No seu ritmo.</p>
        <span className="download-context">Windows e Linux · Aplicativo desktop</span>
      </div>

      <div className="download-platforms">
        <article className="download-platform" aria-labelledby="windows-title">
          <div className="download-platform-heading">
            <Monitor size={27} strokeWidth={1.5} aria-hidden="true" />
            <div><h3 id="windows-title">Windows</h3><p>Windows 10 e 11 · Instalador .exe · x64</p></div>
          </div>
          <div className="download-platform-actions">
            <InstallerLink href={downloads.windows} primary>Baixar instalador .exe</InstallerLink>
          </div>
          <p className="download-platform-note">O instalador ainda não é assinado. O Windows pode exibir um aviso de editor desconhecido.</p>
        </article>

        <article className="download-platform" aria-labelledby="linux-title">
          <div className="download-platform-heading">
            <Terminal size={27} strokeWidth={1.5} aria-hidden="true" />
            <div><h3 id="linux-title">Linux</h3><p>Versão x64 · Escolha o formato para sua distribuição</p></div>
          </div>
          <div className="download-platform-actions">
            <InstallerLink href={downloads.appImage}>Baixar AppImage</InstallerLink>
            <InstallerLink href={downloads.deb}>Baixar .deb</InstallerLink>
          </div>
          <p className="download-platform-note">AppImage: dê permissão de execução e instale FFmpeg e yt-dlp no sistema. O pacote .deb instala as dependências pelo gerenciador de pacotes.</p>
        </article>

        <div className="download-other-platforms" aria-label="Outras plataformas">
          <div><Apple size={20} strokeWidth={1.5} aria-hidden="true" /><div><h3>macOS</h3><p>Não disponível</p></div></div>
          <div><Smartphone size={20} strokeWidth={1.5} aria-hidden="true" /><div><h3>Android / iOS</h3><p>Não disponível</p></div></div>
        </div>
      </div>
    </section>
  )
}
