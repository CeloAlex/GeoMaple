# GeoMaple (SGCIM) — Roteiro de Testes

Checklist para validar o sistema em https://geomaple.up.railway.app antes do release
final. Marque cada item conforme for testando. Sempre que o resultado esperado não
acontecer, anote: o que você fez, o que esperava, o que aconteceu de fato (idealmente com
print de tela).

Veja `docs/FUNCIONALIDADES.md` para entender cada módulo em detalhe, e
`docs/PRIMEIRO_ACESSO.md` para os passos de criação de conta/primeiro login.

---

## 0. Acesso e conta

- [ ] Recebi login e senha temporária de um administrador (não uso a conta `admin`
      compartilhada).
- [ ] Consigo acessar https://geomaple.up.railway.app e a tela de login carrega
      corretamente (logo GeoMaple visível, nome do município "Ouro Preto/MG" na tela).
- [ ] Ao logar pela primeira vez com a senha temporária, sou obrigado a definir uma senha
      nova antes de continuar (tela "Troca de senha obrigatória").
- [ ] Depois de definir a senha, sou levado direto para o mapa principal, já autenticado.
- [ ] Login com senha errada 5 vezes seguidas bloqueia a conta (peça a um administrador
      para verificar em Gestão de Usuários que o status mudou para "Inativo", e reative
      antes de continuar os testes).
- [ ] "SGCIM → Sair" desloga e volta para a tela de login.

## 1. Cadastro de imóvel (Cadastro Definitivo)

- [ ] Abro o assistente por `Ctrl+N` **e** pelo botão 🏠 na barra de ferramentas — os dois
      abrem a mesma tela.
- [ ] **Etapa 1 (Inscrição)**: preencho Distrito/Setor/Quadra/Lote/Unidade e vejo a
      inscrição completa montada em tempo real (ex.: `03.01.042.0036-001`).
- [ ] Repito a mesma inscrição completa de um imóvel já cadastrado → sistema bloqueia com
      aviso de duplicidade.
- [ ] Cadastro um Distrito.Setor.Quadra.Lote já existente mas com Unidade diferente
      (ex.: uma segunda unidade do mesmo lote) → sistema avisa "terreno já cadastrado
      encontrado" e **pré-preenche** o polígono e o endereço nas etapas seguintes.
- [ ] **Etapa 2 (Localização)**: preencho logradouro, número, bairro, CEP.
- [ ] **Etapa 3 (Geometria)**: desenho o polígono do terreno clicando no mapa (mínimo 3
      pontos) e a área calculada aparece automaticamente. Testo também desenhar a
      delimitação da edificação (opcional).
- [ ] **Etapa 4 (Dados cadastrais)**: preencho proprietário (obrigatório), uso, status,
      áreas cadastrais, nº de pavimentos, fração ideal. Informo uma área cadastral bem
      diferente (>10%) da área calculada no mapa → aparece aviso de divergência.
- [ ] Preencho os campos SINTER/CADURB (tipo de imóvel, tipo arquitetônico, ano de
      construção quando aplicável) — ao escolher "territorial" como tipo, os campos de
      arquitetura/ano ficam desabilitados automaticamente (não se aplicam a terreno sem
      construção).
- [ ] **Etapa 5 (Revisão)**: confiro os dados e salvo. O imóvel aparece no mapa na
      localização correta, com a cor/estilo esperado para o status escolhido.

## 2. Edição de imóvel existente

- [ ] Clico em um imóvel no mapa (ou busco e seleciono) → abre o painel de detalhe com os
      dados cadastrados.
- [ ] Edito um dado cadastral (ex.: proprietário) e salvo → a mudança persiste (recarrego a
      página e confiro).
- [ ] Edito a geometria do polígono (fora do assistente) e salvo → área recalculada
      corretamente.
- [ ] Excluo um imóvel de teste (criado só para este teste) e confirmo que ele some do mapa
      e da busca.

## 3. Unidades Autônomas (UA)

- [ ] Abro um imóvel "pai" (que ainda não é ele mesmo uma UA de outro) → vejo o botão
      "🏢 Unidades Autônomas".
- [ ] Crio uma UA nova → geometria do terreno aparece herdada automaticamente (mesmo
      polígono do pai), preencho proprietário/área privativa/fração ideal e salvo.
- [ ] Crio uma segunda UA com a mesma inscrição da primeira → sistema bloqueia duplicidade.
- [ ] Edito e depois excluo uma UA de teste.

## 4. Quadras Georreferenciadas

- [ ] Abro "🗂️ Quadras", crio uma quadra nova com Distrito/Setor/Quadra e desenho o
      polígono no mapa.
- [ ] Tento criar outra quadra com o mesmo Distrito+Setor+Quadra → bloqueio de duplicidade.
- [ ] A camada de quadras aparece no mapa (contorno tracejado dourado) e o toggle de
      camada liga/desliga a visibilidade.

## 5. Delimitações Provisórias

- [ ] Abro por `Ctrl+D` e pelo botão 🚧 — mesma tela nos dois casos.
- [ ] Crio uma delimitação provisória do tipo "Levantamento de campo", com e sem desenhar
      um polígono (o polígono é opcional aqui, diferente do Cadastro Definitivo).
- [ ] Edito o status de uma delimitação provisória de teste e excluo ao final.

## 6. Integração SINTER/CADURB

- [ ] Abro a transmissão SINTER de um imóvel cadastrado → a **prévia do payload** e a
      validação de campos obrigatórios aparecem normalmente.
- [ ] Clico em transmitir → recebo uma mensagem de erro dizendo que a integração SINTER não
      está configurada. **Isso é esperado neste ambiente de teste — não reporte como
      bug.**

## 7. Busca e ferramentas de mapa

- [ ] Busco um imóvel por inscrição, depois por proprietário, depois por trecho do
      endereço — os três encontram o registro esperado.
- [ ] Uso os filtros rápidos de status (Regular/Em fiscalização/Para revisão) na busca.
- [ ] Busco um endereço que não é de nenhum imóvel cadastrado (ex. uma rua qualquer de Ouro
      Preto) → sistema oferece buscar como endereço real e centraliza o mapa lá.
- [ ] Meço uma distância e uma área com a régua.
- [ ] Capturo um ponto georreferenciado por clique no mapa e confiro a conversão entre
      DD/DMS/UTM.
- [ ] Colo uma lista de coordenadas e confirmo que um polígono é criado a partir delas.
- [ ] Alterno o sistema de coordenadas exibido na barra inferior (DD/DMS/UTM).
- [ ] Imprimo o mapa (`Ctrl+P`) e confiro se o layout de impressão está correto.

## 8. Importação e Exportação

- [ ] Importo um arquivo KML ou GeoJSON de teste → a camada aparece no mapa como
      referência visual.
- [ ] Converto uma feição importada em **Delimitação Provisória** → registro real criado.
- [ ] Converto outra feição importada em **Cadastro Definitivo** → abre o assistente de 5
      etapas com a geometria já preenchida.
- [ ] Exporto KML e GeoJSON de um imóvel selecionado.
- [ ] Exporto CSV dos imóveis visíveis no mapa e confiro os dados no arquivo baixado.

## 9. Catálogo GeoNetwork

- [ ] Abro o catálogo GeoNetwork e consulto um servidor WMS (peça ao administrador a URL de
      referência usada nos testes anteriores, ex. o GeoServer de Ouro Preto).
- [ ] Filtro as camadas por um termo de busca — se não encontrar uma camada esperada,
      tento o termo em inglês (ex. "ortho") antes de reportar.
- [ ] Adiciono uma camada ao mapa pelo catálogo e confirmo que ela renderiza (muda o que
      aparece no mapa).
- [ ] Removo a camada adicionada.
- [ ] Testo também "Adicionar WMS manualmente" informando URL e nome técnico da camada
      diretamente.

## 10. Trilha de Auditoria

- [ ] Abro "Minha atividade" e vejo meu próprio histórico de ações (login, cadastros
      feitos etc.).
- [ ] Abro o histórico de um imóvel específico (aba "Histórico" no painel de detalhe) e
      vejo as alterações que fiz nele, com comparação do antes/depois.
- [ ] **Se eu for administrador**: abro a auditoria completa, filtro por usuário/ação/
      período, e exporto em CSV.

## 11. Gestão de Usuários (só se sua conta for Administrador)

- [ ] Crio um operador de teste com perfil "Leitor", confirmo que a senha temporária
      aparece uma única vez.
- [ ] Edito o operador de teste (nome, setor).
- [ ] Resetar a senha do operador de teste → nova senha temporária gerada.
- [ ] Desativo o operador de teste → confirmo que ele não consegue mais logar.
- [ ] Reativo o operador de teste.
- [ ] Confirmo, logado como "Leitor", que não consigo criar/editar/excluir nada (só
      visualizar) — tente cadastrar um imóvel ou editar um existente e confirme que a ação
      é bloqueada.

---

## Itens que NÃO devem ser testados nesta rodada

Estes itens existem no menu mas não são funcionalidades reais desta versão — não é
necessário (nem possível) testá-los; ver `docs/FUNCIONALIDADES.md` para o motivo:

- Importação de planilha em massa (Excel/CSV)
- Relatórios de "Duplicidades cadastrais" e "Consistência por quadra"
- Ajuste/snap topológico entre polígonos vizinhos ao desenhar
- Transmissão real ao SINTER (vai dar erro esperado de integração não configurada — ver
  seção 6 acima)
