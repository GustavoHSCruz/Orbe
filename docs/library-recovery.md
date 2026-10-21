# Pastas e recuperação da biblioteca

Em **Configurações → Pastas de mídia**, adicione quantas pastas precisar (até 100 adicionais). O Orbe busca arquivos de áudio e vídeo em subpastas ao iniciar e a cada 45 segundos; **Verificar agora** força uma atualização. A pasta de downloads atual sempre participa da busca. Links simbólicos e junções não são percorridos.

Ao mudar a pasta de downloads, a interface pede uma decisão antes de permitir salvar:

- **Continuar buscando na pasta anterior:** mantém o antigo destino como uma pasta de mídia adicional.
- **Parar de buscar na pasta anterior:** deixa de importar arquivos novos dali. Os arquivos, itens da biblioteca, favoritos e playlists existentes são preservados.

Se um arquivo deixar de estar acessível, ele continua listado. O aviso não presume que foi excluído: pode ter sido movido ou estar em uma unidade desconectada. Falhas de permissão são identificadas separadamente.

## Localizar

**Localizar arquivo** permite escolher o arquivo que corresponde ao item ausente. **Localizar pasta** aponta para a nova localização da pasta antiga e procura os mesmos caminhos relativos. O Orbe não escolhe automaticamente entre arquivos com o mesmo nome em pastas diferentes. Apenas os caminhos dos itens recuperados são atualizados: seus IDs, favoritos, contagens de reprodução e vínculos com playlists permanecem.

## Baixar novamente

Esta opção aparece somente se o item está ausente e mantém um download de origem registrado, com formato conhecido. Ela cria um download na pasta de destino atual. Quando ele termina, o mesmo item da biblioteca é atualizado com o novo caminho. Uma falha de rede ou formato não apaga o item original; a tentativa pode ser repetida. Se o histórico de origem foi removido, ainda é possível localizar o arquivo ou preparar um novo download pelo link.

Para arquivos importados do computador, o Orbe oferece a localização, sem inventar uma origem remota. Durante a recuperação, o progresso pode ser acompanhado em **Downloads**.

## Remover

**Parar de buscar** remove apenas a pasta da verificação automática. **Remover registro** pede confirmação e remove o item da biblioteca e das playlists. Essas ações não apagam arquivos do computador.

## Evidências de validação

Os testes cobrem pastas sobrepostas, subpastas, troca de destino, arquivos ausentes, preservação de identidade/favoritos/playlists, falha e repetição do download de recuperação, bloqueio de links simbólicos e o fluxo real de interface. Protótipos com dados de teste estão em `.impeccable/review/folders/`, incluindo `missing-files.png` e `directory-choice.png`.
