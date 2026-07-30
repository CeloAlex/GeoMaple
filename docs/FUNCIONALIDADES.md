# GeoMaple (SGCIM) — Documentação de Funcionalidades

Sistema de Gestão Cadastral Imobiliária Municipal da Prefeitura de Ouro Preto/MG. Este
documento descreve o que o sistema faz hoje, módulo por módulo, para orientar testes e uso.

> Convenção: itens marcados com **⚠️ Fora do escopo desta versão** aparecem no menu do
> sistema (para manter a mesma organização visual do protótipo original) mas ainda não têm
> funcionalidade real por trás — clicar neles mostra um aviso explicando isso, não é erro.

---

## 1. Login e conta de usuário

- Acesso por **login e senha**. Sessão válida por 8 horas (renovada automaticamente por até
  7 dias sem precisar logar de novo, enquanto o navegador ficar aberto).
- **Toda conta nova (ou senha resetada) exige troca de senha no primeiro acesso** — o
  sistema não deixa continuar sem definir uma senha própria.
- Após **5 tentativas de senha incorreta seguidas**, a conta é bloqueada (só um
  administrador pode reativar, em Gestão de Usuários).
- Três perfis de acesso:
  - **Administrador**: acesso completo, incluindo gestão de usuários e trilha de auditoria
    completa.
  - **Editor**: pode cadastrar, editar e excluir imóveis, unidades autônomas, quadras e
    delimitações provisórias. Não gerencia usuários nem vê a auditoria de outras pessoas.
  - **Leitor**: só consulta (busca, visualiza mapa e fichas). Não pode criar, editar ou
    excluir nada.

## 2. Cadastro de imóvel (Cadastro Definitivo)

Menu **Arquivo → Novo Cadastro Definitivo** (atalho `Ctrl+N`) ou botão 🏠 na barra de
ferramentas. Abre um assistente de 5 etapas:

1. **Inscrição** — número no formato Distrito.Setor.Quadra.Lote-Unidade. Se já existir um
   imóvel cadastrado com o mesmo Distrito.Setor.Quadra.Lote (mesmo terreno, unidade
   diferente), o sistema avisa e **herda automaticamente** o polígono do terreno e os dados
   de endereço nas etapas seguintes (útil para cadastrar várias unidades do mesmo lote). Se
   a inscrição completa já existir, o sistema bloqueia com aviso de duplicidade.
2. **Localização** — endereço (logradouro, número, bairro, CEP).
3. **Geometria** — desenho do polígono do terreno diretamente no mapa (clique para marcar
   vértices), com cálculo automático de área. Também é possível desenhar a delimitação da
   edificação (construção), separada do terreno.
4. **Dados cadastrais** — proprietário, uso (terreno/construído/em construção), status
   (regular/em fiscalização/para revisão), área do terreno e da construção (cadastral,
   informada manualmente), número de pavimentos, fração ideal, observações, e os campos
   técnicos exigidos pela integração SINTER/CADURB (ver seção 5). Se a área
   georreferenciada (calculada no mapa) diferir mais de 10% da área cadastral informada, o
   sistema avisa.
5. **Revisão** — confere tudo antes de salvar.

Depois de salvo, o imóvel aparece no mapa e pode ser reaberto a qualquer momento para
edição completa (dados e geometria) por um painel dedicado, sem precisar refazer o
assistente.

## 3. Unidades Autônomas (UA)

Representa unidades dentro de um mesmo terreno/prédio (ex.: apartamentos de um mesmo
lote) — cada UA é um registro de imóvel vinculado a um "pai" (o terreno principal).
Acessível pelo botão **"🏢 Unidades Autônomas"** no painel de detalhe de um imóvel que
ainda não é, ele mesmo, uma unidade de outro (ou seja, só terrenos "pai" mostram esse
botão). A geometria do terreno é herdada automaticamente do pai; cada UA tem seus próprios
dados (proprietário, área privativa, fração ideal, pavimento etc.). Permite criar, editar
e excluir unidades, com aviso de duplicidade de inscrição.

## 4. Quadras Georreferenciadas

Cadastro de quadras (identificadas por Distrito/Setor/Quadra) com seu próprio polígono no
mapa, exibidas em camada própria (contorno tracejado dourado, com toggle de
visibilidade). Acessível pelo botão **"🗂️ Quadras"** na barra de ferramentas ou barra
lateral. Não permite duas quadras com o mesmo Distrito+Setor+Quadra (bloqueio de
duplicidade).

## 5. Delimitações Provisórias

Para áreas que ainda não viraram cadastro definitivo: **imóvel rural**, **área em
estudo**, **levantamento de campo**, **sem identificação**, **fiscalização** ou **novo
cadastro** — um registro mais simples que um Cadastro Definitivo (não exige inscrição
cadastral nem os campos do CADURB), com um status próprio (em estudo/levantamento/
fiscalização/novo) e um polígono opcional no mapa. Acessível por **Arquivo → Nova
Delimitação Provisória** (`Ctrl+D`) ou botão 🚧. Útil para marcar algo no mapa antes de ter
todos os dados para um cadastro definitivo.

## 6. Integração SINTER / CADURB (Receita Federal)

Permite transmitir os dados cadastrais de um imóvel para o SINTER (sistema da Receita
Federal que integra cadastros imobiliários municipais ao CIB — Cadastro Imobiliário
Brasileiro). Antes de transmitir, o sistema mostra uma **prévia do que será enviado** e
valida se os campos obrigatórios (tipo de imóvel, tipo arquitetônico, ano de construção
etc., conforme as regras do CADURB) estão preenchidos. Depois de transmitido com sucesso,
o imóvel recebe um número de CIB e a data da última transmissão.

> **⚠️ Neste ambiente de teste, a integração real com o SINTER está desativada** (as
> credenciais de acesso são confidenciais e não foram configuradas no ambiente de
> homologação usado para este teste). A prévia/validação do payload funciona normalmente;
> o botão de transmissão de fato retorna um erro esperado ("Integração SINTER não
> configurada nesta implantação") — **isso não é um bug a reportar**.

## 7. Trilha de Auditoria

Registro imutável (não pode ser editado nem apagado) de ações relevantes no sistema:
login, login com falha, troca de senha, criação/edição/desativação de usuário, transmissão
SINTER, entre outras. Três formas de consulta:

- **Auditoria completa** — só administradores veem o histórico de todos os usuários,
  com filtros por usuário, ação, período.
- **Minha atividade** — qualquer usuário vê o próprio histórico.
- **Histórico de um imóvel** — aba dedicada no painel de detalhe de cada imóvel, mostrando
  quem alterou o quê (com comparação campo a campo entre a versão antiga e a nova).

Administradores também podem exportar a auditoria completa em CSV.

## 8. Gestão de Usuários (Operadores)

Exclusivo de administradores — menu **SGCIM → Gerenciar usuários** ou botão 👤. Permite:

- Criar operador (nome, e-mail institucional, login opcional — gerado automaticamente a
  partir do nome se deixado em branco —, perfil, matrícula, setor, telefone). Uma senha
  temporária é gerada e mostrada **uma única vez**.
- Editar dados de um operador existente (não permite trocar o login).
- Resetar a senha de um operador (gera nova senha temporária, mostrada uma vez).
- Ativar/desativar um operador (usuário desativado não consegue mais logar).

Ver `docs/PRIMEIRO_ACESSO.md` para o passo a passo detalhado de criação do primeiro acesso
de um novo usuário.

## 9. Ferramentas de mapa

- **Busca** (barra lateral): por inscrição, endereço ou nome do proprietário, com filtros
  rápidos por status. Se nada for encontrado entre os imóveis cadastrados, oferece buscar o
  termo como **endereço real** (geocodificação via OpenStreetMap/Nominatim), centralizando
  o mapa no local.
- **Árvore hierárquica** Distrito → Setor → Quadra → Imóvel, com toggle de camadas
  (satélite/mapa de ruas/quadras/provisórios/imóveis/camadas importadas).
- **Régua** — distância e área, medindo em tempo real sobre o mapa.
- **Ponto georreferenciado** — captura um ponto por clique no mapa ou por entrada manual de
  coordenadas, com conversão entre graus decimais (DD), graus/minutos/segundos (DMS) e UTM.
- **Colar coordenadas** — cria um polígono a partir de uma lista de coordenadas colada
  (útil para importar pontos de um levantamento de campo sem desenhar manualmente).
- **Sistema de coordenadas** — clique no rótulo "Sistema" na barra inferior do mapa para
  alternar entre DD/DMS/UTM na exibição.
- **Imprimir mapa / ficha cadastral** — impressão nativa do navegador (`Ctrl+P`), com
  layout próprio para impressão (A4).

## 10. Importação e Exportação

- **Importar KML/KMZ/GeoJSON** (botão 📥 na barra lateral): traz uma camada de referência
  visual para o mapa (não vira cadastro automaticamente — ver "Converter importados"
  abaixo).
- **Converter feições importadas em cadastros** (botão 🔄): pega uma feição poligonal de uma
  camada importada e transforma em um registro real — de **Delimitação Provisória**
  (formulário rápido, direto) ou de **Cadastro Definitivo** (abre o assistente de 5 etapas
  com a geometria já preenchida).
- **Exportar** — KML e GeoJSON de um imóvel selecionado; CSV dos imóveis atualmente
  visíveis no mapa (inscrição, proprietário, uso, status, áreas).

## 11. Catálogo GeoNetwork / camadas WMS externas

Permite consultar um servidor de mapas (WMS/GeoServer) externo informando sua URL, listar
as camadas publicadas nele e adicionar qualquer uma ao mapa com um clique (ex.: fotos
aéreas oficiais do município, camadas de outros órgãos). Também é possível adicionar uma
camada WMS manualmente, informando URL e nome técnico da camada diretamente, quando o
servidor não responde ao `GetCapabilities` (consulta automática de camadas disponíveis).

> Há um ponto em investigação nesta funcionalidade envolvendo contagem/filtro de camadas
> em catálogos muito grandes (centenas de camadas) — se o filtro de busca não encontrar uma
> camada que você sabe que existe no servidor consultado, tente o termo em inglês (ex.
> "ortho" em vez de "orto") antes de reportar como problema.

---

## Itens que existem no menu mas **não são funcionalidades reais** nesta versão

Estes itens ficam visíveis para manter a mesma organização do protótipo original, mas
mostram apenas um aviso ao clicar — não é bug:

- **Importar planilha em massa** (Excel/CSV com milhares de registros) — fora do escopo
  desta versão.
- **Duplicidades cadastrais** e **Consistência por quadra** (relatórios) — eram dados
  fictícios fixos no protótipo original, nunca foram uma funcionalidade real a replicar.
- **Ajuste/snap topológico** entre polígonos vizinhos ao desenhar — adiado, não implementado.
