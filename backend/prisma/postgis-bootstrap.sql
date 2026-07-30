-- Runbook: rodar manualmente UMA VEZ contra o Postgres do Railway (ou qualquer
-- instância nova), ANTES do primeiro `prisma migrate deploy`.
--
-- Não é executado por nenhuma automação (CI, railway.json, prisma) de propósito:
-- o PostGIS fica deliberadamente fora do rastreamento do Prisma Migrate. Instalar
-- a extensão em "public" cria a tabela spatial_ref_sys, que o Prisma interpreta como
-- drift em um histórico de migrations novo e passa a exigir reset destrutivo. Ver
-- o mesmo padrão usado no Postgres local de desenvolvimento.
--
-- Uso: railway connect postgres-postgis   (ou psql com a connection string do serviço)
--      psql "$DATABASE_URL" -f backend/prisma/postgis-bootstrap.sql

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;
ALTER DATABASE geomaple SET search_path TO public, extensions;
