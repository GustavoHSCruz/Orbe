import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { ArrowDown, ArrowDownToLine, ArrowRight, AudioLines, Check, ChevronDown, Disc3, Download, FolderHeart, Heart, ListMusic, Menu, Monitor, Repeat2, SlidersHorizontal, X } from 'lucide-react'
import mark from '@orbe/brand/mark.svg'
import { DownloadSection } from './DownloadSection'
import '@fontsource-variable/plus-jakarta-sans'
import '@orbe/brand/tokens.css'
import './styles.css'

function DownloadLink({ compact = false }: { compact?: boolean }) {
  return (
    <a className={`button ${compact ? 'button-small' : ''}`} href="#download">
      <ArrowDownToLine size={18} aria-hidden="true" /> Baixar Orbe
    </a>
  )
}

const chapters = [
  { name: 'Sua biblioteca', title: 'Uma coleção com a sua cara.', description: 'Músicas, vídeos e aqueles arquivos que você sempre quer encontrar de novo. Importe do computador, encontre pela busca e deixe os favoritos por perto.', icon: FolderHeart, image: '/library-preview.webp', alt: 'Biblioteca real do Orbe com capas, favoritos e filtros de áudio e vídeo', points: ['Áudio e vídeo no mesmo lugar', 'Capas ou lista: você escolhe', 'Favoritos e busca por título ou artista'] },
  { name: 'Seu player', title: 'Dê play. Fique um pouco.', description: 'Abra o player expandido, acompanhe a letra e deixe a capa dar o tom. O Orbe lembra a última faixa, a posição e o volume para você continuar depois.', icon: AudioLines, image: '/player-preview.webp', alt: 'Player expandido real do Orbe com a capa da faixa, fila e controles de reprodução', points: ['Letras sincronizadas, quando disponíveis', 'Transições suaves e volume equilibrado', 'Vídeos, tela cheia, aleatório e repetição'] },
  { name: 'Suas playlists', title: 'Um lugar para cada momento.', description: 'Monte uma lista para trabalhar, outra para viajar, outra só porque sim. Crie, reordene e reproduza suas playlists com os arquivos da sua biblioteca.', icon: ListMusic, image: '/playlists-preview.webp', alt: 'Playlists locais no aplicativo Orbe', points: ['Playlists locais que ficam com você', 'Ordem das faixas do seu jeito', 'Playlists do YouTube com conexão opcional'] },
]

const faqs = [
  ['O que é o Orbe?', 'É um aplicativo desktop para Windows e Linux que reúne sua coleção pessoal de músicas e vídeos. Você adiciona arquivos, organiza a biblioteca e reproduz tudo no mesmo lugar. Downloads e conversão ajudam a preparar e ampliar essa coleção.'],
  ['Preciso conectar alguma conta?', 'Não. Importe seus arquivos e use a biblioteca, as playlists e o player sem conectar contas. Spotify, YouTube e Discord são integrações opcionais. Alguns links podem exigir uma sessão do serviço de origem.'],
  ['Funciona sem internet?', 'Você pode ouvir e assistir aos arquivos que já estão no computador sem internet. Downloads, importação de playlists de serviços e busca de letras online precisam de conexão. Letras locais em LRC também são aceitas.'],
  ['O Orbe baixa músicas diretamente do Spotify?', 'Não. O Orbe lê a lista de faixas de uma playlist pública, busca versões no YouTube e permite revisar as correspondências antes de baixar. Você também pode importar uma exportação oficial da conta quando a leitura pública estiver incompleta.'],
  ['Quais formatos posso converter?', 'Áudio em MP3, M4A, Opus, FLAC e WAV; vídeo em MP4 e WebM. Também é possível extrair apenas o áudio de um vídeo. O original é preservado e o resultado entra na biblioteca. Arquivos protegidos por DRM não são suportados.'],
  ['Em quais sistemas ele está disponível?', 'O Orbe tem instalador para Windows 10 e 11 e pacotes AppImage e .deb para Linux x64. Os links estão na seção de downloads. Ainda não há versões para macOS, Android ou iOS.'],
]

function App() {
  const [menu, setMenu] = useState(false)
  const [chapter, setChapter] = useState(0)
  const active = chapters[chapter]
  return <>
    <a className="skip-link" href="#conteudo">Ir para o conteúdo</a>
    <header className="site-header wrap">
      <a className="brand" href="#" aria-label="Orbe, início"><img src={mark} width="40" height="40" alt="" /><span>orbe</span></a>
      <button className="menu-toggle" aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu} aria-controls="main-nav" onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button>
      <nav id="main-nav" className={menu ? 'nav-open' : ''} aria-label="Navegação principal">
        <a href="#experiencia" onClick={() => setMenu(false)}>Conheça o Orbe</a>
        <a href="#recursos" onClick={() => setMenu(false)}>Recursos</a>
        <a href="#duvidas" onClick={() => setMenu(false)}>Dúvidas</a>
        <a href="#download" onClick={() => setMenu(false)}>Downloads</a>
      </nav>
      <div className="header-download"><DownloadLink compact /></div>
    </header>
    <main id="conteudo">
      <section className="hero wrap">
        <h1>Tudo o que você ama.<br /><span>Na sua órbita.</span></h1>
        <p>Suas músicas. Seus vídeos. Um lugar para guardar,<br className="desktop-break" /> organizar e dar play em tudo que faz parte de você.</p>
        <div className="hero-actions"><DownloadLink /><a className="text-link" href="#experiencia">Encontre seu ritmo <ArrowDown size={16} /></a></div>
        <span className="platform-note"><Monitor size={13} aria-hidden="true" /> Windows e Linux · Sem conta para começar</span>
        <figure className="app-showcase">
          <div className="preview-caption"><span><span className="live-dot" /> Dentro do seu Orbe</span><span>Biblioteca pessoal de músicas e vídeos</span></div>
          <img src="/app-preview.webp" width="1440" height="960" fetchPriority="high" alt="Tela real do Orbe: biblioteca pessoal em tema escuro, com músicas, capas, playlists e player" />
          <figcaption>Interface real do aplicativo. Mídias de demonstração.</figcaption>
        </figure>
      </section>
      <section className="manifesto wrap" aria-label="A proposta do Orbe"><img src={mark} width="52" height="52" alt="" /><p>Tem música que vira memória.<br />Vídeo que merece ficar.<br /><span>O Orbe é o lugar deles.</span></p></section>
      <section id="experiencia" className="experience wrap">
        <div className="section-intro"><h2>Menos procurar.<br />Mais aproveitar.</h2><p>Do primeiro arquivo ao último replay,<br />sua coleção fica no centro de tudo.</p></div>
        <div className="chapter-layout">
          <div className="chapter-list"><div role="tablist" aria-label="Explore a experiência" aria-orientation="vertical">
            {chapters.map((item, i) => <button key={item.name} id={`tab-${i}`} role="tab" aria-selected={chapter === i} aria-controls="chapter-panel" tabIndex={chapter === i ? 0 : -1} className={chapter === i ? 'chapter active' : 'chapter'} onClick={() => setChapter(i)} onKeyDown={event => { if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (i + (['ArrowUp', 'ArrowLeft'].includes(event.key) ? 2 : 1)) % 3; setChapter(next); document.getElementById(`tab-${next}`)?.focus() } }}><item.icon size={21} /><span>{item.name}</span><ArrowRight size={18} /></button>)}
            </div><div id="chapter-panel" role="tabpanel" aria-labelledby={`tab-${chapter}`} tabIndex={0} className="chapter-copy"><h3>{active.title}</h3><p>{active.description}</p><ul>{active.points.map(point => <li key={point}><Check size={15} />{point}</li>)}</ul></div>
          </div>
          <figure className="chapter-image"><img src={active.image} width="1440" height="960" loading="lazy" alt={active.alt} /><figcaption>Captura do Orbe com conteúdo de demonstração.</figcaption></figure>
        </div>
      </section>
      <section id="recursos" className="tools-section">
        <div className="wrap"><div className="section-intro"><h2>Sua coleção pode<br />ir mais longe.</h2><p>Ferramentas que fazem sentido juntas.<br />Todas a serviço da sua biblioteca.</p></div>
          <div className="tools-editorial">
            <article className="download-feature"><div className="feature-icon"><Download size={24} /></div><h3>Encontrou. Guardou.</h3><p>Cole um link, escolha o conteúdo e o formato, revise e baixe. Sem sair do seu espaço.</p><div className="source-line"><span>YouTube</span><span>SoundCloud</span><span>Instagram</span><span>Facebook</span><span>X</span></div><ul className="feature-list"><li><Check size={16} />Vídeos, áudios e seleção de itens de playlists</li><li><Check size={16} />MP4, MP3 e M4A com escolhas de qualidade</li><li><Check size={16} />Prévia de áudio antes de baixar</li><li><Check size={16} />Fila, progresso, histórico e novas tentativas</li><li><Check size={16} />Pasta, formatos favoritos e limite de velocidade</li></ul><p className="feature-note">A disponibilidade depende de cada publicação e do serviço de origem. Alguns links exigem login.</p></article>
            <article className="convert-feature"><div className="feature-icon"><SlidersHorizontal size={24} /></div><h3>O arquivo certo.<br />Do seu jeito.</h3><p>Converta arquivos locais ou extraia o áudio de um vídeo. O original fica preservado, e a nova versão vai para a biblioteca.</p><div className="format-flow" aria-label="Converter MP4 em MP3"><span>MP4</span><ArrowRight size={24} /><span>MP3</span></div><p className="formats">MP3 · M4A · Opus · FLAC · WAV<br />MP4 · WebM</p><p className="feature-note">Conversão local, com progresso. Arquivos com DRM não são suportados.</p></article>
          </div>
          <div className="integration-heading"><h3>Seus serviços.<br /><span>Mais perto da sua coleção.</span></h3><p>Conecte quando fizer sentido.<br />O Orbe já funciona com seus arquivos.</p></div>
          <div className="integration-list">
            <article><span className="service-name">Spotify <ArrowRight size={18} /></span><p>Traga uma playlist pública, encontre versões no YouTube e revise antes de baixar. A conexão de conta é opcional para ver playlists, recentes e a reprodução atual.</p></article>
            <article><span className="service-name">YouTube <ArrowRight size={18} /></span><p>Baixe por link e escolha itens de playlists. Conecte sua conta para consultar suas listas, ou configure uma sessão para conteúdos que exigem login.</p></article>
            <article><span className="service-name">Discord <ArrowRight size={18} /></span><p>Compartilhe o que está ouvindo com Rich Presence. Escolha quais informações aparecem e como exibir a reprodução pausada.</p></article>
          </div>
          <div className="details-strip"><span><Repeat2 size={18} />Transições entre faixas</span><span><AudioLines size={18} />Normalização de volume</span><span><Disc3 size={18} />Letras locais e online</span><span><Heart size={18} />Temas claro e escuro</span></div>
        </div>
      </section>
      <section id="duvidas" className="faq-section wrap"><div><h2>Antes de dar play.</h2><p>Algumas respostas para<br />você se sentir em casa.</p></div><div className="faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={18} /></summary><p>{answer}</p></details>)}</div></section>
      <DownloadSection />
    </main>
    <footer className="wrap"><a className="brand" href="#" aria-label="Orbe, voltar ao início"><img src={mark} width="32" height="32" alt="" /><span>orbe</span></a><p>Sua coleção, na sua órbita.</p><a href="#recursos">Explore os recursos <ArrowRight size={14} /></a><small>Baixe somente conteúdos que você tenha direito ou autorização para salvar.</small></footer>
  </>
}

createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <Analytics mode={import.meta.env.DEV ? 'development' : 'production'} />
  </>,
)
