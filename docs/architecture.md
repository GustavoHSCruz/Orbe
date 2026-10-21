# Arquitetura do Orbe

    React + Zustand + TanStack Query
               │ API nomeada e contratos Zod
               ▼
    Preload isolado ── IPC validado ── Electron Main
                                      ├─ DownloadManager ── MediaProviderRegistry
                                      │                     ├─ YouTube (yt-dlp)
                                      │                     ├─ SoundCloud (yt-dlp)
                                      │                     └─ Genérico (yt-dlp)
                                      ├─ LibraryService ── SQLite/Drizzle
                                      ├─ SettingsService ── SQLite/Drizzle
                                      ├─ GoogleService ── OAuth PKCE/YouTube API
                                      ├─ SpotifyService ── OAuth PKCE/Spotify API
                                      └─ NowPlayingService ── DiscordPresenceProvider

DownloadManager recebe solicitações validadas, confirma o formato na análise atual, persiste a fila e limita downloads simultâneos. Cada provider encapsula análise, formatos e download. O processo externo usa spawn sem shell; a URL é argumento, nunca comando. Downloads interrompidos ao fechar são marcados como falhos e podem ser repetidos.

LibraryService armazena downloads concluídos e arquivos locais importados. O player fica no renderer, separado do estado da fila. O protocolo orbe-media://library/<id> resolve apenas IDs existentes no banco; nenhum caminho arbitrário é aceito do renderer.

NowPlayingService recebe snapshots do player e do Spotify, escolhe a fonte conforme a preferência e limita atualizações de presença. O provider Discord reconecta após falhas, enquanto erros de integração não interrompem o player. OAuth e chamadas externas rodam no main process. Tokens não são expostos em IPC e são gravados por safeStorage quando o sistema permite criptografia.

## Estrutura

    src/main/application/       casos de uso, fila, biblioteca, configurações, now playing
    src/main/domain/            interfaces MediaProvider e PresenceProvider
    src/main/infrastructure/    providers, processo externo, OAuth, Discord
    src/main/database/          schema e conexão SQLite/Drizzle
    src/main/ipc/               handlers e validação de emissor
    src/main/index.ts           janela, protocolo e ciclo de vida Electron
    src/preload/                API restrita para o renderer
    src/renderer/app/           páginas e player
    src/renderer/components/ui/ componente shadcn/ui local
    src/shared/contracts/       schemas Zod e tipos compartilhados
    drizzle/                   migrations versionadas
    tests/e2e/                 fluxos Electron reais
    resources/bin/             binários de mídia verificados

O schema aplicado está em src/main/database/schema.ts e drizzle/. docs/database.sql consolida as migrations existentes para inspeção. TypeScript estrito, ESLint, Vitest/React Testing Library, Playwright e o build do Electron são as verificações do projeto.
