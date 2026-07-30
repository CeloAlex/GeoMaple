# GeoMaple · SGCIM

Sistema de Gestão Cadastral Imobiliária Municipal — cadastro, georreferenciamento e gestão
de imóveis urbanos, com mapa interativo, wizard de cadastro, unidades autônomas, quadras
georreferenciadas, delimitações provisórias, trilha de auditoria e gestão de operadores.

O sistema é configurável por implantação: nenhum município fica fixo no código-fonte —
basta ajustar as variáveis de ambiente do backend para atender outra prefeitura.

## Estrutura

```
backend/    API REST (Node.js + Express + TypeScript + Prisma + PostgreSQL/PostGIS)
frontend/   SPA (Vite + React + TypeScript + Tailwind + Leaflet)
```

## Desenvolvimento local

Pré-requisitos: Node.js 20+, Docker (para PostgreSQL + PostGIS).

```bash
docker compose up -d

cd backend
cp .env.example .env   # preencher com os valores locais
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev             # http://localhost:3001

cd ../frontend
cp .env.example .env
npm install
npm run dev              # http://localhost:5183
```

Login inicial: usuário `admin`, senha temporária definida no seed — o sistema exige a
troca de senha no primeiro acesso.

## Deploy (Railway)

Um projeto Railway, três serviços, um único ambiente (`production`):

| Serviço | Origem | Root dir |
|---|---|---|
| `postgres-postgis` | Docker Image `postgis/postgis:15-3.3` + volume | — |
| `backend` | Nixpacks (config em `backend/railway.json`) | `backend/` |
| `frontend` | Nixpacks (config em `frontend/railway.json`) | `frontend/` |

O plugin Postgres gerenciado padrão do Railway usa a imagem oficial `postgres`, que **não**
inclui PostGIS — por isso o banco é um serviço "Deploy from Docker Image" com a mesma
imagem já usada em `docker-compose.yml` localmente.

**Passo manual único, antes do primeiro deploy do backend**: rodar
`backend/prisma/postgis-bootstrap.sql` contra o banco do Railway (via `railway connect` ou
psql). Isso instala o PostGIS num schema `extensions` dedicado, fora do rastreamento do
Prisma Migrate — o mesmo motivo pelo qual o dev local usa esse padrão (ver
`backend/prisma/postgis-bootstrap.sql` para o porquê).

Variáveis de ambiente do serviço `backend` (além das já usadas em dev, ver
`backend/.env.example`): `DATABASE_URL` (reference variable do serviço do banco),
`CORS_ORIGIN` (reference variable para o domínio do `frontend`), `JWT_SECRET` /
`JWT_REFRESH_SECRET` (gerar valores novos, não reaproveitar os de dev), `SINTER_CLIENT_ID` /
`SINTER_CLIENT_SECRET` / `SINTER_BASE_URL` (como secrets). `SHADOW_DATABASE_URL` não é
necessária em produção (só é usada por `prisma migrate dev`).

Variável do serviço `frontend`: `VITE_API_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}` —
é embutida no bundle em **build time** pelo Vite, então precisa estar configurada antes do
primeiro build, e qualquer mudança no domínio do backend exige rebuild (não só redeploy) do
frontend. Ver `frontend/.env.production.example`.

**CI antes do deploy**: `.github/workflows/ci.yml` roda lint/build do backend e do frontend
a cada push/PR em `master` (testes automatizados ainda não existem — serão adicionados
depois). No Railway, cada serviço deve ter **"Wait for CI"** ativado (Settings → Source), o
que faz o deploy só prosseguir depois que os checks do GitHub Actions ficarem verdes.

## Status do desenvolvimento

O progresso detalhado, decisões de arquitetura e backlog são acompanhados em
`DESENVOLVIMENTO_STATUS.md` na raiz do repositório.
