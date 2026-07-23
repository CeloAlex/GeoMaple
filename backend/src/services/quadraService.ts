import { prisma } from '../db'
import { AppError } from '../utils/errors'
import { validarPolygonGeoJSON, PolygonGeoJSON } from '../utils/geojson'
import { registrarAuditoria } from './auditService'

type QuadraRow = {
  id: number
  di: string
  se: string
  qu: string
  cod: string | null
  obs: string | null
  geom: string | null
}

function linha(row: QuadraRow) {
  return { ...row, geom: row.geom ? (JSON.parse(row.geom) as PolygonGeoJSON) : null }
}

export async function listarQuadras() {
  const rows = await prisma.$queryRaw<QuadraRow[]>`
    SELECT id, di, se, qu, cod, obs, ST_AsGeoJSON(geom) AS geom
    FROM "Quadra"
    ORDER BY di, se, qu
  `
  return rows.map(linha)
}

export async function obterQuadra(id: number) {
  const rows = await prisma.$queryRaw<QuadraRow[]>`
    SELECT id, di, se, qu, cod, obs, ST_AsGeoJSON(geom) AS geom
    FROM "Quadra"
    WHERE id = ${id}
  `
  if (!rows[0]) throw new AppError(404, 'Quadra não encontrada')
  return linha(rows[0])
}

function validarCampos(dados: Record<string, unknown>) {
  if (dados.geom !== undefined && dados.geom !== null && !validarPolygonGeoJSON(dados.geom)) {
    throw new AppError(400, 'geom deve ser um GeoJSON Polygon válido (anel fechado, SRID 4326)')
  }
}

export async function criarQuadra(dados: Record<string, unknown>, solicitanteId: number) {
  const di = String(dados.di ?? '').trim()
  const se = String(dados.se ?? '').trim()
  const qu = String(dados.qu ?? '').trim()
  if (!di || !se || !qu) throw new AppError(400, 'di, se e qu são obrigatórios')

  validarCampos(dados)

  const duplicada = await prisma.quadra.findUnique({ where: { di_se_qu: { di, se, qu } } })
  if (duplicada) throw new AppError(409, 'Já existe uma quadra cadastrada com este Distrito.Setor.Quadra')

  const quadra = await prisma.quadra.create({
    data: { di, se, qu, cod: (dados.cod as string) || null, obs: (dados.obs as string) || null },
  })

  if (dados.geom) {
    const geojson = JSON.stringify(dados.geom)
    await prisma.$executeRaw`
      UPDATE "Quadra" SET geom = ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326) WHERE id = ${quadra.id}
    `
  }

  await registrarAuditoria({
    userId: solicitanteId,
    acao: 'QUADRA_CRIADA',
    entidade: `Quadra:${quadra.id}`,
    detalhe: { di, se, qu },
  })

  return obterQuadra(quadra.id)
}

export async function editarQuadra(id: number, dados: Record<string, unknown>, solicitanteId: number) {
  await obterQuadra(id)
  validarCampos(dados)

  const atualizacao: Record<string, unknown> = {}
  if ('cod' in dados) atualizacao.cod = dados.cod || null
  if ('obs' in dados) atualizacao.obs = dados.obs || null
  if ('di' in dados) atualizacao.di = String(dados.di).trim()
  if ('se' in dados) atualizacao.se = String(dados.se).trim()
  if ('qu' in dados) atualizacao.qu = String(dados.qu).trim()

  if (Object.keys(atualizacao).length > 0) {
    await prisma.quadra.update({ where: { id }, data: atualizacao as never })
  }

  if (dados.geom !== undefined) {
    const geojson = JSON.stringify(dados.geom)
    await prisma.$executeRaw`
      UPDATE "Quadra" SET geom = ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326) WHERE id = ${id}
    `
  }

  await registrarAuditoria({
    userId: solicitanteId,
    acao: 'QUADRA_EDITADA',
    entidade: `Quadra:${id}`,
    detalhe: { campos: Object.keys(dados) },
  })

  return obterQuadra(id)
}

export async function excluirQuadra(id: number, solicitanteId: number) {
  const quadra = await obterQuadra(id)
  await prisma.quadra.delete({ where: { id } })

  await registrarAuditoria({
    userId: solicitanteId,
    acao: 'QUADRA_EXCLUIDA',
    entidade: `Quadra:${id}`,
    detalhe: { di: quadra.di, se: quadra.se, qu: quadra.qu },
  })

  return quadra
}
