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

## Status do desenvolvimento

O progresso detalhado, decisões de arquitetura e backlog são acompanhados em
`DESENVOLVIMENTO_STATUS.md` na raiz do repositório.
