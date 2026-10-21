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

## Download do instalador

Enquanto não houver uma URL, a página mostra **Download em breve**. Não há URL fictícia nem formulário que capture e-mails.

Quando publicar o instalador (por exemplo, em GitHub Releases), defina a variável pública `VITE_DOWNLOAD_URL` na Vercel com a URL HTTPS do arquivo `.exe` e faça um novo deploy. Os botões passarão a apontar para o instalador. URLs inválidas ou sem HTTPS mantêm o estado de indisponibilidade.

Para desenvolvimento, copie `apps/web/.env.example` para `apps/web/.env.local` e preencha a variável. Reinicie o Vite depois de alterá-la. Variáveis `VITE_*` entram no bundle público e não devem conter segredos.

## Marca e capturas

O símbolo mestre é `packages/brand/mark.svg`. `npm run brand:generate` recria o PNG do aplicativo, o `.ico` Windows, o SVG de recursos e o favicon do site; requer Python e Pillow.

As quatro imagens em `apps/web/public/*-preview.webp` são capturas reais do aplicativo, com arquivos de demonstração e capas geométricas originais. Não representam um catálogo oferecido pelo Orbe. A reprodução e as letras nas capturas usam conteúdo de teste.

`python scripts/generate_preview_media.py` gera as mídias de demonstração. `node scripts/capture-brand-preview.mjs` recaptura as telas após compilar o desktop; `python scripts/publish_preview_assets.py` converte as capturas para WebP e atualiza as imagens e seus registros de origem no site. Testes do site: `npm run test:web` (Chrome instalado, ou `PLAYWRIGHT_CHANNEL` configurado para outro canal do Playwright).

## Compatibilidade da troca de nome

Instalações novas usam Orbe, `orbe.sqlite`, `window.orbe`, protocolo `orbe-media` e variáveis `ORBE_*`. A camada `brand-compatibility.ts` reaproveita o diretório e banco antigos quando necessário e aceita as variáveis `CLIPORA_*` como fallback. As escolhas antigas do Discord e as preferências locais do player são convertidas sem apagar os dados originais. Referências ao nome anterior ficam restritas a essa compatibilidade e seus testes.

Evidências históricas em `.impeccable`, mídia baixada e builds anteriores não são reescritos como se tivessem sido gerados com a marca nova.
