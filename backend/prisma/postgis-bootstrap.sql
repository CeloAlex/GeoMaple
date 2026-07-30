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
--
-- ATENÇÃO (descoberto ao provisionar o Railway em 2026-07-30): a imagem
-- postgis/postgis auto-instala postgis/postgis_topology/postgis_tiger_geocoder/
-- fuzzystrmatch em "public" já no primeiro boot do container (docker-entrypoint-
-- initdb.d), ANTES deste script rodar — recriando exatamente o drift que este
-- runbook existe para evitar. Por isso os DROPs abaixo vêm primeiro: eles são
-- idempotentes (IF EXISTS) e só têm efeito real na primeira execução, contra um
-- banco ainda sem dados de aplicação. GeoMaple só usa geometria básica (Polygon),
-- então topology/tiger_geocoder/fuzzystrmatch são removidas, não realocadas.

DROP EXTENSION IF EXISTS postgis_tiger_geocoder CASCADE;
DROP EXTENSION IF EXISTS postgis_topology CASCADE;
DROP EXTENSION IF EXISTS fuzzystrmatch CASCADE;
DROP EXTENSION IF EXISTS postgis CASCADE;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;
ALTER DATABASE geomaple SET search_path TO public, extensions;
