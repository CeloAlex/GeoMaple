-- Índices espaciais GIST para suportar consultas de bounding box (GET /api/geo/bbox)
CREATE INDEX "Imovel_geom_idx" ON "Imovel" USING GIST (geom);
CREATE INDEX "Imovel_geom_bld_idx" ON "Imovel" USING GIST (geom_bld);
