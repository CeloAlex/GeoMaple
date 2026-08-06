import { prisma } from '../db'
import { AppError } from '../utils/errors'
import { validarLineStringGeoJSON, LineStringGeoJSON } from '../utils/geojson'
import { registrarAuditoria } from './auditService'

const TIPOS_VALIDOS = ['rua', 'avenida', 'travessa', 'praca', 'rodovia', 'alameda', 'outro']
const SITUACOES_VALIDAS = ['oficial', 'provisorio', 'sem_denominacao']

type LogradouroRow = {
  id: number
  nome: string
  tipo: string
  bairros: string[]
  cep: string | null
  distrito: string | null
  leiNumero: string | null
  leiData: Date | null
  leiLink: string | null
  situacao: string
  obs: string | null
  ativo: boolean
  geom: string | null
}

function linha(row: LogradouroRow) {
  return { ...row, geom: row.geom ? (JSON.parse(row.geom) as LineStringGeoJSON) : null }
}

export async function listarLogradouros() {
  const rows = await prisma.$queryRaw<LogradouroRow[]>`
    SELECT id, nome, tipo, bairros, cep, distrito, "leiNumero", "leiData", "leiLink", situacao, obs, ativo,
      ST_AsGeoJSON(geom) AS geom
    FROM "Logradouro"
    WHERE ativo = true
    ORDER BY nome ASC
  `
  return rows.map(linha)
}

export async function obterLogradouro(id: number) {
  const rows = await prisma.$queryRaw<LogradouroRow[]>`
    SELECT id, nome, tipo, bairros, cep, distrito, "leiNumero", "leiData", "leiLink", situacao, obs, ativo,
      ST_AsGeoJSON(geom) AS geom
    FROM "Logradouro"
    WHERE id = ${id}
  `
  if (!rows[0]) throw new AppError(404, 'Logradouro não encontrado')
  return linha(rows[0])
}

function validarCampos(dados: Record<string, unknown>) {
  if ('tipo' in dados && dados.tipo && !TIPOS_VALIDOS.includes(dados.tipo as string)) {
    throw new AppError(400, `tipo deve ser um de: ${TIPOS_VALIDOS.join(', ')}`)
  }
  if ('situacao' in dados && dados.situacao && !SITUACOES_VALIDAS.includes(dados.situacao as string)) {
    throw new AppError(400, `situacao deve ser um de: ${SITUACOES_VALIDAS.join(', ')}`)
  }
  if (dados.geom !== undefined && dados.geom !== null && !validarLineStringGeoJSON(dados.geom)) {
    throw new AppError(400, 'geom deve ser um GeoJSON LineString válido (mínimo 2 pontos, SRID 4326)')
  }
  if ('bairros' in dados && dados.bairros !== undefined && !Array.isArray(dados.bairros)) {
    throw new AppError(400, 'bairros deve ser uma lista de nomes')
  }
}

export async function criarLogradouro(dados: Record<string, unknown>, solicitanteId: number) {
  const nome = String(dados.nome ?? '').trim()
  if (!nome) throw new AppError(400, 'nome é obrigatório')

  validarCampos(dados)

  const logradouro = await prisma.logradouro.create({
    data: {
      nome,
      tipo: (dados.tipo as string) || 'rua',
      bairros: Array.isArray(dados.bairros) ? (dados.bairros as string[]) : [],
      cep: (dados.cep as string) || null,
      distrito: (dados.distrito as string) || null,
      leiNumero: (dados.leiNumero as string) || null,
      leiData: dados.leiData ? new Date(dados.leiData as string) : null,
      leiLink: (dados.leiLink as string) || null,
      situacao: (dados.situacao as string) || 'sem_denominacao',
      obs: (dados.obs as string) || null,
    },
  })

  if (dados.geom) {
    const geojson = JSON.stringify(dados.geom)
    await prisma.$executeRaw`
      UPDATE "Logradouro" SET geom = ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326) WHERE id = ${logradouro.id}
    `
  }

  await registrarAuditoria({
    userId: solicitanteId,
    acao: 'LOGRADOURO_CRIADO',
    entidade: `Logradouro:${logradouro.id}`,
    detalhe: { nome, tipo: logradouro.tipo },
  })

  return obterLogradouro(logradouro.id)
}

export async function editarLogradouro(id: number, dados: Record<string, unknown>, solicitanteId: number) {
  await obterLogradouro(id)
  validarCampos(dados)

  const atualizacao: Record<string, unknown> = {}
  if ('nome' in dados) atualizacao.nome = String(dados.nome).trim()
  if ('tipo' in dados) atualizacao.tipo = dados.tipo
  if ('bairros' in dados) atualizacao.bairros = Array.isArray(dados.bairros) ? dados.bairros : []
  if ('cep' in dados) atualizacao.cep = dados.cep || null
  if ('distrito' in dados) atualizacao.distrito = dados.distrito || null
  if ('leiNumero' in dados) atualizacao.leiNumero = dados.leiNumero || null
  if ('leiData' in dados) atualizacao.leiData = dados.leiData ? new Date(dados.leiData as string) : null
  if ('leiLink' in dados) atualizacao.leiLink = dados.leiLink || null
  if ('situacao' in dados) atualizacao.situacao = dados.situacao
  if ('obs' in dados) atualizacao.obs = dados.obs || null

  if (Object.keys(atualizacao).length > 0) {
    await prisma.logradouro.update({ where: { id }, data: atualizacao as never })
  }

  if (dados.geom !== undefined) {
    const geojson = JSON.stringify(dados.geom)
    await prisma.$executeRaw`
      UPDATE "Logradouro" SET geom = ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326) WHERE id = ${id}
    `
  }

  await registrarAuditoria({
    userId: solicitanteId,
    acao: 'LOGRADOURO_EDITADO',
    entidade: `Logradouro:${id}`,
    detalhe: { campos: Object.keys(dados) },
  })

  return obterLogradouro(id)
}

export async function excluirLogradouro(id: number, solicitanteId: number) {
  const logradouro = await obterLogradouro(id)
  await prisma.logradouro.update({ where: { id }, data: { ativo: false } })

  await registrarAuditoria({
    userId: solicitanteId,
    acao: 'LOGRADOURO_EXCLUIDO',
    entidade: `Logradouro:${id}`,
    detalhe: { nome: logradouro.nome },
  })

  return logradouro
}

// Certidão de Existência de Denominação: verifica se já existe logradouro com o nome
// sugerido no município (comparação simples por similaridade textual, case-insensitive).
export async function buscarPorNome(nome: string) {
  return prisma.logradouro.findMany({
    where: { ativo: true, nome: { contains: nome.trim(), mode: 'insensitive' } },
    select: { id: true, nome: true, tipo: true, situacao: true },
    take: 10,
  })
}
