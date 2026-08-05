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

  await registrarAuditoria({
    userId: criadoPorId,
    acao: 'IMOVEL_CRIADO',
    entidade: `Imovel:${imovel.id}`,
    detalhe: { insc: imovel.insc, prop: imovel.prop, uso: imovel.uso, st: imovel.st },
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
