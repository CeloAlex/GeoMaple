import { prisma } from '../db'
import { AppError } from '../utils/errors'
import { validarInscricao, prefixoBusca } from '../utils/inscricao'
import { registrarAuditoria, calcDiff } from './auditService'

const USOS_VALIDOS = ['terreno', 'construido', 'em_construcao']
const STATUS_VALIDOS = ['regular', 'em_fiscalizacao', 'para_revisao']

export const CAMPOS_CRIACAO = [
  'insc',
  'cod',
  'prop',
  'log',
  'nr',
  'bai',
  'cep',
  'uso',
  'tp',
  'st',
  'at_cad',
  'ac_cad',
  'at_aviso_ok',
  'ac_aviso_ok',
  'num_pav',
  'frac_ideal',
  'matricula',
  'obs',
  'parentId',
  'cib',
  'cib_status',
  'cib_dt',
  'cadurb_tipo',
  'tp_arq',
  'dest',
  'padrao',
  'ano_constr',
  'valor_venal',
] as const

export const CAMPOS_EDICAO = CAMPOS_CRIACAO.filter((c) => c !== 'insc')

export function validarUsoEStatus(dados: Record<string, unknown>) {
  if ('uso' in dados && dados.uso && !USOS_VALIDOS.includes(dados.uso as string)) {
    throw new AppError(400, `uso deve ser um de: ${USOS_VALIDOS.join(', ')}`)
  }
  if ('st' in dados && dados.st && !STATUS_VALIDOS.includes(dados.st as string)) {
    throw new AppError(400, `st deve ser um de: ${STATUS_VALIDOS.join(', ')}`)
  }
}

export async function listarImoveis(filtros: {
  di?: string
  se?: string
  qu?: string
  prop?: string
  st?: string
  ativo?: boolean
  q?: string
}) {
  const where: Record<string, unknown> = {
    ativo: filtros.ativo === undefined ? true : filtros.ativo,
  }

  const prefixo = prefixoBusca(filtros)
  if (prefixo) where.insc = { startsWith: prefixo }

  if (filtros.prop) where.prop = { contains: filtros.prop, mode: 'insensitive' }
  if (filtros.st) {
    if (!STATUS_VALIDOS.includes(filtros.st)) {
      throw new AppError(400, `st deve ser um de: ${STATUS_VALIDOS.join(', ')}`)
    }
    where.st = filtros.st
  }

  // Busca livre por inscrição, endereço ou proprietário (usada na busca da sidebar)
  if (filtros.q?.trim()) {
    const q = filtros.q.trim()
    where.OR = [
      { insc: { contains: q, mode: 'insensitive' } },
      { log: { contains: q, mode: 'insensitive' } },
      { prop: { contains: q, mode: 'insensitive' } },
    ]
  }

  return prisma.imovel.findMany({
    where,
    orderBy: { insc: 'asc' },
    take: filtros.q?.trim() ? 50 : undefined,
  })
}

export async function obterImovel(id: number) {
  const imovel = await prisma.imovel.findUnique({
    where: { id },
    include: { unidades: { where: { ativo: true } } },
  })
  if (!imovel) throw new AppError(404, 'Imóvel não encontrado')
  return imovel
}

export async function criarImovel(dados: Record<string, unknown>, criadoPorId: number) {
  const insc = dados.insc as string
  if (!insc || !validarInscricao(insc)) {
    throw new AppError(400, 'insc deve seguir o formato DD.SS.QQQ.LLLL-UUU')
  }
  if (!dados.prop) {
    throw new AppError(400, 'prop é obrigatório')
  }

  validarUsoEStatus(dados)

  const duplicado = await prisma.imovel.findUnique({ where: { insc } })
  if (duplicado) throw new AppError(409, 'Já existe um imóvel cadastrado com esta inscrição')

  if (dados.parentId !== undefined && dados.parentId !== null) {
    const pai = await prisma.imovel.findUnique({ where: { id: Number(dados.parentId) } })
    if (!pai) throw new AppError(400, 'parentId não corresponde a um imóvel existente')
  }

  const data: Record<string, unknown> = { createdBy: criadoPorId }
  for (const campo of CAMPOS_CRIACAO) {
    if (dados[campo] !== undefined) data[campo] = dados[campo]
  }

  const imovel = await prisma.imovel.create({ data: data as never })

  // Justificativa opcional do operador ao confirmar "Revisado — não é duplicata" na tela
  // de duplicidade de cadastro (Wizard/CadastroWizard.tsx) — não é uma coluna do Imóvel,
  // só fica registrada no log de auditoria (reaproveita o campo `detalhe` já existente).
  const justificativaDuplicidade =
    typeof dados.duplicidadeJustificativa === 'string' && dados.duplicidadeJustificativa.trim()
      ? dados.duplicidadeJustificativa.trim()
      : undefined

  await registrarAuditoria({
    userId: criadoPorId,
    acao: 'IMOVEL_CRIADO',
    entidade: `Imovel:${imovel.id}`,
    detalhe: {
      insc: imovel.insc,
      prop: imovel.prop,
      uso: imovel.uso,
      st: imovel.st,
      ...(justificativaDuplicidade ? { duplicidadeRevisada: justificativaDuplicidade } : {}),
    },
  })

  return imovel
}

export async function editarImovel(
  id: number,
  dados: Record<string, unknown>,
  solicitante: { id: number },
) {
  const imovel = await prisma.imovel.findUnique({ where: { id } })
  if (!imovel) throw new AppError(404, 'Imóvel não encontrado')

  validarUsoEStatus(dados)

  if (dados.parentId !== undefined && dados.parentId !== null) {
    if (Number(dados.parentId) === id) throw new AppError(400, 'Um imóvel não pode ser pai de si mesmo')
    const pai = await prisma.imovel.findUnique({ where: { id: Number(dados.parentId) } })
    if (!pai) throw new AppError(400, 'parentId não corresponde a um imóvel existente')
  }

  const atualizacao: Record<string, unknown> = {}
  for (const campo of CAMPOS_EDICAO) {
    if (campo in dados) atualizacao[campo] = dados[campo]
  }

  const statusMudou = 'st' in atualizacao && atualizacao.st !== imovel.st

  const atualizado = await prisma.imovel.update({ where: { id }, data: atualizacao as never })
  const { antes, depois } = calcDiff(imovel, atualizado, Object.keys(atualizacao))

  await registrarAuditoria({
    userId: solicitante.id,
    acao: statusMudou ? 'IMOVEL_STATUS_ALTERADO' : 'IMOVEL_EDITADO',
    entidade: `Imovel:${id}`,
    detalhe: { insc: atualizado.insc, antes, depois },
  })

  return atualizado
}

type DuplicataRow = { id: number; insc: string; prop: string; log: string | null; nr: string | null }
export type DuplicataCandidata = DuplicataRow & { motivos: ('endereco' | 'proximidade')[] }

// Verificação de "Duplicidade de Cadastro": compara endereço (log+nr, case-insensitive) e
// proximidade geográfica (centróide do terreno a menos de 10m de outro já cadastrado) —
// só entre terrenos (parentId null), já que UAs nunca têm geometria própria e comparti­lham
// o mesmo endereço do terreno pai por design (não é duplicidade). `excluirId` evita que o
// próprio imóvel em edição apareça como duplicata de si mesmo.
export async function verificarDuplicidade(params: {
  log?: string
  nr?: string
  lat?: number
  lng?: number
  excluirId?: number
}): Promise<DuplicataCandidata[]> {
  const excluirId = params.excluirId ?? -1
  const encontrados = new Map<number, DuplicataCandidata>()

  function adicionar(rows: DuplicataRow[], motivo: 'endereco' | 'proximidade') {
    for (const row of rows) {
      const atual = encontrados.get(row.id)
      if (atual) atual.motivos.push(motivo)
      else encontrados.set(row.id, { ...row, motivos: [motivo] })
    }
  }

  if (params.log?.trim() && params.nr?.trim()) {
    const porEndereco = await prisma.imovel.findMany({
      where: {
        ativo: true,
        parentId: null,
        id: { not: excluirId },
        log: { equals: params.log.trim(), mode: 'insensitive' },
        nr: { equals: params.nr.trim(), mode: 'insensitive' },
      },
      select: { id: true, insc: true, prop: true, log: true, nr: true },
    })
    adicionar(porEndereco, 'endereco')
  }

  if (params.lat != null && params.lng != null) {
    const porProximidade = await prisma.$queryRaw<DuplicataRow[]>`
      SELECT id, insc, prop, log, nr FROM "Imovel"
      WHERE ativo = true AND "parentId" IS NULL AND geom IS NOT NULL AND id != ${excluirId}
        AND ST_DWithin(
          ST_Centroid(geom)::geography,
          ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography,
          10
        )
    `
    adicionar(porProximidade, 'proximidade')
  }

  return [...encontrados.values()]
}

type ImovelGeomRow = { id: number; insc: string; prop: string; geom: string }

// Relatório "Mapa de localização dos imóveis por proprietário" (TESTE 7) — lista GERAL do
// Prisma (`listarImoveis`/GET /api/imoveis) não traz `geom` (tipo Unsupported, sempre
// ignorado pelo ORM); esta consulta usa SQL puro + ST_AsGeoJSON, mesmo padrão de
// imoveisNoBbox (geoService.ts), para poder destacar todos os lotes do proprietário no
// mapa principal de uma vez.
export async function imoveisPorProprietario(prop: string) {
  const termo = prop.trim()
  if (!termo) throw new AppError(400, 'prop é obrigatório')

  const rows = await prisma.$queryRaw<ImovelGeomRow[]>`
    SELECT id, insc, prop, ST_AsGeoJSON(geom) AS geom
    FROM "Imovel"
    WHERE ativo = true AND geom IS NOT NULL AND prop ILIKE ${'%' + termo + '%'}
    ORDER BY insc ASC
  `

  return rows.map((r) => ({ id: r.id, insc: r.insc, prop: r.prop, geom: JSON.parse(r.geom) }))
}

export async function excluirImovel(id: number, solicitante: { id: number }) {
  const imovel = await prisma.imovel.findUnique({ where: { id } })
  if (!imovel) throw new AppError(404, 'Imóvel não encontrado')
  if (!imovel.ativo) throw new AppError(400, 'Imóvel já está excluído')

  const unidadesAtivas = await prisma.imovel.count({ where: { parentId: id, ativo: true } })
  if (unidadesAtivas > 0) {
    throw new AppError(409, 'Exclua ou reatribua as Unidades Autônomas vinculadas antes de excluir este imóvel')
  }

  const atualizado = await prisma.imovel.update({ where: { id }, data: { ativo: false } })

  await registrarAuditoria({
    userId: solicitante.id,
    acao: 'IMOVEL_EXCLUIDO',
    entidade: `Imovel:${id}`,
    detalhe: { insc: atualizado.insc },
  })

  return atualizado
}
