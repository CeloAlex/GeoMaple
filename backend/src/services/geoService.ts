import { Prisma } from '@prisma/client'
import { prisma } from '../db'
import { AppError } from '../utils/errors'
import { validarPolygonGeoJSON, PolygonGeoJSON } from '../utils/geojson'
import { registrarAuditoria } from './auditService'

type GeomRow = { at_geo: number | null; ac_geo: number | null; geom: string | null; geom_bld: string | null }

type ConflitoSobreposicao = { id: number; insc: string; prop: string }

// Uma geometria ajustada à mão (ex.: Ajuste Topológico, com snap visual num vértice de um
// vizinho) praticamente nunca produz um toque geometricamente EXATO em ponto flutuante —
// sobra sempre uma fresta/sobreposição fina ao longo da aresta ajustada ("sliver"). Exigir
// ST_Touches exato (como antes) rejeitava com 409 até ajustes corretos.
//
// Um limiar de ÁREA absoluta (testado antes, 0.5 m²) não funciona: a área de uma fresta
// cresce com o COMPRIMENTO da aresta compartilhada, não só com sua espessura — uma sobra de
// apenas 3cm de largura ao longo de uma divisa de 20m já dá 0.6 m², e seria barrada mesmo
// sendo claramente só uma sobra de ajuste manual, não uma sobreposição real entre lotes.
// Por isso o teste é de LARGURA, não de área: erodemos (buffer negativo) a interseção por
// essa tolerância — se a sobra "desaparece" (não sobra área depois de encolhida), é fina
// demais para ser uma sobreposição real, não importa o quão comprida seja. Só sobreposições
// que continuam tendo área depois de erodidas — ou seja, que são largas o bastante para não
// serem apenas uma fresta de encaixe — contam como conflito de verdade.
const TOLERANCIA_SOBREPOSICAO_LARGURA_M = 0.5

// Reusada tanto pelo salvamento de um único lote (atualizarGeometria) quanto pelo Ajuste
// Topológico em lote (salvarAjusteTopologico) — roda dentro da mesma transação do
// chamador. `idsExcluir` são os lotes que fazem parte do MESMO salvamento (não devem
// conflitar entre si, esse é o resultado esperado de compartilhar uma aresta/vértice).
async function verificarConflitoSobreposicao(tx: Prisma.TransactionClient, idsExcluir: number[], geojson: string) {
  if (idsExcluir.length === 0) throw new AppError(500, 'idsExcluir não pode ser vazio')
  return tx.$queryRaw<ConflitoSobreposicao[]>`
    SELECT id, insc, prop FROM "Imovel"
    WHERE ativo = true AND geom IS NOT NULL AND id NOT IN (${Prisma.join(idsExcluir)})
      AND ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326))
      AND ST_Area(ST_Buffer(
        ST_Intersection(geom, ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326))::geography,
        ${-TOLERANCIA_SOBREPOSICAO_LARGURA_M}
      )) > 0
  `
}

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

// Unidades Autônomas nunca têm geometria própria — terreno e edificação são únicos por
// lote, compartilhados por todas as UAs vinculadas. Resolve sempre para a linha do
// terreno (parentId ?? id) antes de ler/gravar, para que editar a partir de QUALQUER UA
// opere sobre a mesma geometria do lote, sem criar cópias divergentes. `imovel` retornado
// é sempre o registro ORIGINALMENTE pedido (não o terreno) — cada UA mantém sua própria
// identidade cadastral (insc, prop, etc.); só a geometria é resolvida para o terreno.
async function resolverIdTerreno(id: number) {
  const imovel = await prisma.imovel.findUnique({ where: { id } })
  if (!imovel) throw new AppError(404, 'Imóvel não encontrado')
  return { imovel, idTerreno: imovel.parentId ?? id }
}

export async function obterGeometria(id: number) {
  const { imovel, idTerreno } = await resolverIdTerreno(id)
  return { ...imovel, ...(await lerGeometria(idTerreno)) }
}

export async function atualizarGeometria(
  id: number,
  dados: { geom?: unknown; geom_bld?: unknown },
  solicitante: { id: number },
) {
  const { imovel, idTerreno } = await resolverIdTerreno(id)

  if (dados.geom === undefined && dados.geom_bld === undefined) {
    throw new AppError(400, 'Informe geom e/ou geom_bld como GeoJSON Polygon')
  }
  if (dados.geom !== undefined && !validarPolygonGeoJSON(dados.geom)) {
    throw new AppError(400, 'geom deve ser um GeoJSON Polygon válido (anel fechado, SRID 4326)')
  }
  if (dados.geom_bld !== undefined && !validarPolygonGeoJSON(dados.geom_bld)) {
    throw new AppError(400, 'geom_bld deve ser um GeoJSON Polygon válido (anel fechado, SRID 4326)')
  }

  const antes = await lerGeometria(idTerreno)

  await prisma.$transaction(async (tx) => {
    if (dados.geom !== undefined) {
      const geojson = JSON.stringify(dados.geom as PolygonGeoJSON)

      // Bloqueia sobreposição real com outro terreno já cadastrado — mas não uma fresta fina
      // (ver TOLERANCIA_SOBREPOSICAO_LARGURA_M), já que compartilhar uma aresta entre
      // confrontantes é justamente o resultado desejado do Ajuste Topológico. `geom IS NOT
      // NULL` já exclui toda Unidade Autônoma (nunca tem geometria própria — sempre NULL),
      // então nenhuma UA nunca aparece aqui nem como candidata a conflito nem como alvo da
      // checagem (id sempre resolvido para o terreno via resolverIdTerreno acima).
      const conflitos = await verificarConflitoSobreposicao(tx, [idTerreno], geojson)
      if (conflitos.length > 0) {
        throw new AppError(
          409,
          `Geometria sobreposta à de ${conflitos.length > 1 ? `${conflitos.length} imóveis já cadastrados` : `"${conflitos[0].insc}" (já cadastrado)`}`,
          conflitos,
        )
      }

      await tx.$executeRaw`
        UPDATE "Imovel"
        SET geom = ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326),
            at_geo = ST_Area(ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326)::geography),
            geo_dt = now()
        WHERE id = ${idTerreno}
      `
    }

    if (dados.geom_bld !== undefined) {
      const geojsonBld = JSON.stringify(dados.geom_bld as PolygonGeoJSON)
      await tx.$executeRaw`
        UPDATE "Imovel"
        SET geom_bld = ST_SetSRID(ST_GeomFromGeoJSON(${geojsonBld}), 4326),
            ac_geo = ST_Area(ST_SetSRID(ST_GeomFromGeoJSON(${geojsonBld}), 4326)::geography)
        WHERE id = ${idTerreno}
      `
    }
  })

  if (dados.geom !== undefined) {
    await registrarAuditoria({
      userId: solicitante.id,
      acao: antes?.geom ? 'IMOVEL_GEOMETRIA_EDITADA' : 'IMOVEL_GEOMETRIA_ADICIONADA',
      entidade: `Imovel:${idTerreno}`,
      detalhe: { insc: imovel.insc, vertices: (dados.geom as PolygonGeoJSON).coordinates[0].length },
    })
  }
  if (dados.geom_bld !== undefined) {
    await registrarAuditoria({
      userId: solicitante.id,
      acao: antes?.geom_bld ? 'IMOVEL_EDIFICACAO_EDITADA' : 'IMOVEL_EDIFICACAO_ADICIONADA',
      entidade: `Imovel:${idTerreno}`,
      detalhe: { insc: imovel.insc, vertices: (dados.geom_bld as PolygonGeoJSON).coordinates[0].length },
    })
  }

  return obterGeometria(idTerreno)
}

type AjusteVizinho = { id: number; geom: unknown }

// Ajuste Topológico (estilo QGIS "topological editing"): quando um vértice arrastado
// coincide com um vértice de um lote vizinho, o vizinho é movido junto (ver
// frontend/src/components/Map/AjusteTopologicoTool.tsx) — os dois precisam ser salvos
// atomicamente com o MESMO vértice, senão o encaixe se perde na próxima edição de
// qualquer um dos dois. `vizinhosAfetados` já vem com as geometrias completas recalculadas
// pelo cliente (não só o vértice movido). Não usa `resolverIdTerreno` nos vizinhos: eles
// vêm de /api/geo/bbox, que já exclui Unidades Autônomas (geom sempre NULL nelas).
export async function salvarAjusteTopologico(
  idPrincipal: number,
  geom: unknown,
  vizinhosAfetados: AjusteVizinho[],
  solicitante: { id: number },
) {
  const { imovel, idTerreno } = await resolverIdTerreno(idPrincipal)

  if (!validarPolygonGeoJSON(geom)) {
    throw new AppError(400, 'geom deve ser um GeoJSON Polygon válido (anel fechado, SRID 4326)')
  }
  for (const v of vizinhosAfetados) {
    if (!validarPolygonGeoJSON(v.geom)) {
      throw new AppError(400, `geom do vizinho ${v.id} deve ser um GeoJSON Polygon válido (anel fechado, SRID 4326)`)
    }
  }

  const idsVizinhos = vizinhosAfetados.map((v) => v.id)
  const idsLote = [idTerreno, ...idsVizinhos]
  const geomPorId = new Map<number, unknown>([[idTerreno, geom], ...vizinhosAfetados.map((v): [number, unknown] => [v.id, v.geom])])

  await prisma.$transaction(async (tx) => {
    const idsPorInsc = new Map<number, string>([[idTerreno, imovel.insc]])

    if (idsVizinhos.length > 0) {
      const vizinhosExistentes = await tx.$queryRaw<{ id: number; insc: string }[]>`
        SELECT id, insc FROM "Imovel" WHERE id IN (${Prisma.join(idsVizinhos)}) AND ativo = true AND geom IS NOT NULL
      `
      if (vizinhosExistentes.length !== idsVizinhos.length) {
        throw new AppError(400, 'Um ou mais lotes vizinhos informados não existem ou não têm geometria própria')
      }
      for (const v of vizinhosExistentes) idsPorInsc.set(v.id, v.insc)
    }

    // Cada lote do conjunto (principal + vizinhos) é checado contra todo o resto do
    // cadastro — mas não contra os outros lotes do MESMO conjunto, já que compartilhar a
    // aresta/vértice ajustado é justamente o resultado esperado.
    for (const id of idsLote) {
      const geojson = JSON.stringify(geomPorId.get(id))
      const conflitos = await verificarConflitoSobreposicao(tx, idsLote, geojson)
      if (conflitos.length > 0) {
        throw new AppError(
          409,
          `Geometria de "${idsPorInsc.get(id)}" ficaria sobreposta à de ${conflitos.length > 1 ? `${conflitos.length} imóveis já cadastrados` : `"${conflitos[0].insc}" (já cadastrado)`}`,
          conflitos,
        )
      }
    }

    for (const id of idsLote) {
      const geojson = JSON.stringify(geomPorId.get(id))
      await tx.$executeRaw`
        UPDATE "Imovel"
        SET geom = ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326),
            at_geo = ST_Area(ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326)::geography),
            geo_dt = now()
        WHERE id = ${id}
      `
    }
  })

  await registrarAuditoria({
    userId: solicitante.id,
    acao: 'IMOVEL_GEOMETRIA_EDITADA',
    entidade: `Imovel:${idTerreno}`,
    detalhe: { insc: imovel.insc, ajusteTopologico: true, vizinhosAfetados: idsVizinhos },
  })
  for (const v of vizinhosAfetados) {
    await registrarAuditoria({
      userId: solicitante.id,
      acao: 'IMOVEL_GEOMETRIA_EDITADA',
      entidade: `Imovel:${v.id}`,
      detalhe: { ajusteTopologico: true, loteOrigem: idTerreno },
    })
  }

  return Promise.all(idsLote.map((id) => obterGeometria(id)))
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
