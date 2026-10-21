# Orbe

<!-- impeccable:product-schema 1 -->

## Platform

web

A interface usa tecnologias web dentro de um aplicativo desktop Electron para Windows. A apresentação pública fica em uma landing page independente em `apps/web`, preparada para Vercel; o aplicativo desktop não é executado pelo site.

## Users

O público principal são pessoas que usam o Orbe para ouvir músicas e assistir a vídeos da própria biblioteca local. A prioridade confirmada é o uso pessoal, com downloads simples para alimentar essa biblioteca.

## Product Purpose

Reunir músicas e vídeos pessoais em um lugar para salvar, organizar e reproduzir. O sucesso do fluxo principal é conseguir adicionar uma mídia, encontrá-la na biblioteca e reproduzi-la com facilidade.

## Positioning

O foco confirmado é uma biblioteca local para consumo pessoal de áudio e vídeo, acompanhada de downloads simples. O produto reúne download, organização, conversão e reprodução no aplicativo desktop.

Um diferencial competitivo exclusivo não foi definido. Não apresentar essa combinação como exclusiva, nem inventar comparações ou vantagens sobre outros produtos.

## Operating Context

- Aplicativo pessoal para Windows, com interface em português e contas de serviços opcionais, conforme confirmado pelo usuário.
- O fluxo central parte da biblioteca local: ouvir, assistir, encontrar e organizar mídia. Downloads são uma forma de adicionar conteúdo.
- O fluxo implementado de download permite colar um link, escolher conteúdo e formato, revisar e acompanhar a fila.
- Arquivos locais também podem ser importados ou convertidos; playlists locais organizam coleções da biblioteca.
- Várias pastas de mídia podem ser verificadas recursivamente. Trocar o destino de downloads pede uma decisão sobre continuar buscando na pasta anterior. Arquivos ausentes mantêm seu registro e oferecem localização ou novo download quando há uma origem registrada; a recuperação preserva favoritos e playlists.
- A reprodução possui player recolhido e expandido. O aplicativo documenta retomada da última faixa, posição e volume.
- Análise de links, downloads, busca remota de letras e integrações dependem dos respectivos serviços; biblioteca local não equivale a uma promessa de que todos os recursos funcionam offline.

## Capabilities and Constraints

As capacidades abaixo constam no código e na documentação atuais. São evidências da implementação, não uma validação de funcionamento de cada serviço externo.

- Biblioteca, fila de downloads, histórico, configurações e playlists locais persistidos em SQLite.
- Downloads por yt-dlp, com análise de formatos disponíveis e seleção de itens de playlists. A disponibilidade depende da publicação e do suporte da fonte.
- Conversão de arquivos locais e extração de áudio por FFmpeg, preservando o original. Arquivos protegidos por DRM não são uma capacidade suportada.
- Reprodução local de áudio e vídeo, fila, busca, aleatório, repetição, transição entre músicas e normalização opcional de volume.
- Letras locais em arquivos LRC e consulta ao LRCLIB, incluindo letras sincronizadas quando disponíveis.
- Integrações opcionais com YouTube, Spotify e Discord. Spotify é usado para reprodução e playlists da conta, sem downloads de conteúdo do Spotify.
- Downloads devem se limitar a conteúdo que o usuário tenha direito ou autorização para baixar, conforme a documentação existente.
- O renderer depende da API `window.orbe` fornecida pelo preload do Electron. Não presumir que abrir a interface em um navegador comum disponibiliza as funções do aplicativo.
- Preservar a separação entre renderer e processo principal: API nomeada do preload, IPC validado, isolamento de contexto e acesso controlado a arquivos e processos externos.

## Brand Commitments

Nome existente: Orbe. Idioma confirmado da interface: português; o documento HTML atual usa `pt-BR`.

Nome escolhido: Orbe. Identidade com símbolo de órbita simples em coral, superfícies grafite e tipografia Plus Jakarta Sans. Aplicativo e landing page compartilham marca e tokens em `packages/brand`. A biblioteca pessoal é o centro da proposta; downloads, conversão e integrações apoiam esse uso.

## Evidence on Hand

- `README.md`: capacidades documentadas, instruções de uso, instalação no Windows e limites das integrações.
- `docs/architecture.md`: arquitetura Electron, persistência, serviços e fronteiras de segurança.
- `src/renderer/app/`: interface existente, incluindo biblioteca, downloads, conversão, playlists, integrações e players.
- `src/renderer/stores/navigation.ts`: páginas e navegação atuais.
- `src/main/` e `src/shared/contracts/`: serviços e contratos implementados.
- `resources/orbe.svg`, `resources/icon.ico` e `src/renderer/assets/orbe.png`: ativos de identidade existentes.
- `tests/e2e/`: cenários de verificação do aplicativo; sua presença não comprova que foram executados nesta inicialização.

Não foram fornecidos depoimentos, métricas de adoção, benchmarks ou estudos de caso para sustentar alegações comerciais.

## Product Principles

1. Priorizar ouvir e assistir à biblioteca pessoal nas decisões do produto.
2. Tornar simples o caminho entre adicionar uma mídia e reproduzi-la.
3. Manter o uso da biblioteca local independente de conexão a contas externas.
4. Apresentar escolhas de mídia e formato em linguagem compreensível em português.
5. Preservar os arquivos pessoais e comunicar com clareza o estado das operações.

## Open Decisions

- Diferencial competitivo e posicionamento comercial além do uso pessoal confirmado.
- Requisitos específicos de acessibilidade e um eventual padrão formal de conformidade. A implementação atual contém recursos como foco visível e tratamento de movimento reduzido; isso não estabelece conformidade auditada.
- A base de portabilidade Linux, os alvos AppImage/DEB e o workflow de CI estão preparados; a execução e distribuição Linux ainda precisam ser validadas em Linux. Outros sistemas e idiomas não foram definidos.
