# Orbe

Aplicativo desktop para salvar, organizar e reproduzir vídeos e músicas. A interface usa **Plus Jakarta Sans Variable**, incluída no aplicativo. Use downloads somente quando tiver direito ou autorização.

## Monorepo e landing page

O desktop permanece na raiz; `apps/web` contém a landing page independente e `packages/brand` compartilha marca e cores. Use `npm run dev:web` para abrir o site e `npm run build:web` para gerar sua distribuição. O deploy na Vercel e a configuração do link do instalador estão em [docs/landing-page.md](docs/landing-page.md).

## Recursos

- Analisa links de YouTube, SoundCloud, Instagram, Facebook e X/Twitter, além de outras fontes aceitas pelo yt-dlp. O suporte depende da publicação e das mudanças em cada site.
- Em links do YouTube que contêm vídeo e playlist, permite escolher entre só o vídeo e a lista inteira. A lista carrega 25 itens por página.
- Mostra capa, título e formatos reais. A escolha simples explica MP4, MP3, M4A, resolução, compatibilidade e tamanho; **Opções avançadas** exibem codec e todos os formatos.
- Depois da análise, abre uma modal em três etapas: escolha o conteúdo, defina o formato e revise antes de baixar. A prévia de áudio usa um trecho temporário de até 30 segundos, apagado ao sair do aplicativo.
- **Novo download** fica disponível na barra lateral, no topo de todas as páginas e no player expandido. `Ctrl+N` abre o mesmo fluxo sem sair da tela atual.
- Em **Configurações → Downloads**, escolha o tipo e os formatos favoritos. Eles aparecem selecionados automaticamente para vídeos e playlists; a escolha pode ser alterada a cada download.
- **Converter mídia** transforma arquivos locais em MP3, M4A, Opus, FLAC, WAV, MP4 ou WebM. Para vídeos com áudio, **Extrair áudio** salva apenas o som. O resultado entra na biblioteca e o original é preservado. M4P sem proteção pode ser convertido; arquivos com DRM não podem ser lidos pelo FFmpeg.
- Mantém fila, progresso, histórico e biblioteca em SQLite. Permite cancelar, repetir, pesquisar, escolher pasta e configurar limite de velocidade.
- Reproduz arquivos locais com fila, busca, aleatório e repetição. Salva a última faixa, posição e volume para retomar depois de abrir o aplicativo.
- Oferece transição suave entre músicas (2 a 8 segundos) e normalização opcional de volume baseada na intensidade medida de cada arquivo. As opções ficam em **Configurações → Reprodução**.
- O player expandido mistura quatro cores da capa em um fundo de movimento contínuo, com transição gradual ao trocar de música. As letras aparecem grandes, com foco no verso atual e rolagem suave; clique em um verso para avançar até ele. Ao rolar manualmente, use **Voltar ao verso atual** ou aguarde cinco segundos. O movimento pausa com a música e respeita a opção de reduzir animações do sistema. Letras sem marcação de tempo continuam disponíveis para leitura livre.
- **Escolher mídia** dentro do player permite trocar diretamente de vídeo para música ou vice-versa. A reprodução de áudio usa os elementos nativos para manter a saída audível durante a troca.
- Vídeos aparecem no quadro do player expandido. Ao recolher, a miniatura mostra uma capa estática e o áudio continua, preservando a posição. Para vídeos locais sem capa, o Orbe extrai um quadro do arquivo. Use **Ver capa** e **Ver vídeo** no player expandido para alternar a visualização sem interromper o som.
- **Configurações → Pastas de mídia** permite adicionar várias pastas, com busca em subpastas ao abrir e a cada 45 segundos. Ao trocar o destino dos downloads, escolha se deseja continuar buscando na pasta anterior. Parar de buscar não apaga arquivos nem os registros já importados.
- Arquivos movidos, excluídos ou indisponíveis aparecem em um aviso e na lista de recuperação. **Localizar arquivo/pasta** atualiza os caminhos mantendo favoritos e playlists. **Baixar novamente** aparece quando existe um download registrado e usa a pasta atual; a disponibilidade depende da origem. Remover um registro exige confirmação e não exclui o arquivo do computador.
- **Minhas playlists** permite criar, editar, ordenar e reproduzir coleções locais. **Playlists YouTube** mostra as listas da conta conectada separadamente.
- Na página **Spotify**, cole o link de uma playlist pública para criar um rascunho local sem Spotify Premium ou conta YouTube. O Orbe confere a contagem, busca versões no YouTube, pede revisão quando a correspondência é incerta e adiciona os downloads à biblioteca na ordem da playlist, inclusive músicas repetidas.
- As operações exibem progresso, indicadores de carregamento ou skeletons enquanto aguardam resposta.
- A aba **Integrações** reúne Spotify, Google/YouTube, Discord, redes sociais e letras em cartões separados. A conexão Spotify continua opcional e serve para reprodução e playlists da conta; a importação pública usa apenas o link.

## Executar e instalar

No Windows 10/11, instale Node.js 22.12+ ou 24+, npm 10+ e [Git LFS](https://git-lfs.com/). FFmpeg e FFprobe são versionados com Git LFS. Após clonar o repositório, execute na pasta do projeto:

```powershell
git lfs install
git lfs pull
npm install
npm run dev
```

Para gerar o instalador:

```powershell
npm run dist:win
```

O arquivo gerado fica em `dist/Orbe Setup 0.2.1.exe`. Ele não é assinado; o Windows pode mostrar um aviso de editor desconhecido. Os binários verificados do yt-dlp, FFmpeg e FFprobe em `resources/bin` acompanham o instalador. Durante o desenvolvimento, `ORBE_YT_DLP_PATH`, `ORBE_FFMPEG_PATH` e `ORBE_FFPROBE_PATH` permitem apontar para outros executáveis confiáveis.

## Usar o aplicativo

Para o build Linux, as ferramentas nativas, AppImage, `.deb` e o workflow de CI, consulte [docs/linux.md](docs/linux.md). A configuração está preparada, mas a execução Linux precisa ser validada nessa plataforma antes de anunciar sua disponibilidade.

1. Clique em **Novo download** em qualquer tela (ou pressione `Ctrl+N`), cole o link e avance. Na modal, escolha os itens da playlist ou ouça uma prévia temporária.
2. Avance para **Formato** e escolha **Vídeo** ou **Áudio**. A opção recomendada aparece primeiro; abra **Opções avançadas** se quiser escolher um formato específico.
3. Revise a escolha e clique em **Iniciar download**. Acompanhe o progresso em **Downloads** e abra o item pela **Biblioteca**.
4. Clique na capa ou em **Expandir player** para abrir a reprodução expandida. Use **Tela cheia** para ocupar o monitor.
5. Em **Minhas playlists**, crie uma coleção e use **Adicionar da biblioteca**. Você também pode adicionar um item pelo botão de playlist na **Biblioteca**.
6. Em **Converter mídia**, escolha um arquivo local, defina o formato ou use **Extrair áudio**. A conversão mostra progresso e salva uma cópia na pasta de downloads configurada.

Para importar uma playlist pública, abra **Spotify**, cole o link e clique em **Criar rascunho**. Aguarde a contagem completa antes de **Buscar no YouTube**. Confira os resultados marcados para revisão; em **Ver todas**, você também pode trocar uma versão aceita automaticamente antes de baixar. Ao concluir, clique em **Baixar músicas** e acompanhe falhas ou retomadas no próprio rascunho. Se a leitura pública ficar incompleta, importe o ZIP ou JSON da exportação oficial da sua conta; o Orbe não guarda o arquivo bruto. Esse caminho alternativo só contém playlists presentes na exportação da conta. O leitor público depende de páginas e endpoints não oficiais do Spotify e pode deixar de funcionar após mudanças no site; lotes incompletos permanecem bloqueados.

Para Instagram, Facebook ou X que exigem login, selecione um `cookies.txt` no formato Netscape exportado da sua própria sessão em **Integrações → Redes sociais** e salve. O Orbe armazena apenas o caminho local e passa o arquivo ao yt-dlp durante análise e download. Links públicos acessíveis ao yt-dlp podem funcionar sem esse arquivo; alguns posts com vídeo continuam indisponíveis mesmo com sessão. Consulte a [FAQ oficial do yt-dlp](https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp).

Se o yt-dlp não conseguir identificar um vídeo do X, o Orbe consulta a [API pública do FxEmbed](https://github.com/FxEmbed/FxEmbed/blob/main/docs/src/content/docs/api/introduction.mdx) com o ID do post e baixa uma variante MP4 diretamente de `video.twimg.com`. Essa consulta envia o ID do post ao FxEmbed, mas não envia cookies. A disponibilidade depende dessa API externa e do arquivo continuar acessível no X.

Se o YouTube mostrar “Sign in to confirm you’re not a bot”, abra **Integrações → YouTube**, escolha o navegador em que você está conectado à sua conta, feche o navegador e salve. Também é possível escolher um `cookies.txt` no formato Netscape; esse arquivo tem prioridade sobre o navegador. A sessão configurada é usada na análise, na prévia e no download. A conexão opcional com a API do Google para importar playlists é separada dessa sessão. O YouTube pode continuar exigindo verificação conforme a conta, a rede ou o estado dos cookies; veja a [orientação oficial do yt-dlp](https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies).

O player procura primeiro um `.lrc` com o mesmo nome do arquivo de mídia na mesma pasta. Depois limpa o título e o artista e consulta a [API do LRCLIB](https://lrclib.net/docs). Se os metadados estiverem incorretos, use **Buscar letra** no player expandido e informe música e artista; a correção é lembrada para aquela faixa. A disponibilidade depende do catálogo.

## Integrações

Em **Integrações**, configure o serviço e conecte a conta quando necessário:

- **YouTube:** sessão do Chrome, Edge, Firefox, Brave ou `cookies.txt` para mídia; OAuth Desktop Client ID e YouTube Data API v3 para importar playlists com acesso somente leitura.
- **Spotify:** Client ID no Spotify Developer Dashboard e autorização PKCE para reprodução atual, recentes e playlists.
- **Discord:** Application ID próprio e Discord Desktop aberto para Rich Presence. Escolha quais informações publicar.

`ORBE_GOOGLE_CLIENT_ID`, `ORBE_SPOTIFY_CLIENT_ID` e `ORBE_DISCORD_CLIENT_ID` podem fornecer IDs iniciais. `ORBE_DOWNLOAD_DIRECTORY` define a pasta inicial. Tokens OAuth são protegidos por `safeStorage` quando disponível e não ficam no SQLite. Integrações com contas reais exigem credenciais do usuário.

## Desenvolvimento

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

O E2E usa Electron e fontes públicas externas. O cenário do app empacotado exige `dist/win-unpacked/Orbe.exe`, gerado por `npm run dist:win`. O banco fica no diretório `userData` do Electron como `orbe.sqlite`; migrations em `drizzle/` são aplicadas na inicialização.

O renderer React chama apenas a API nomeada do preload. O processo principal valida IPC com Zod e controla arquivos, banco, OAuth e processos externos. `contextIsolation` e sandbox estão ativos; Node está desabilitado no renderer. yt-dlp e FFmpeg recebem argumentos separados, sem shell. O player abre arquivos por IDs da biblioteca via protocolo `orbe-media`.

Veja [arquitetura](docs/architecture.md), [schema SQLite](docs/database.sql) e [wireframes](docs/wireframes.md). A licença da fonte está em `resources/licenses/`.
