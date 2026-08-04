-- Unidades Autônomas não devem ter geometria própria — terreno e edificação são únicos
-- por lote e sempre resolvidos a partir do terreno pai (ver backend/src/services/
-- geoService.ts, resolverIdTerreno). Esta migração limpa cópias divergentes já
-- existentes em linhas de UA (parentId não nulo), inclusive polígonos duplicados
-- criados por edições feitas a partir de uma UA antes desta correção.
UPDATE "Imovel"
SET geom = NULL, geom_bld = NULL
WHERE "parentId" IS NOT NULL;
