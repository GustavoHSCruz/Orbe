---
target: "Interface principal do Clipora: início, biblioteca, player e downloads"
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:F:\\projects\\Clipora\\src\\renderer\\app\\App.tsx"
target_fingerprint: "sha256:b92bf3d60106e9c6289197d81f7749597ba113267fe8b07a7e585ad582ff5123"
target_path: "F:\\projects\\Clipora\\src\\renderer\\app\\App.tsx"
timestamp: 2026-10-07T13-42-06Z
slug: src-renderer-app-app-tsx
closed: true
---
Method: dual-agent (A: /root/design_review · B: /root/detector_review)

**O Clipora já funciona visualmente como uma biblioteca pessoal. A maior oportunidade é tornar a experiência tão previsível quanto a apresentação.** Capas, favoritos e o player dão protagonismo à mídia; busca, primeiro uso e recuperação de falhas ainda atrapalham esse objetivo.

A identidade é coerente nos temas claro e escuro. O player expandido, com cores da capa e letras sincronizadas, é o ponto mais característico. A home ainda usa frases genéricas de um serviço musical e representa pouco os vídeos que o produto também reproduz.

**Saúde do design: 24/40 — aceitável, com melhorias importantes.** Avaliação heurística, não certificação de acessibilidade.

| Heurística | Nota /4 | Principal observação |
|---|---:|---|
| Visibilidade do estado | 2 | Bom progresso de downloads; falha da biblioteca pode parecer coleção vazia. |
| Linguagem do usuário | 3 | Ações claras; alguns erros expõem termos técnicos. |
| Controle e liberdade | 2 | Há cancelar e voltar; foco dos modais e saída do onboarding são incompletos. |
| Consistência | 2 | Aparência coerente, mas a busca redefine filtros silenciosamente. |
| Prevenção de erros | 3 | Revisão do download e confirmação antes de excluir arquivos. |
| Reconhecimento | 3 | Capas, recentes e navegação textual ajudam. |
| Eficiência | 2 | Atalhos e filtros existem; organização em lote e persistência de visualização faltam. |
| Estética e minimalismo | 3 | Boa hierarquia; buscas duplicadas e pouco espaço na janela compacta. |
| Recuperação de erros | 2 | Algumas telas oferecem tentar novamente; outras confundem erro e vazio. |
| Ajuda e documentação | 2 | Explicações de formatos e README; ajuda e atalhos pouco descobríveis no app. |
| **Total** | **24/40** | **Nenhum P0 demonstrado; dois P1.** |

**O que funciona**

- Capas, favoritos e retomada colocam a coleção no centro da experiência.
- O player expandido mantém foco na reprodução e no verso atual, inclusive na captura compacta.
- O download distingue progresso, processamento e conclusão, terminando com uma ação útil para reproduzir. Essa parte foi examinada no código e em capturas anteriores.

**Cinco prioridades**

1. **[P1] Diálogos sem gestão completa do foco.** Há `aria-modal` e Escape, mas falta conter Tab, isolar o fundo e devolver o foco de forma consistente. Abrir Novo download sobre o player também deixa listeners de Escape concorrentes. Para quem usa teclado, o contexto pode escapar para trás da janela. Padronizar um diálogo com foco inicial, fundo inerte, retorno ao acionador e Escape apenas na camada superior. Evidência de código: `App.tsx:343,1327` e `ExpandedPlayer.tsx:165`; não validado com leitor de tela. **Comando: `$impeccable harden`.**

2. **[P1] Falhas podem aparentar perda da biblioteca.** `LibraryPage.tsx` usa dados vazios como fallback e não trata `library.isError`; após uma falha inicial, pode exibir “Sua coleção começa aqui”. A consulta de onboarding também pode permanecer em “Abrindo Clipora...” quando falha. Separar carregamento, erro, coleção vazia e busca sem resultados; preservar dados anteriores e oferecer Tentar novamente. **Comando: `$impeccable harden`.**

3. **[P2] Buscar desfaz o filtro escolhido.** A captura da biblioteca mostra duas buscas simultâneas. Ambas compartilham estado, e `stores/navigation.ts:36` redefine o filtro para “Todas” ao digitar. Buscar dentro de Favoritos ou Vídeos passa a procurar na coleção inteira. Preservar filtros na busca local e tornar o escopo global explícito; eliminar a duplicação visual quando não agregar função. **Comando: `$impeccable clarify`.**

4. **[P2] O primeiro uso prepara downloads antes da primeira reprodução.** O onboarding exige boas-vindas, pasta e aviso sobre contas; “Pular” só aparece no último passo. Na home vazia, “Adicionar músicas” apenas leva à biblioteca. Oferecer importação direta de músicas e vídeos, alternativa por link e opção de pular desde o início. Pedir a pasta quando houver um download. Evidências: `Onboarding.tsx`, `ListeningHome.tsx` e `home-empty.png`. **Comando: `$impeccable onboard`.**

5. **[P2] A janela compacta sacrifica a escolha da próxima mídia.** Na captura em 1024×700, o hero e o player em duas linhas ocupam grande parte da altura, cobrindo boa parte da estante no primeiro enquadramento. A rolagem permite acesso, portanto não é bloqueio. Reduzir a altura do hero e reorganizar o player para janelas baixas, preservando legibilidade e áreas de interação. **Comando: `$impeccable adapt`.**

**Carga cognitiva e jornada**

Carga moderada: três falhas no checklist de oito itens — foco da home vazia, grupos extensos e excesso de escolhas periféricas. “Ferramentas” reúne cinco destinos. Isso não torna cinco capas um problema: reconhecer mídia é diferente de processar controles.

A jornada começa com configuração antes da recompensa, melhora com a reprodução e alcança seu melhor momento no player expandido. A conclusão do download fecha bem o ciclo. A importação local merece confirmação igualmente clara: quantos arquivos entraram e como começar a reproduzir.

**Personas e detalhes menores**

- **Jordan, primeira utilização:** precisa atravessar configuração e navegação antes de importar o primeiro arquivo.
- **Alex, uso frequente:** perde o filtro ao buscar e a preferência por grade/lista ao remontar a tela; atalhos são pouco visíveis.
- **Sam, teclado e baixa visão:** encontra risco de foco fora dos diálogos, ações secundárias pequenas e metadados discretos. Contraste e leitor de tela não foram medidos.

Ajustes menores: traduzir os valores internos `off/all/one` no nome acessível de repetição; nomear o botão de escolher pasta; adequar “Ouvir agora” quando o destaque for vídeo. A exclusão de arquivo já possui confirmação nativa — não é uma operação sem proteção.

**Detector e evidências**

O scan estático encontrou **11 alertas de uma regra, em cinco arquivos**: `ai-color-palette`. Localizações: `App.tsx:205,1600,1755,1781,1857`; `ConverterPage.tsx:325`; `ExpandedPlayer.tsx:276`; `LocalPlaylistsPage.tsx:137,231`; `Onboarding.tsx:51,62`.

**Nenhum defeito de paleta violeta foi confirmado por esses alertas.** O CSS remapeia tokens violet para rosa e substitui alguns fundos; as capturas confirmam o resultado efetivo. Os alertas não justificam trocar a identidade visual.

Foram inspecionadas sete capturas atuais de Electron com mídia sintética, além de fonte e capturas históricas de downloads. Não houve avaliação manual com leitor de tela, contraste medido, zoom de 200% ou biblioteca grande.

**Questões para orientar a próxima etapa**

1. Começar por **confiabilidade e teclado**, **busca e filtros** ou **primeiro uso**?
2. Tratar **as cinco prioridades**, **somente os dois P1** ou **os três primeiros itens**?

Depois das correções escolhidas, finalizar com `$impeccable polish`.
