# Landing page do Orbe

O repositório usa npm workspaces. O desktop continua na raiz, preservando os caminhos do Electron, das migrations e dos testes. A landing page é um projeto Vite + React independente em `apps/web`. O pacote `packages/brand` compartilha o símbolo SVG e os tokens de identidade entre os dois projetos.

```text
src/                 Aplicativo desktop Electron
apps/web/            Landing page, build e deploy próprios
packages/brand/      Marca e cores compartilhadas
resources/           Ícone Windows e ferramentas do desktop
```

## Desenvolvimento

Na raiz, execute `npm install`. Use `npm run dev` para o aplicativo e `npm run dev:web` para o site. `npm run build:web` gera `apps/web/dist`; `npm run build:all` compila ambos. Não é necessário Turborepo para estes dois projetos.

## Vercel

1. Importe este repositório como um projeto novo.
2. Defina **Root Directory** como `apps/web` e **Framework Preset** como Vite.
3. Ative **Include source files outside of the Root Directory in the Build Step**, pois a marca está em `packages/brand` e o lockfile está na raiz.
4. Mantenha os comandos do `vercel.json`: o install filtrado usa apenas o workspace web, sem instalar Electron e sem executar scripts do desktop. O build é `npm run build` e o output é `dist`.
5. Publique. Nenhuma credencial do desktop é necessária no site.

Referência: [monorepos na Vercel](https://vercel.com/docs/monorepos).

## Vercel Web Analytics

O componente `Analytics` de `@vercel/analytics/react` é carregado uma única vez na raiz da landing page. A dependência também está declarada no workspace `@orbe/web`, para fazer parte da instalação filtrada usada no deploy. O modo acompanha o Vite: desenvolvimento local não envia métricas; o build de produção habilita a coleta de visitas e visualizações de página.

No painel do projeto da Vercel, abra **Analytics** e habilite **Web Analytics**, caso ainda não esteja ativo. Publique um novo deploy com esta integração, visite o endereço publicado e confira as visitas na aba Analytics. Não é necessário criar uma chave nem adicionar variáveis de ambiente para essa integração.

Referência: [configurar Vercel Web Analytics](https://vercel.com/docs/analytics/quickstart).

## Prévia ao compartilhar links

O HTML inicial contém Open Graph e Twitter Cards, incluindo título, descrição, URL canônica, idioma e uma imagem PNG de 1200×630. Os robôs das redes sociais conseguem ler esses metadados sem executar React. A imagem pública é `https://useorbe.vercel.app/orbe-social-v1.png` e usa o símbolo orbital, a fonte e as cores do Orbe.

Para recriar a arte a partir da composição HTML e dos ativos locais, execute `node scripts/generate-social-preview.mjs` na raiz, com as dependências instaladas e Chrome disponível. A fonte está em `packages/brand/social-preview.html`; a imagem e seu registro de origem ficam em `apps/web/public/`.

Após enviar as alterações e publicar na Vercel, confira se a URL da imagem abre publicamente. Algumas redes mantêm a prévia anterior em cache: o novo deploy não altera mensagens antigas imediatamente. Para verificar uma publicação nova, compartilhe novamente o link; os inspetores de compartilhamento de cada plataforma podem solicitar nova leitura. O layout final depende da rede e das preferências de quem visualiza.

Se o domínio público mudar, atualize `canonical`, `og:url`, as URLs da imagem e o endereço na composição. Ao substituir a arte por uma nova versão, incremente o nome do arquivo e atualize as referências para evitar reutilizar a imagem antiga em cache.

Referência: [protocolo Open Graph](https://ogp.me/).

## Download do instalador

Os botões **Baixar Orbe** do topo e da apresentação levam à seção **Escolha seu sistema**. Nela, Windows tem um instalador `.exe` e Linux x64 tem opções AppImage e `.deb`. macOS e Android/iOS aparecem como **Não disponível**, sem links ou previsão de lançamento.

Na Vercel, configure as variáveis públicas com as URLs HTTPS dos arquivos publicados no GitHub Releases e faça um novo deploy:

```dotenv
VITE_DOWNLOAD_WINDOWS_URL=https://github.com/guilhermeSDB/orbe/releases/latest/download/Orbe-Windows-x64.exe
VITE_DOWNLOAD_LINUX_APPIMAGE_URL=https://github.com/guilhermeSDB/orbe/releases/latest/download/Orbe-Linux-x64.AppImage
VITE_DOWNLOAD_LINUX_DEB_URL=https://github.com/guilhermeSDB/orbe/releases/latest/download/Orbe-Linux-x64.deb
```

Esses links exigem arquivos com exatamente esses nomes na release marcada como Latest. Para acesso público, o repositório de distribuição também precisa ser público. Se o local de publicação mudar, atualize as URLs.

Cada formato é configurado de forma independente. Sem uma URL válida, sua ação mostra **Download indisponível**; os demais links continuam funcionando. URLs sem HTTPS, inválidas ou contendo credenciais são rejeitadas. A variável anterior `VITE_DOWNLOAD_URL` continua aceita como alternativa para Windows, com prioridade para `VITE_DOWNLOAD_WINDOWS_URL`.

Para desenvolvimento, copie `apps/web/.env.example` para `apps/web/.env.local` e preencha a variável. Reinicie o Vite depois de alterá-la. Variáveis `VITE_*` entram no bundle público e não devem conter segredos.

## Marca e capturas

O símbolo mestre é `packages/brand/mark.svg`. `npm run brand:generate` recria o PNG do aplicativo, o `.ico` Windows, o SVG de recursos e o favicon do site; requer Python e Pillow.

As quatro imagens em `apps/web/public/*-preview.webp` são capturas reais do aplicativo, com arquivos de demonstração e capas geométricas originais. Não representam um catálogo oferecido pelo Orbe. A reprodução e as letras nas capturas usam conteúdo de teste.

`python scripts/generate_preview_media.py` gera as mídias de demonstração. `node scripts/capture-brand-preview.mjs` recaptura as telas após compilar o desktop; `python scripts/publish_preview_assets.py` converte as capturas para WebP e atualiza as imagens e seus registros de origem no site. Testes do site: `npm run test:web` (Chrome instalado, ou `PLAYWRIGHT_CHANNEL` configurado para outro canal do Playwright).

## Compatibilidade da troca de nome

Instalações novas usam Orbe, `orbe.sqlite`, `window.orbe`, protocolo `orbe-media` e variáveis `ORBE_*`. A camada `brand-compatibility.ts` reaproveita o diretório e banco antigos quando necessário e aceita as variáveis `CLIPORA_*` como fallback. As escolhas antigas do Discord e as preferências locais do player são convertidas sem apagar os dados originais. Referências ao nome anterior ficam restritas a essa compatibilidade e seus testes.

Evidências históricas em `.impeccable`, mídia baixada e builds anteriores não são reescritos como se tivessem sido gerados com a marca nova.
