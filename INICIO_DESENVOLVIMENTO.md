# GeoMaple · SGCIM — Guia de Início de Desenvolvimento no VSCode

## Arquivos desta pasta

```
projeto/
├── SGCIM_v10.html              ← Protótipo de referência (NÃO editar — é a especificação viva)
├── PROMPT_GEOMAPLE_MVP.md      ← Contexto completo para o Claude Code (este documento complementa)
└── INICIO_DESENVOLVIMENTO.md   ← Este arquivo
```

---

## 1. Pré-requisitos na sua máquina

```bash
node --version   # >= 20
npm --version    # >= 9
docker --version # para PostgreSQL + PostGIS local
```

Extensões VSCode recomendadas:
- **Claude Code** (Anthropic) — `anthropic.claude-code`
- Prisma
- ESLint
- REST Client (para testar APIs sem sair do VSCode)

---

## 2. Estrutura de pastas a criar

```bash
mkdir geomaple && cd geomaple
mkdir backend frontend
cp SGCIM_v10.html .          # referência
cp PROMPT_GEOMAPLE_MVP.md .  # contexto
```

---

## 3. Como iniciar o Claude Code

### Opção A — Pelo terminal (Claude Code CLI)

```bash
cd geomaple
claude
```

Cole este prompt de arranque:

```
Leia o arquivo PROMPT_GEOMAPLE_MVP.md nesta pasta. Ele contém a especificação
completa do sistema GeoMaple · SGCIM — um sistema de gestão cadastral imobiliária
para a Prefeitura de Ouro Preto, MG.

Comece pelo setup inicial:

1. Crie o docker-compose.yml com PostgreSQL 15 + PostGIS conforme a seção 10 do prompt
2. Crie backend/ com Node.js + Express + TypeScript + Prisma
3. Crie o schema.prisma com os modelos Imovel, User, Quadra e Provisorio conforme seção 4
4. Crie o seed com os 3 usuários demo (camila.silva/sgcim2024, ana.flavia/123456, leitor/123456)
5. Rode: docker compose up -d && cd backend && npx prisma migrate dev --name init && npx prisma db seed

Aguarde minha confirmação antes de avançar para as rotas.
```

### Opção B — Pelo painel lateral do VSCode

Abra o Claude Code (ícone na barra lateral), clique em **New Conversation**, e cole o mesmo prompt acima.

---

## 4. Sequência de prompts recomendada

Execute um de cada vez, aguardando conclusão antes do próximo.

### Prompt 2 — Autenticação + Gestão de Usuários
```
Com o banco rodando, implemente autenticação e gestão de operadores:

Autenticação:
- POST /api/auth/login → retorna access_token (8h) e refresh_token (7d)
  Verificar: usuário ativo, registrar lastLoginAt e IP, bloquear após 5 tentativas falhas
  Se primeiroAcesso=true → retornar flag para forçar troca de senha
- POST /api/auth/refresh
- PATCH /api/auth/senha → trocar senha (requer senha atual)
- Middleware auth.ts que valida Bearer token
- Middleware permission.ts com níveis admin / editor / viewer

Gestão de operadores (seção 14 do PROMPT_GEOMAPLE_MVP.md):
- GET    /api/users          (admin: lista todos; editor/viewer: erro 403)
- POST   /api/users          (admin: cria operador com senha temporária gerada)
- GET    /api/users/:id
- PUT    /api/users/:id      (admin: qualquer campo; próprio: só dados pessoais)
- PATCH  /api/users/:id/senha
- PATCH  /api/users/:id/ativo  (admin only; proteger último admin ativo)
- GET    /api/auditoria        (admin only, paginado)

Seed: apenas 1 admin inicial (login: admin / senha: Trocar@2025 / primeiroAcesso: true).
```

### Prompt 3 — CRUD Imóveis (sem geometria)
```
Implemente as rotas de imóveis sem geometria ainda:
- GET  /api/imoveis  (com filtros: di, se, qu, prop, st)
- POST /api/imoveis  (validar inscrição, detectar duplicata)
- GET  /api/imoveis/:id
- PUT  /api/imoveis/:id
- DELETE /api/imoveis/:id (soft delete ou verificar UAs filhas)
Campos conforme modelo Imovel da seção 4 do PROMPT_GEOMAPLE_MVP.md.
Incluir campos SINTER: cib, cib_status, cib_dt, cadurb_tipo, tp_arq, dest, padrao, ano_constr, valor_venal.
```

### Prompt 4 — Geometria PostGIS
```
Adicione suporte a geometria:
- Campos geom (Polygon, SRID 4326) e geom_bld no modelo Imovel via SQL raw
- Endpoint PUT /api/imoveis/:id/geometria que recebe GeoJSON Polygon
- Endpoint GET /api/geo/bbox?bbox=minLng,minLat,maxLng,maxLat → GeoJSON FeatureCollection
- Calcular AT_GEO via ST_Area(geom::geography) ao salvar
- Ao atualizar geom de um imóvel pai, propagar para todos os filhos (mesmo parentId)
Use a função estArea() do protótipo como referência para validação no frontend.
```

### Prompt 5 — Unidades Autônomas
```
Implemente a hierarquia de Unidades Autônomas:
- GET  /api/imoveis/:id/unidades
- POST /api/imoveis/:id/unidades  (herda geom do pai automaticamente)
- PUT  /api/imoveis/:id/unidades/:uaId
- DELETE /api/imoveis/:id/unidades/:uaId
Regra: parentId aponta para o terreno pai. UAs herdam geom via JOIN, não armazenam própria.
Consulte o modal v10_openUA no SGCIM_v10.html como referência de UX.
```

### Prompt 6 — Frontend base + Tela de Usuários
```
Crie o frontend/ com Vite + React + TypeScript + Tailwind:
- Tela de login (POST /api/auth/login)
- Layout principal: sidebar esquerda + mapa central (Leaflet.js)
- Tiles: Esri World Imagery (mesmo do protótipo)
- Carregar imóveis do GET /api/geo/bbox ao mover o mapa
- Clicar no polígono → painel de detalhe lateral
Cores e identidade: navy #1a3050, verde #4a9c2a, âmbar #c9a227 (ver seção 7 do prompt).
```

### Prompt 7 — Wizard de Cadastro
```
Implemente o wizard de 5 etapas de cadastro conforme o protótipo SGCIM_v10.html:
Step 1: Inscrição (DI.SE.QU.LLLL-UUU) — ao preencher DI.SE.QU.LLLL, verificar se existe
        imóvel com mesma combinação e polígono → se sim, pré-carregar dados e polígono.
Step 2: Localização (logradouro, bairro, CEP com autocomplete ViaCEP)
Step 3: Georreferenciamento (Leaflet.draw, polígono do terreno, opcionalmente edificação)
Step 4: Dados cadastrais incluindo campos SINTER (CIB, tipoImovel CADURB, tpArquitetonico,
        destinação, padrão construtivo, ano construção, valor venal)
Step 5: Revisão e confirmação
```

### Prompt 7b — Gestão de Operadores (frontend)
```
Implemente o painel de gestão de operadores em /admin/usuarios (somente perfil admin):
- Listagem de operadores com status (ativo/inativo), perfil, último acesso
- Formulário de cadastro: nome, e-mail institucional, login (sugerido), matrícula, setor, perfil
- Ao criar: gerar senha temporária de 12 chars, exibir uma vez na tela para o admin copiar
- Ativar/desativar operador (com confirmação; proteger último admin)
- Tela de troca de senha obrigatória no primeiro acesso (interceptada no router)
Consulte seção 14 do PROMPT_GEOMAPLE_MVP.md para todas as regras.
```

### Prompt 7c — Trilha de auditoria completa
```
Implemente a auditoria de operações conforme seção 15 do PROMPT_GEOMAPLE_MVP.md:

Backend:
- Adicionar model Auditoria + enum AcaoAuditoria ao schema.prisma e migrar
- src/middleware/auditoria.ts com registrarAuditoria() e calcDiff()
- Instrumentar TODOS os services para registrar cada operação de escrita
  (imóvel criado/editado/excluído, geometria, SINTER, UA, usuários, quadras, provisórios)
- Endpoints de consulta: GET /api/auditoria (filtros), /api/auditoria/imovel/:inscricao,
  /api/auditoria/user/:login, /api/auditoria/export (CSV)

Frontend:
- /admin/auditoria — tabela filtrável (operador, ação, período, entidade)
  Clique → modal com diff colorido (vermelho=antes, verde=depois)
- /admin/auditoria/imovel/:inscricao — timeline vertical do imóvel
- /perfil/atividade — operador vê apenas as próprias ações
- No painel de detalhe do imóvel no mapa: aba "Histórico" com últimos 10 eventos

Restrição crítica: registros IMUTÁVEIS — nenhum DELETE/UPDATE na tabela Auditoria.
Nunca logar: senha, tokens JWT, client_secret SINTER, CPF completo.
```

### Prompt 8 — Integração SINTER (CONFIDENCIAL)
```
Implemente o serviço de integração com o SINTER/CADURB da Receita Federal.
ATENÇÃO: Esta integração é CONFIDENCIAL. Não expor endpoints, credenciais ou dados
de titulares em logs públicos.

Backend — src/services/sinterService.ts:
- Obter token OAuth via POST {SINTER_BASE_URL}/v1/keycloak/oidc/token
  com grant_type=client_credentials, client_id, client_secret (env vars)
- Cache do token com renovação automática ao receber 401
- Mapear Imovel do banco → payload CADURB (seção 13.5 do PROMPT_GEOMAPLE_MVP.md)
- POST /api/v1/{SINTER_IBGE_CODE}/ui → receber CIB e salvar no banco
- Rota interna: POST /api/sinter/transmitir/:imovelId (auth: admin ou editor)
- Log de auditoria: timestamp, inscrição, status HTTP, CIB retornado (sem CPF completo)
- Retry máx 3x para 5xx/timeout

Variáveis de ambiente necessárias (nunca no repositório):
SINTER_CLIENT_ID, SINTER_CLIENT_SECRET, SINTER_BASE_URL, SINTER_IBGE_CODE=3146107

Consulte a seção 13 do PROMPT_GEOMAPLE_MVP.md para todas as regras de mapeamento.
```

### Prompt 9 — Deploy Railway
```
Configure o deploy no Railway Pro:
- backend/: Node.js service com variáveis de ambiente
- frontend/: Static site com Vite build
- PostgreSQL com extensão PostGIS habilitada
- Configurar CORS, HTTPS, variáveis de ambiente (incluindo SINTER_* como secrets)
Gere o railway.json e o Dockerfile do backend.
```

---

## 5. Arquivo .env de desenvolvimento (criar manualmente, nunca commitar)

```env
# backend/.env
DATABASE_URL="postgresql://geomaple:geomaple123@localhost:5432/geomaple"
JWT_SECRET="dev-secret-trocar-em-producao"
JWT_REFRESH_SECRET="dev-refresh-secret"
PORT=3001

# SINTER — preencher com credenciais fornecidas pela RFB
SINTER_CLIENT_ID=
SINTER_CLIENT_SECRET=
SINTER_BASE_URL=https://hom-lb-sinter2-cadurb.np.estaleiro.serpro.gov.br
SINTER_IBGE_CODE=3146107
```

Adicionar ao `.gitignore`:
```
.env
.env.*
node_modules/
dist/
```

---

## 6. Referências rápidas do protótipo

Ao desenvolver qualquer feature, consulte o `SGCIM_v10.html` buscando:

| Feature | O que buscar no HTML/JS |
|---------|------------------------|
| Wizard cadastro | `function showCadStep`, `function cadNext` |
| Validação inscrição | `function upInsc`, `function checkDup` |
| Herança de polígono | `window._v10inheritPol`, `drawExistingPol` |
| Unidades Autônomas | `function v10_openUA`, `function v10_saveUA` |
| Delimitação edificação | `function v10_openBuildingPoly` |
| Payload SINTER | `function v10_sinterBuildPayload` |
| Mapeamento campos | `function v10_sinterValidate` |
| Áreas e cálculos | `function estArea`, `function fmtArea` |
| Quadras georref. | `function v10_startQuadPoly`, `function v10_saveQuadra` |

---

## 7. Usuário inicial (seed de produção)

O seed cria **apenas um admin inicial** com senha temporária:

| Login | Senha temporária | Perfil |
|-------|-----------------|--------|
| admin | `Trocar@2025` | admin |

No **primeiro acesso**, o sistema força a troca de senha.
A partir daí, o admin cria os demais operadores pelo painel `/admin/usuarios`.

> Para testes em desenvolvimento, crie operadores adicionais pelo próprio painel após o primeiro login.

---

## 8. Checklist antes do primeiro commit

- [ ] `.env` está no `.gitignore`
- [ ] Nenhuma credencial SINTER no código-fonte
- [ ] `SGCIM_v10.html` não exposto publicamente (é interno)
- [ ] `PROMPT_GEOMAPLE_MVP.md` não exposto (contém detalhes da integração RFB)
- [ ] README.md genérico criado (sem detalhes sensíveis)
