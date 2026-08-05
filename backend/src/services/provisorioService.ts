import { prisma } from '../db'
import { AppError } from '../utils/errors'
import { validarPolygonGeoJSON, PolygonGeoJSON } from '../utils/geojson'
import { registrarAuditoria } from './auditService'

// Mesmas opções do protótipo SGCIM_v10.html (prov-tipo / prov-status)
const TIPOS_VALIDOS = ['rural', 'estudo', 'levantamento', 'sem_id', 'fiscalizacao', 'novo']
const STATUS_VALIDOS = ['em_estudo', 'levantamento', 'fiscalizacao', 'novo', 'convertido']

type ProvisorioRow = {
  id: number
  nome: string
  tipo: string
  status: string
  obs: string | null
  geom: string | null
}

function linha(row: ProvisorioRow) {
  return { ...row, geom: row.geom ? (JSON.parse(row.geom) as PolygonGeoJSON) : null }
}

export async function listarProvisorios() {
  const rows = await prisma.$queryRaw<ProvisorioRow[]>`
    SELECT id, nome, tipo, status, obs, ST_AsGeoJSON(geom) AS geom
    FROM "Provisorio"
    ORDER BY id DESC
  `
  return rows.map(linha)
}

export async function obterProvisorio(id: number) {
  const rows = await prisma.$queryRaw<ProvisorioRow[]>`
    SELECT id, nome, tipo, status, obs, ST_AsGeoJSON(geom) AS geom
    FROM "Provisorio"
    WHERE id = ${id}
  `
  if (!rows[0]) throw new AppError(404, 'Delimitação provisória não encontrada')
  return linha(rows[0])
}

function validarCampos(dados: Record<string, unknown>) {
  if ('tipo' in dados && dados.tipo && !TIPOS_VALIDOS.includes(dados.tipo as string)) {
    throw new AppError(400, `tipo deve ser um de: ${TIPOS_VALIDOS.join(', ')}`)
  }
  if ('status' in dados && dados.status && !STATUS_VALIDOS.includes(dados.status as string)) {
    throw new AppError(400, `status deve ser um de: ${STATUS_VALIDOS.join(', ')}`)
  }
  if (dados.geom !== undefined && dados.geom !== null && !validarPolygonGeoJSON(dados.geom)) {
    throw new AppError(400, 'geom deve ser um GeoJSON Polygon válido (anel fechado, SRID 4326)')
  }
}

export async function criarProvisorio(dados: Record<string, unknown>, solicitanteId: number) {
  const nome = String(dados.nome ?? '').trim()
  if (!nome) throw new AppError(400, 'nome é obrigatório')

  validarCampos(dados)

  const provisorio = await prisma.provisorio.create({
    data: {
      nome,
      tipo: (dados.tipo as string) || 'rural',
      status: (dados.status as string) || 'em_estudo',
      obs: (dados.obs as string) || null,
    },
  })

  if (dados.geom) {
    const geojson = JSON.stringify(dados.geom)
    await prisma.$executeRaw`
      UPDATE "Provisorio" SET geom = ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326) WHERE id = ${provisorio.id}
    `
  }

  await registrarAuditoria({
    userId: solicitanteId,
    acao: 'PROVISORIO_CRIADO',
    entidade: `Provisorio:${provisorio.id}`,
    detalhe: { nome, tipo: provisorio.tipo },
  })

  return obterProvisorio(provisorio.id)
}

export async function editarProvisorio(id: number, dados: Record<string, unknown>, solicitanteId: number) {
  await obterProvisorio(id)
  validarCampos(dados)

  const atualizacao: Record<string, unknown> = {}
  if ('nome' in dados) atualizacao.nome = String(dados.nome).trim()
  if ('tipo' in dados) atualizacao.tipo = dados.tipo
  if ('status' in dados) atualizacao.status = dados.status
  if ('obs' in dados) atualizacao.obs = dados.obs || null

  if (Object.keys(atualizacao).length > 0) {
    await prisma.provisorio.update({ where: { id }, data: atualizacao as never })
  }

  if (dados.geom !== undefined) {
    const geojson = JSON.stringify(dados.geom)
    await prisma.$executeRaw`
      UPDATE "Provisorio" SET geom = ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326) WHERE id = ${id}
    `
  }

  await registrarAuditoria({
    userId: solicitanteId,
    acao: 'PROVISORIO_EDITADO',
    entidade: `Provisorio:${id}`,
    detalhe: { campos: Object.keys(dados) },
  })

  return obterProvisorio(id)
}

export async function excluirProvisorio(id: number, solicitanteId: number) {
  const provisorio = await obterProvisorio(id)
  await prisma.provisorio.delete({ where: { id } })

  await registrarAuditoria({
    userId: solicitanteId,
    acao: 'PROVISORIO_EXCLUIDO',
    entidade: `Provisorio:${id}`,
    detalhe: { nome: provisorio.nome },
  })

  return provisorio
}
