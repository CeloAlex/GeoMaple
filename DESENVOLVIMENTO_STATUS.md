# GeoMaple · SGCIM — Status de Desenvolvimento

> **Este arquivo é a fonte de verdade sobre o progresso do projeto.** Sempre que o
> desenvolvimento for retomado (nova sessão, outra máquina, outro desenvolvedor ou
> assistente), leia este arquivo primeiro para saber exatamente onde parou.
>
> Atualizar este arquivo ao final de cada etapa concluída — não deixar para depois.

Referências do projeto: `INICIO_DESENVOLVIMENTO.md` (sequência de prompts original),
`PROMPT_GEOMAPLE_MVP.md` (especificação completa, seções numeradas), `SGCIM_v10.html`
(protótipo de referência viva — nunca editar, só consultar).

---

## 1. Decisões fixadas nesta fase (não reabrir sem pedir confirmação)

- **Multi-município:** modo "config por implantação". Nada no código fica fixo em Ouro
  Preto — tudo vem de variáveis de ambiente (`MUNICIPIO_NOME/UF/IBGE/CENTRO_*` no backend,
  expostas via `GET /api/config` público). Continua sendo **1 banco = 1 prefeitura por
  vez** (não é multi-tenant). Se um dia precisar atender várias prefeituras no mesmo
  banco/deploy, isso é uma mudança de arquitetura maior — decisão explícita do usuário
  quando chegar a hora, não assumir.
- **Imagens de satélite:** manter Esri World Imagery gratuito + mitigar. Adicionado
  seletor de camada base (Esri satélite / OpenStreetMap) e `maxNativeZoom` correto, para
  quando a imagem de satélite não tiver cobertura de alta resolução naquele ponto
  ("Map data not yet available" — limitação do provedor gratuito, não bug do app; o
  próprio protótipo tem a mesma limitação).
- **"Google Earth" do protótipo:** confirmado que no HTML original é só `window.open()`
  para links públicos do Google Maps/Street View (sem chave de API, sem custo). Reimplementado
  fielmente assim no app real — não requer Google Maps Platform.
- **Ordem de prioridade da lista de pendências** (definida pelo usuário em 2026-07-23):
  1. UI de Unidades Autônomas + Quadras georreferenciadas
  2. Busca + árvore hierárquica + toggle de camadas no mapa principal
  3. Importação/exportação (KML/GeoJSON/CSV) + impressão de ficha cadastral
  4. Painel de operadores + auditoria completa na tela
  5. **Depois de tudo isso:** `git init` + commit (só então) — **antes do Prompt 9** (deploy Railway, que continua **não iniciado** por pedido explícito)
- Trabalhar **de forma gradativa**, com teste real (browser) de cada etapa antes de
  seguir para a próxima, e reportar avanço ao usuário a cada etapa concluída.

---

## 2. Status por Prompt (INICIO_DESENVOLVIMENTO.md)

| Prompt | Descrição | Status |
|---|---|---|
| 1 | Setup (docker-compose, schema Prisma, seed) | ✅ |
| 2 | Autenticação + gestão de operadores (backend) | ✅ |
| 3 | CRUD Imóveis (sem geometria) | ✅ |
| 4 | Geometria PostGIS | ✅ |
| 5 | Unidades Autônomas — backend | ✅ backend · ✅ **UI concluída em 2026-07-23** |
| 6 | Frontend base (login, layout, mapa, tiles, detalhe) | ✅ |
| 7 | Wizard de Cadastro (5 etapas) | ✅ |
| 7b | Gestão de operadores (frontend) | ✅ **concluída em 2026-07-23** |
| 7c | Trilha de auditoria completa | ✅ **concluída em 2026-07-23** |
| 8 | Integração SINTER (CONFIDENCIAL) | ✅ backend + UI (modal de transmissão) |
| 9 | Deploy Railway | ⛔ **não iniciado — aguardando ordem explícita do usuário** |

---

## 3. Cobertura de funcionalidades do protótipo (auditoria de 2026-07-23)

Levantamento original feito por sub-agente lendo `SGCIM_v10.html` por completo e
comparando com o código real. Vai sendo atualizado conforme os itens forem fechados.

| Área funcional | Status em 22/07 | Status atual |
|---|---|---|
| Autenticação | ✅ | ✅ |
| Wizard cadastro 5 etapas | ✅ | ✅ |
| Herança de polígono (mesmo lote) | ✅ | ✅ |
| Delimitação de edificação (no wizard) | ✅ | ✅ |
| **Edição de imóvel existente** | ❌ | ✅ **concluído (painel dedicado, ver seção 4)** |
| **Exclusão de imóvel (UI)** | 🟡 (só backend) | ✅ **concluído** |
| **Unidades Autônomas — UI (CRUD, herança)** | 🟡 (só backend) | ✅ **concluído** |
| **Edição de geometria pós-cadastro (fora do wizard)** | ❌ | ✅ **concluído (mesmo painel de edição)** |
| **Quadras georreferenciadas (backend + UI)** | ❌ | ✅ **concluído** |
| **Delimitações provisórias (backend + UI)** | ❌ | ✅ **concluído** |
| **Toggle de camadas do mapa (satélite/OSM/Quadras/Provisórios/Imóveis/importadas)** | ❌ | ✅ **concluído** |
| **Árvore hierárquica Distrito→Setor→Quadra→Imóvel** | ❌ | ✅ **concluído** |
| **Busca (inscrição/endereço/proprietário)** | ❌ | ✅ **concluído** |
| **Filtros rápidos (status: Regular/Fiscalização/Revisão)** | ❌ | ✅ **concluído** |
| **Geocodificação por endereço (Nominatim)** | ❌ | ✅ **concluído** |
| **Ferramenta régua (distância em tempo real)** | ❌ | ✅ **concluído (gesto de fechar linha não reconfirmado após correção de bug — ver log da sessão)** |
| **Import KML/GeoJSON (camada de referência)** | ❌ | ✅ **concluído e testado ponta a ponta** |
| **Export GeoJSON/KML (imóvel) / CSV (visíveis)** | ❌ | ✅ **concluído (mecanismo confirmado sem erro; arquivo em disco não verificável neste ambiente)** |
| **Impressão de ficha cadastral** | ❌ | ✅ **concluído (diálogo nativo de impressão confirmado abrindo — recomendo conferência manual do layout)** |
| Topologia (snap entre polígonos vizinhos) | ❌ | ❌ **fora do escopo do MVP por ora — ver justificativa na seção 4** |
| **GeoNetwork / WMS externo** | ❌ | ✅ **concluído (camada WMS genérica configurável pelo operador — ver seção 4)** |
| **Google Maps / Street View (links reais)** | ❌ | ✅ **concluído** |
| Tiles de satélite | ✅ | ✅ |
| **SINTER/CADURB (payload, transmissão, preview)** | ❌ | ✅ **concluído** |
| Gestão de usuários — backend | ✅ | ✅ |
| **Gestão de usuários — painel de operadores** | ❌ | ✅ **concluído** |
| **Auditoria — backend completo** | 🟡 | ✅ **concluído (diff em Imovel/User; outros serviços com log resumido)** |
| **Auditoria — UI (trilha, diff, histórico por imóvel, minha atividade)** | ❌ | ✅ **concluído** |

---

## 4. Backlog priorizado (ordem confirmada pelo usuário)

### Fase 1 — UA + Quadras — ✅ CONCLUÍDA (2026-07-23)
- [x] UI de Unidades Autônomas: `frontend/src/components/UA/` (`UAModal.tsx`, `UAForm.tsx`, `types.ts`),
      acoplada ao `DetailPanel.tsx` (botão "🏢 Unidades Autônomas", só quando `parentId == null`).
      Testado no browser: criar, editar, excluir (com confirmação inline, não `window.confirm`),
      detecção de duplicidade.
- [x] Backend de Quadras (não existia nenhuma rota antes): `backend/src/services/quadraService.ts`,
      `backend/src/routes/quadras.ts` — CRUD completo, geometria via PostGIS raw SQL.
      Testado via curl: criar, duplicidade (409), editar, excluir.
- [x] UI de Quadras: `frontend/src/components/Quadras/` (`QuadrasPanel.tsx`, `QuadraForm.tsx`),
      botão "🗺️ Quadras" na Sidebar. Reaproveita um componente novo e genérico de desenho de
      polígono único (`frontend/src/components/Map/SinglePolygonDraw.tsx` +
      `geoDrawUtils.ts`, extraído do `Wizard/GeoDrawLayer.tsx`) — **reutilizar este componente
      para Provisórios na Fase 3**, não duplicar a lógica de desenho.
- [x] Camada das quadras no mapa principal (dourado, tracejado, com toggle via LayersControl)
      — testado no browser, on/off funcionando.

### Fase 2 — Busca + árvore hierárquica + camadas — ✅ CONCLUÍDA (2026-07-23)
- [x] Busca por inscrição, endereço ou proprietário: backend `GET /api/imoveis?q=` (OR
      insensitive em insc/log/prop, limitado a 50 resultados), componente
      `Sidebar/Busca.tsx` com debounce de 300ms e dropdown de resultados. Testado no
      browser: digitar "Souza" retorna os 2 imóveis certos, clicar centraliza o mapa e
      abre o painel de detalhe.
- [x] Árvore hierárquica Distrito → Setor → Quadra → Imóvel: `Sidebar/ArvoreHierarquica.tsx`,
      monta a árvore no cliente a partir de `GET /api/imoveis` (sem filtro de bbox) usando
      `parseInscricao`. Testada no browser: expandir 3 níveis, clicar numa folha faz o
      mesmo fluxo de voo + seleção da busca.
- [x] `MainLayout.tsx` ganhou `selecionarImovel()` compartilhado por Busca e Árvore: busca
      `GET /api/imoveis/:id/geometria`, monta o `ImovelFeature` e centraliza o mapa
      (`MapView` ganhou prop `voarPara` + componente interno `Voador` com `map.flyTo`).
      Mostra aviso não-bloqueante se o imóvel ainda não tem polígono.
- [x] Camada "Imóveis" também virou toggle no `LayersControl` (antes só Quadras tinha).
- [x] Ferramenta Régua (`Map/Regua.tsx`): usa o handler `L.Draw.Polyline` do leaflet-draw
      com `showLength:true` — tooltip de distância em tempo real confirmado no browser
      ("274 m" durante o desenho). Botão flutuante no mapa, resultado fica na tela até
      "✕ Limpar".
  - **Achado corrigido durante o teste:** finalizar a linha por duplo-clique conflitava
    com o zoom-por-duplo-clique nativo do Leaflet (o mapa dava zoom em vez de só fechar a
    linha) — um bug real de UX, não só da automação de teste. Corrigido chamando
    `map.doubleClickZoom.disable()`/`.enable()` ao entrar/sair do modo de medição
    (`L.Draw.Event.DRAWSTOP` cobre cancelamento também). **Não confirmei visualmente o
    gesto final de fechar a linha após o fix** (automação de clique ficou instável de novo,
    mesmo padrão já visto ao desenhar polígonos) — o cálculo de distância e a integração
    com leaflet-draw usam o mesmo padrão já validado em `GeoDrawLayer`/`SinglePolygonDraw`,
    então a confiança é alta, mas vale um clique manual de confirmação quando puder.
- [x] `utils/geo.ts` novo (`centroidePoligono`) — usado por `DetailPanel` e `MainLayout`,
      elimina duplicação que existia antes só no `DetailPanel`.

### Fase 3 — Import/export/impressão — ✅ CONCLUÍDA (2026-07-23)
- [x] Delimitações Provisórias — backend do zero (`provisorioService.ts`, `routes/provisorios.ts`,
      tipos/status iguais ao protótipo). UI em `components/Provisorios/` (mesmo padrão de
      Quadras), reaproveitando `SinglePolygonDraw` como planejado. Testado no browser:
      criar, excluir com confirmação inline. Camada laranja tracejada no mapa com toggle.
- [x] Exportar GeoJSON/KML do imóvel selecionado: botões no `DetailPanel`
      (`utils/exportarImovel.ts`). Mecanismo (Blob + `<a download>`) testado sem exceção;
      **não confirmei o arquivo em disco** porque o perfil do Chrome automatizado não é
      visível pelo meu shell neste ambiente — o padrão é idêntico ao usado no protótipo e a
      chamada roda limpa, mas vale uma conferência manual da pasta Downloads.
- [x] Exportar CSV dos imóveis visíveis: botão na Sidebar (`Sidebar/Ferramentas.tsx`),
      `MapView` agora expõe os imóveis carregados via `onDadosCarregados`. Mesma ressalva de
      verificação do item acima.
- [x] Importar KML/GeoJSON: `utils/importarGeo.ts` (GeoJSON nativo + KML por regex, mesma
      abordagem do protótipo), renderiza como camada roxa de referência com auto-fit-bounds.
      **Testado de ponta a ponta com sucesso** usando a ferramenta `file_upload` (evita o
      seletor de arquivo nativo do SO, que trava a automação) — importei um GeoJSON de
      teste, apareceu no mapa, e o botão "limpar" removeu corretamente.
- [x] Impressão de ficha cadastral: `imprimirFichaCadastral()` em `utils/exportarImovel.ts`,
      abre janela nova com tabela de dados + esboço SVG do polígono (não é imagem de
      satélite — é só a forma do lote) + `window.print()`. **Confirmei que o diálogo nativo
      de impressão do SO abre** (a automação travou exatamente como esperado ao encostar
      num diálogo nativo — mesma categoria do `window.confirm`, mas aqui é inevitável: não
      existe alternativa não-nativa para acionar a impressão do navegador). Recomendo um
      teste manual rápido para conferir o layout da ficha.

### Fase 4 — Operadores + auditoria na tela — ✅ CONCLUÍDA (2026-07-23)
- [x] Painel de operadores (`components/Operadores/`): listar (com último acesso, status),
      criar (senha temporária de 12 chars revelada uma única vez em modal com botão copiar),
      editar, ativar/desativar (confirmação inline), resetar senha de outro operador.
      Backend já existia por completo desde o Prompt 2 — só faltava a UI.
- [x] Troca de senha obrigatória no primeiro acesso (`pages/TrocaSenhaObrigatoria.tsx`),
      interceptada no `App.tsx` com base em `usuario.primeiroAcesso`. **Testada de ponta a
      ponta com o próprio admin seed** (que tem `primeiroAcesso: true` desde o seed
      original) — funcionou perfeitamente; a senha foi revertida para `Trocar@2025` depois
      do teste para manter a credencial documentada.
- [x] Auditoria completa: `calcDiff()` novo em `auditService.ts`, usado em
      `editarImovel`/`editarUsuario` para gerar diff estruturado antes/depois (os outros
      serviços continuam com log resumido — retrofit total ficaria desproporcional ao
      valor para esta fase). Rotas novas: `GET /api/auditoria/imovel/:id`,
      `GET /api/auditoria/user/:id`, `GET /api/auditoria/export` (CSV), filtro por
      `entidade`/`de`/`ate` na listagem principal.
- [x] `components/Auditoria/`: `AuditoriaPanel.tsx` (tabela paginada, filtros, export CSV,
      modal de diff colorido — admin only), `DiffView.tsx` (componente compartilhado do
      diff, cai para JSON bruto quando não há `antes`/`depois` estruturado),
      `HistoricoImovel.tsx` (aba "Histórico" dentro do `DetailPanel`, últimos 10 eventos do
      imóvel), `MinhaAtividade.tsx` (qualquer operador vê só as próprias ações).
- [x] **Tudo testado no browser end-to-end**, incluindo o diff colorido (vermelho=antes,
      verde=depois) renderizando de verdade com dados reais.

### Depois de tudo isso
- [x] Todas as 4 fases do backlog concluídas e testadas — pronto para `git init` + commit
- [x] `git init` + primeiro commit (`c0e68e6`, raiz do repositório em `GeoMaple/`, 121 arquivos,
      `.gitignore` excluindo material confidencial — protótipo, especificação, `files.zip`)
- [ ] **Só então**, se autorizado, Prompt 9 (deploy Railway) — continua não iniciado

### Backlog residual (fora das 4 fases combinadas) — ✅ 6 de 7 concluídos (2026-07-23)
Itens levantados na auditoria de cobertura que não faziam parte da ordem de prioridade
original combinada com o usuário. Endereçados após o commit inicial, em worktree isolado
(`worktree-frolicking-crunching-koala`).

- [x] **1. Edição de imóvel existente** — `frontend/src/components/EditarImovelPanel.tsx`
      (painel novo, não é o wizard). Reaproveita os componentes `Step2Localizacao`,
      `Step3Geo`, `Step4Cadastrais` do wizard fora do fluxo de 5 etapas — carrega o registro
      e a geometria atuais (`GET /api/imoveis/:id` + `/geometria`), monta o formulário
      pré-preenchido, salva via `PUT /api/imoveis/:id` (+ `PUT .../geometria` só se a
      geometria mudou). Testado no browser: editar proprietário, salvar, reabrir por busca
      e confirmar persistência.
- [x] **2. Botão de exclusão de imóvel na UI** — rota `DELETE /api/imoveis/:id` já existia
      (soft-delete, `ativo:false`, bloqueia com 409 se houver Unidades Autônomas ativas
      vinculadas). Botão "🗑️ Excluir" no `DetailPanel.tsx` com confirmação inline (nunca
      `window.confirm`). Testado no browser **os dois caminhos**: exclusão bloqueada (409,
      mensagem do backend exibida corretamente) num imóvel com UA vinculada, e exclusão
      bem-sucedida numa UA folha (confirmado que some da busca depois).
- [x] **3. Edição de geometria fora do wizard** — resolvida pelo mesmo
      `EditarImovelPanel.tsx` do item 1 (reaproveita `Step3Geo`, que já tem o desenho de
      terreno/edificação) — não foi necessário nenhum componente novo.
- [x] **4. Filtros rápidos na busca** — chips de status (Regular/Em fiscalização/Para
      revisão) em `Sidebar/Busca.tsx`, combináveis com o texto já digitado (backend já
      aceitava `st` em `GET /api/imoveis`, só não estava exposto na UI). Testado no
      browser: filtro "Regular" sozinho retorna a lista certa.
- [x] **5. Geocodificação por endereço (Nominatim)** — quando a busca de imóvel não
      encontra nada, aparece um botão "🌍 Buscar '...' como endereço no mapa" que consulta
      `nominatim.openstreetmap.org` (gratuito, sem chave) com o termo + nome/UF do
      município (do `useMunicipioStore`) e centraliza o mapa (`flyTo`) no primeiro
      resultado. Testado no browser com "Praça Tiradentes" → voou corretamente e mostrou
      o endereço completo retornado pelo Nominatim.
- [x] **7. GeoNetwork/WMS externo** — avaliado e decidido que uma integração de catálogo
      GeoNetwork completa não faz sentido para o MVP real sem credenciais/servidor do
      município (fora do que o usuário forneceu). Implementada em vez disso uma forma
      genérica de **adicionar qualquer camada WMS por URL** (`Sidebar/Ferramentas.tsx` →
      "🌐 Adicionar camada WMS", operador informa URL do serviço + nome técnico da layer +
      rótulo de exibição), renderizada via `WMSTileLayer` do react-leaflet e listada no
      `LayersControl` do mapa como qualquer outra camada. Testado no browser com o WMS
      público do IBGE — camada some/aparece na lista, sem erros.
- [ ] **6. Topologia (snap entre polígonos vizinhos ao desenhar)** — **decisão: fora do
      escopo por ora**, não implementado. Motivo: não há plugin de snap instalado
      (`leaflet-draw` não tem isso nativamente); implementar do zero exigiria detecção de
      proximidade de vértices contra todas as parcelas vizinhas carregadas no viewport a
      cada movimento do mouse durante o desenho — complexidade e risco de regressão de
      performance desproporcionais ao valor para o MVP. Revisar com o usuário se isso vira
      prioridade real (ex.: se erros de sobreposição de polígono aparecerem na prática).

---

## 5. Notas técnicas úteis para retomar

- **Backend roda em** `http://localhost:3001` (`cd backend && npm run dev`, usa `ts-node-dev --respawn`).
- **Frontend roda em** `npm run dev -- --port 5183` dentro de `frontend/`.
- **Login de teste:** `admin` / `Trocar@2025` (perfil admin, força troca de senha no primeiro
  acesso — mas o frontend ainda não implementa essa tela, então o login funciona normalmente).
- **Padrão de modal usado em todo o app:** `fixed inset-0 z-[2000] flex items-center
  justify-center bg-black/50 p-4` com card branco `rounded-lg shadow-2xl`. Seguir este
  padrão para os próximos painéis (Provisórios, Operadores, Auditoria) para manter
  consistência visual.
- **Nunca usar `window.confirm`/`window.alert`/`window.prompt`** — trava a aba inteira em
  automação de browser e é uma UX ruim mesmo fora de testes. Usar um estado local de
  confirmação inline (ver `UAModal.tsx` função `confirmarExclusao` como referência).
- **Componentes de desenho de polígono no mapa:**
  - `Wizard/GeoDrawLayer.tsx` — dois polígonos (terreno + edificação), usado só no wizard.
  - `Map/SinglePolygonDraw.tsx` — um polígono genérico, usar para Quadras/Provisórios/
    qualquer coisa nova que precise de "desenhar 1 polígono e me devolver o GeoJSON".
  - Ambos importam funções puras de `Map/geoDrawUtils.ts` (`poligonoParaLatLngs`,
    `layerParaPoligono`, `calcularArea`) — não duplicar essa lógica de novo.
- **Config de município:** `useMunicipioStore` (frontend) busca `GET /api/config` uma vez
  no boot do `App.tsx`. Qualquer texto/coordenada nova que for adicionada à UI deve vir
  daí, nunca hardcoded.
- **Testes ao vivo:** sempre validar no browser real (Chrome via `claude-in-chrome`) além
  de `tsc -b` + `oxlint` + `npm run build`. Dados de teste criados durante validação devem
  ser limpos via API (soft-delete para Imovel, hard-delete para Quadra) ao final.

---

## 6. Log de sessões

### 2026-07-22 — Prompt 7 (Wizard de Cadastro)
Wizard de 5 etapas completo, com herança de polígono por lote, ViaCEP, desenho de
geometria via `leaflet-draw`, campos SINTER no cadastro. Testado end-to-end no browser
com backend/DB reais.

### 2026-07-22/23 — Prompt 8 (SINTER) + multi-município + mitigação de mapa
- `sinterService.ts`: OAuth client_credentials com cache/renovação, mapeamento CADURB,
  retry 3x em 5xx/timeout, auditoria sem dados sensíveis. Rotas `POST /api/sinter/transmitir/:id`
  e `GET /api/sinter/preview/:id`.
- `SinterModal.tsx` no frontend, acoplado ao `DetailPanel`.
- Config de município por variáveis de ambiente + `GET /api/config` + `useMunicipioStore`.
  Removido todo hardcode de "Ouro Preto"/"MG"/coordenadas do centro do mapa em todo o
  frontend e backend.
- Botões reais "Google Maps"/"Street View" (mapa principal e painel de detalhe).
- Seletor de camada base Esri/OpenStreetMap + `maxNativeZoom` para mitigar tiles ausentes.
- Auditoria completa de cobertura do protótipo (tabela na seção 3 deste arquivo).

### 2026-07-23 — Fase 1: UI de Unidades Autônomas + Quadras (backend + UI)
- UI de UA completa (`components/UA/`), testada end-to-end no browser: herança de
  geometria, criação, edição, exclusão, detecção de duplicidade.
- Durante o teste, um `window.confirm()` no fluxo de exclusão travou a aba do browser
  (dialogs nativos bloqueiam CDP e são má UX) — corrigido para confirmação inline antes
  de prosseguir. **Lição registrada na seção 5 para não repetir.**
- Backend de Quadras criado do zero (não existia nada) — service + rotas + testado via curl.
- UI de Quadras completa (`components/Quadras/`), com componente de desenho de polígono
  único extraído para reuso (`Map/SinglePolygonDraw.tsx`).
- Camada de Quadras no mapa principal com toggle, testada no browser (liga/desliga).

### 2026-07-23 — Fase 2: Busca + árvore hierárquica + camadas + régua
- Backend: `GET /api/imoveis?q=` (busca livre insc/log/prop). `listarImoveis` só limita a
  50 resultados quando `q` é usado — a árvore hierárquica precisa da lista completa.
- `Sidebar/Busca.tsx` + `Sidebar/ArvoreHierarquica.tsx`, ambos chamando
  `MainLayout.selecionarImovel()` (busca geometria, monta feature, `flyTo`). Testados no
  browser end-to-end (busca "Souza" → seleção; árvore Distrito 03 → Setor 01 → Quadra 050
  → imóvel → seleção).
- `MapView` ganhou `voarPara`/`Voador`, camada "Imóveis" também virou toggle no
  `LayersControl`, e `Map/Regua.tsx` (ferramenta de medição com `L.Draw.Polyline`).
- **Achado corrigido:** duplo-clique para fechar a linha da régua conflitava com o zoom
  nativo do Leaflet — corrigido com `map.doubleClickZoom.disable/enable`. Distância em
  tempo real confirmada no browser ("274 m"); o gesto final de fechar a linha não foi
  reconfirmado após o fix por instabilidade da automação de clique (mesmo padrão já visto
  com desenho de polígono) — vale um clique manual de confirmação quando possível.
- `utils/geo.ts` (`centroidePoligono`) extraído do `DetailPanel` para reuso.
- Próximo passo: **Fase 3 — Delimitações Provisórias + import/export/impressão**.

### 2026-07-23 — Fase 3: Provisórios + export/import/impressão
- Backend de Provisórios do zero (`provisorioService.ts`, `routes/provisorios.ts`), mesmos
  tipos/status do protótipo (`prov-tipo`/`prov-status`). Testado via curl: criar, validação
  de tipo inválido (400), listar, excluir.
- UI de Provisórios (`components/Provisorios/`) espelhando o padrão de Quadras. Testada no
  browser: criar (sem polígono), excluir com confirmação inline.
- Exportar GeoJSON/KML do imóvel selecionado e imprimir ficha cadastral: botões novos no
  `DetailPanel`, lógica em `utils/exportarImovel.ts`. A ficha abre janela nova com tabela
  de dados + esboço SVG do polígono (não usa tiles de satélite) e chama `window.print()`.
- Exportar CSV dos imóveis visíveis e importar KML/GeoJSON como camada de referência: botões
  na Sidebar (`Sidebar/Ferramentas.tsx`), lógica em `utils/download.ts`/`utils/importarGeo.ts`.
  `MapView` ganhou `onDadosCarregados` (expõe os imóveis carregados) e `camadasImportadas`
  (renderiza como camada roxa, com auto-fit-bounds na mais recente).
- **Import testado de ponta a ponta com sucesso** usando a ferramenta `file_upload` do
  Chrome (evita o seletor de arquivo nativo do SO, que travaria a automação do mesmo jeito
  que `window.confirm`) — GeoJSON de teste apareceu no mapa, "limpar" removeu certo.
- **Achado esperado, não é bug:** o botão "Ficha" abre o diálogo nativo de impressão do
  SO, que travou a automação de teste — mesma categoria de limitação do `window.confirm`
  de antes, mas aqui é inerente ao recurso (não existe forma não-nativa de imprimir a
  partir do navegador). Recomendo conferência manual do layout da ficha impressa.
- **Ressalva de verificação:** os downloads (GeoJSON/KML/CSV) rodam sem exceção mas não
  pude confirmar o arquivo salvo em disco — o perfil do Chrome controlado pela automação
  não é visível pelo meu shell neste ambiente. Vale uma conferência manual rápida.
- Próximo passo: **Fase 4 — Painel de operadores + auditoria completa na tela**. Depois
  disso, `git init` + commit, e só então (se autorizado) o Prompt 9.

### 2026-07-23 — Fase 4: Operadores + auditoria na tela (última fase do backlog)
- Backend de operadores (Prompt 2) já estava 100% pronto — só faltava a UI.
- `calcDiff()` novo em `auditService.ts`; aplicado em `editarImovel` (imovelService) e
  `editarUsuario` (userService) para gerar `{antes, depois}` estruturado. Rotas novas em
  `routes/auditoria.ts`: `/imovel/:id`, `/user/:id`, `/export` (CSV), filtros
  `entidade`/`de`/`ate` na listagem principal. Não-admin só pode consultar a própria
  atividade (`userId` forçado ao próprio id quando não é admin).
- Frontend: `pages/TrocaSenhaObrigatoria.tsx` (interceptada no `App.tsx` via
  `usuario.primeiroAcesso`), `components/Operadores/` (painel completo), `components/Auditoria/`
  (painel admin, diff view compartilhado, histórico no `DetailPanel`, minha atividade).
- **Descoberta real durante o teste:** o admin seed (`admin`/`Trocar@2025`) sempre teve
  `primeiroAcesso: true` desde o Prompt 1 — só não tinha efeito porque a tela de troca
  obrigatória não existia ainda. Testei o fluxo completo com essa conta real (troquei para
  uma senha temporária de teste e depois reverti para `Trocar@2025` via
  `PATCH /api/auth/senha`, que também zera `primeiroAcesso` — logins futuros com essa
  credencial não serão mais interrompidos).
- Tudo testado no browser com dados reais: criar operador (senha de 12 chars revelada uma
  vez), desativar/reativar com confirmação inline, trilha de auditoria com 100 eventos
  reais paginados, diff colorido (vermelho/verde) funcionando de fato, histórico por
  imóvel, minha atividade.
- **As 4 fases do backlog combinado com o usuário estão concluídas.** Próximo passo
  combinado: `git init` + commit (repositório ainda não existe). Prompt 9 (deploy) continua
  não iniciado, aguardando autorização explícita.
- `git init` na raiz de `GeoMaple/` (não em `frontend/`) + primeiro commit `c0e68e6`
  (121 arquivos), `.gitignore` excluindo `SGCIM_v10.html`/`PROMPT_GEOMAPLE_MVP.md`/
  `Protótipo/`/`files.zip` (material confidencial, nunca versionar).

### 2026-07-23 — Backlog residual (6 de 7 itens concluídos)
- Trabalho feito em worktree isolado (`worktree-frolicking-crunching-koala`), a pedido
  explícito do usuário ("Continue com o backlog residual") após o commit inicial.
- Itens 1 e 3 (edição de imóvel + edição de geometria fora do wizard) resolvidos juntos por
  `EditarImovelPanel.tsx`, um painel novo que reaproveita `Step2Localizacao`/`Step3Geo`/
  `Step4Cadastrais` do wizard fora do fluxo de 5 etapas — evitou retrofit do wizard
  create-only para um modo dual create/edit, que seria bem mais custoso.
- Item 2 (botão de exclusão): a rota de backend já existia com soft-delete e bloqueio 409
  quando há UA vinculada — só faltava o botão. Testados os dois caminhos no browser
  (bloqueio 409 e exclusão bem-sucedida).
- Itens 4 (filtros de status) e 5 (geocodificação Nominatim) na `Sidebar/Busca.tsx`; item 7
  (camada WMS genérica por URL) em `Sidebar/Ferramentas.tsx` + `MapView` — todos testados no
  browser com dados/serviços reais (Nominatim público, WMS público do IBGE).
- Item 6 (snap de topologia) avaliado e **deixado fora do escopo por ora** — motivo e
  critério de revisão documentados na seção 4. Não implementado.
- `tsc -b`, `oxlint` e `npm run build` limpos após cada mudança. Todas as funcionalidades
  testadas ao vivo no browser (não só verificação estática).
- Mudanças commitadas no worktree isolado — **ainda não mescladas em `master`**, requer
  ação do usuário (ou pedido explícito) para o merge.
