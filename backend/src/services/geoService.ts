import { prisma } from '../db'
import { AppError } from '../utils/errors'
import { validarPolygonGeoJSON, PolygonGeoJSON } from '../utils/geojson'
import { registrarAuditoria } from './auditService'

type GeomRow = { at_geo: number | null; ac_geo: number | null; geom: string | null; geom_bld: string | null }

export async function lerGeometria(id: number) {
  const rows = await prisma.$queryRaw<GeomRow[]>`
    SELECT at_geo, ac_geo, ST_AsGeoJSON(geom) AS geom, ST_AsGeoJSON(geom_bld) AS geom_bld
    FROM "Imovel"
    WHERE id = ${id}
  `
  const row = rows[0]
  if (!row) return null
  return {
    at_geo: row.at_geo,
    ac_geo: row.ac_geo,
    geom: row.geom ? JSON.parse(row.geom) : null,
    geom_bld: row.geom_bld ? JSON.parse(row.geom_bld) : null,
  }
}

export async function obterGeometria(id: number) {
  const imovel = await prisma.imovel.findUnique({ where: { id } })
  if (!imovel) throw new AppError(404, 'Imóvel não encontrado')
  return { ...imovel, ...(await lerGeometria(id)) }
}

export async function atualizarGeometria(
  id: number,
  dados: { geom?: unknown; geom_bld?: unknown },
  solicitante: { id: number },
) {
  const imovel = await prisma.imovel.findUnique({ where: { id } })
  if (!imovel) throw new AppError(404, 'Imóvel não encontrado')

  if (dados.geom === undefined && dados.geom_bld === undefined) {
    throw new AppError(400, 'Informe geom e/ou geom_bld como GeoJSON Polygon')
  }
  if (dados.geom !== undefined && !validarPolygonGeoJSON(dados.geom)) {
    throw new AppError(400, 'geom deve ser um GeoJSON Polygon válido (anel fechado, SRID 4326)')
  }
  if (dados.geom_bld !== undefined && !validarPolygonGeoJSON(dados.geom_bld)) {
    throw new AppError(400, 'geom_bld deve ser um GeoJSON Polygon válido (anel fechado, SRID 4326)')
  }

  const antes = await lerGeometria(id)

  await prisma.$transaction(async (tx) => {
    if (dados.geom !== undefined) {
      const geojson = JSON.stringify(dados.geom as PolygonGeoJSON)
      await tx.$executeRaw`
        UPDATE "Imovel"
        SET geom = ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326),
            at_geo = ST_Area(ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326)::geography),
            geo_dt = now()
        WHERE id = ${id}
      `
      // Propaga geometria e área do terreno para Unidades Autônomas filhas (seção 8.3/8.4)
      await tx.$executeRaw`
        UPDATE "Imovel" AS filho
        SET geom = pai.geom, at_geo = pai.at_geo, geo_dt = pai.geo_dt
        FROM "Imovel" AS pai
        WHERE pai.id = ${id} AND filho."parentId" = ${id} AND filho.ativo = true
      `
    }

    if (dados.geom_bld !== undefined) {
      const geojsonBld = JSON.stringify(dados.geom_bld as PolygonGeoJSON)
      await tx.$executeRaw`
        UPDATE "Imovel"
        SET geom_bld = ST_SetSRID(ST_GeomFromGeoJSON(${geojsonBld}), 4326),
            ac_geo = ST_Area(ST_SetSRID(ST_GeomFromGeoJSON(${geojsonBld}), 4326)::geography)
        WHERE id = ${id}
      `
    }
  })

  if (dados.geom !== undefined) {
    await registrarAuditoria({
      userId: solicitante.id,
      acao: antes?.geom ? 'IMOVEL_GEOMETRIA_EDITADA' : 'IMOVEL_GEOMETRIA_ADICIONADA',
      entidade: `Imovel:${id}`,
      detalhe: { insc: imovel.insc, vertices: (dados.geom as PolygonGeoJSON).coordinates[0].length },
    })
  }
  if (dados.geom_bld !== undefined) {
    await registrarAuditoria({
      userId: solicitante.id,
      acao: antes?.geom_bld ? 'IMOVEL_EDIFICACAO_EDITADA' : 'IMOVEL_EDIFICACAO_ADICIONADA',
      entidade: `Imovel:${id}`,
      detalhe: { insc: imovel.insc, vertices: (dados.geom_bld as PolygonGeoJSON).coordinates[0].length },
    })
  }

  return obterGeometria(id)
}

// Copia geom/at_geo do terreno pai para uma Unidade Autônoma recém-criada (seção 8.3/8.4)
export async function herdarGeometriaDoPai(filhoId: number, paiId: number) {
  await prisma.$executeRaw`
    UPDATE "Imovel" AS filho
    SET geom = pai.geom, at_geo = pai.at_geo, geo_dt = pai.geo_dt
    FROM "Imovel" AS pai
    WHERE pai.id = ${paiId} AND filho.id = ${filhoId}
  `
}

function parseBbox(bbox: unknown) {
  if (typeof bbox !== 'string') throw new AppError(400, 'bbox é obrigatório: minLng,minLat,maxLng,maxLat')

  const partes = bbox.split(',').map(Number)
  if (partes.length !== 4 || partes.some((n) => Number.isNaN(n))) {
    throw new AppError(400, 'bbox deve conter 4 números: minLng,minLat,maxLng,maxLat')
  }

  const [minLng, minLat, maxLng, maxLat] = partes
  if (minLng >= maxLng || minLat >= maxLat) {
    throw new AppError(400, 'bbox inválido: min deve ser menor que max')
  }
  if (minLng < -180 || maxLng > 180 || minLat < -90 || maxLat > 90) {
    throw new AppError(400, 'bbox fora dos limites geográficos válidos')
  }

  return { minLng, minLat, maxLng, maxLat }
}

type BboxRow = {
  id: number
  insc: string
  prop: string
  uso: string
  st: string
  at_cad: number | null
  at_geo: number | null
  parentId: number | null
  cib: string | null
  geom: string
}

export async function imoveisNoBbox(bbox: unknown) {
  const { minLng, minLat, maxLng, maxLat } = parseBbox(bbox)

  const rows = await prisma.$queryRaw<BboxRow[]>`
    SELECT id, insc, prop, uso, st, at_cad, at_geo, "parentId", cib, ST_AsGeoJSON(geom) AS geom
    FROM "Imovel"
    WHERE ativo = true
      AND geom IS NOT NULL
      AND geom && ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)
  `

  return {
    type: 'FeatureCollection' as const,
    features: rows.map((row) => ({
      type: 'Feature' as const,
      geometry: JSON.parse(row.geom),
      properties: {
        id: row.id,
        insc: row.insc,
        prop: row.prop,
        uso: row.uso,
        st: row.st,
        at_cad: row.at_cad,
        at_geo: row.at_geo,
        parentId: row.parentId,
        cib: row.cib,
      },
    })),
  }
}
