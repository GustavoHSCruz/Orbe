# Orbe no Linux

O Orbe usa Electron, React e SQLite, então a interface e a biblioteca podem ser compartilhadas com Windows. A base de portabilidade está preparada; o build e a validação real de Linux devem ser executados em Linux. Não há validação de execução Linux neste ambiente Windows.

## O que já foi preparado

- Resolução de yt-dlp, FFmpeg e FFprobe por plataforma. No Windows continuam os executáveis empacotados; no Linux são usadas ferramentas nativas no PATH ou definidas por `ORBE_YT_DLP_PATH`, `ORBE_FFMPEG_PATH` e `ORBE_FFPROBE_PATH`.
- Ícone PNG para janela, menu e empacotamento Linux.
- Alvos AppImage e `.deb`, inicialmente em x64. O instalador Windows continua independente.
- Workflow `.github/workflows/linux.yml`, com Node 24 e Ubuntu 24.04, testes unitários, testes de recuperação de pastas/vídeo em Xvfb, empacotamento e teste de abertura do aplicativo empacotado. Os arquivos são anexados como artefatos do Actions; o workflow não publica uma release automaticamente.

## Gerar em Ubuntu 24.04 x64

Instale Node.js 24 e npm. Instale as ferramentas nativas:

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg yt-dlp libgtk-3-0t64 libnss3 libasound2t64 libgbm1 libxss1 libsecret-1-0
npm ci --ignore-scripts
node node_modules/electron/install.js
npm run tools:check
npm run dev
```

Para gerar os pacotes:

```bash
npm run dist:linux
```

O AppImage fica em `dist/`. Para gerar também um `.deb` localmente, defina `ORBE_PROJECT_URL` com a URL HTTPS real do projeto e `ORBE_MAINTAINER` com seu nome e contato antes de executar o comando. No GitHub Actions, a URL do repositório é usada automaticamente. Instale o `.deb` com `sudo apt install ./dist/<nome-do-pacote>.deb`, ou dê permissão de execução ao AppImage e abra-o. Esta primeira configuração Linux usa **FFmpeg, FFprobe e yt-dlp do sistema**; o AppImage não os inclui. O `.deb` declara as dependências. Se a distribuição fornecer um yt-dlp antigo, use uma versão atual do projeto e aponte `ORBE_YT_DLP_PATH` para ela.

Os nomes dos pacotes de sistema variam entre distribuições. Estes comandos descrevem Ubuntu 24.04; não são uma promessa de compatibilidade com todas as distribuições ou ARM.

## Gerar pelo GitHub Actions

Depois de enviar o repositório ao GitHub, abra **Actions → Linux build → Run workflow**. Baixe `orbe-linux-x64` em Artifacts. Tags `v*` também disparam a compilação. O workflow precisa passar antes de anunciar Linux como disponível na landing page.

O script de empacotamento passa `--publish never` ao electron-builder para impedir a publicação automática ao detectar o CI ou uma tag. Esse fluxo não precisa de `GH_TOKEN`: os instaladores são disponibilizados em Artifacts e podem ser anexados manualmente a uma release.

## Verificações antes de distribuir

Teste importar arquivos e várias pastas, reprodução de áudio e vídeo, capa ao recolher o vídeo, conversão, downloads, recuperação de arquivos movidos/excluídos, temas e persistência após reiniciar. Confirme também Wayland/X11, áudio, permissões de unidades externas, sessão de navegador, integração com Discord e o cofre de credenciais do desktop. Contas devem ser conectadas novamente ao migrar de Windows: não copie tokens criptografados entre sistemas.

Para mover uma coleção do Windows, copie os arquivos pessoais e use **Pastas de mídia → Localizar pasta** para atualizar seus caminhos na biblioteca. Caminhos como `C:\Music` não são caminhos Linux.

Fontes primárias: [alvos Linux do electron-builder](https://www.electron.build/linux/), [arquivos nativos do yt-dlp](https://github.com/yt-dlp/yt-dlp#release-files), [armazenamento de credenciais no Electron](https://www.electronjs.org/docs/latest/api/safe-storage).
