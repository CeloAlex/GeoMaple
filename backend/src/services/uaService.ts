import { prisma } from '../db'
import { AppError } from '../utils/errors'
import { validarInscricao } from '../utils/inscricao'
import { CAMPOS_CRIACAO, CAMPOS_EDICAO, validarUsoEStatus } from './imovelService'
import { lerGeometria } from './geoService'
import { registrarAuditoria } from './auditService'

// UAs não têm sub-unidades: parentId só é aceito em um terreno raiz (seção 8.4)
const CAMPOS_UA_CRIACAO = CAMPOS_CRIACAO.filter((c) => c !== 'parentId')
const CAMPOS_UA_EDICAO = CAMPOS_EDICAO.filter((c) => c !== 'parentId')

async function obterTerrenoPai(parentId: number) {
  const pai = await prisma.imovel.findUnique({ where: { id: parentId } })
  if (!pai) throw new AppError(404, 'Imóvel não encontrado')
  if (!pai.ativo) throw new AppError(400, 'Imóvel está inativo')
  if (pai.parentId !== null) {
    throw new AppError(400, 'Este imóvel já é uma Unidade Autônoma; UAs não podem ter sub-unidades')
  }
  return pai
}

// UAs não armazenam geometria própria de forma autoritativa — sempre retornar a do terreno pai via JOIN (seção 8.4)
async function comGeometriaDoPai<T extends Record<string, unknown>>(unidade: T, parentId: number) {
  const geomPai = await lerGeometria(parentId)
  return { ...unidade, ...geomPai }
}

export async function listarUnidades(parentId: number) {
  await obterTerrenoPai(parentId)

  const unidades = await prisma.imovel.findMany({
    where: { parentId, ativo: true },
    orderBy: { insc: 'asc' },
  })

  const geomPai = await lerGeometria(parentId)
  return unidades.map((ua) => ({ ...ua, ...geomPai }))
}

export async function criarUnidade(
  parentId: number,
  dados: Record<string, unknown>,
  criadoPorId: number,
) {
  await obterTerrenoPai(parentId)

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

  const data: Record<string, unknown> = { createdBy: criadoPorId, parentId }
  for (const campo of CAMPOS_UA_CRIACAO) {
    if (dados[campo] !== undefined) data[campo] = dados[campo]
  }

  const ua = await prisma.imovel.create({ data: data as never })

  await registrarAuditoria({
    userId: criadoPorId,
    acao: 'UA_CRIADA',
    entidade: `Imovel:${ua.id}`,
    detalhe: { insc: ua.insc, prop: ua.prop, parentId },
  })

  return comGeometriaDoPai(ua, parentId)
}

export async function editarUnidade(
  parentId: number,
  uaId: number,
  dados: Record<string, unknown>,
  solicitante: { id: number },
) {
  await obterTerrenoPai(parentId)

  const ua = await prisma.imovel.findUnique({ where: { id: uaId } })
  if (!ua || !ua.ativo) throw new AppError(404, 'Unidade Autônoma não encontrada')
  if (ua.parentId !== parentId) throw new AppError(404, 'Unidade Autônoma não pertence a este imóvel')

  validarUsoEStatus(dados)

  const atualizacao: Record<string, unknown> = {}
  for (const campo of CAMPOS_UA_EDICAO) {
    if (campo in dados) atualizacao[campo] = dados[campo]
  }

  const atualizado = await prisma.imovel.update({ where: { id: uaId }, data: atualizacao as never })

  await registrarAuditoria({
    userId: solicitante.id,
    acao: 'UA_EDITADA',
    entidade: `Imovel:${uaId}`,
    detalhe: { insc: atualizado.insc, campos: Object.keys(atualizacao) },
  })

  return comGeometriaDoPai(atualizado, parentId)
}

export async function excluirUnidade(parentId: number, uaId: number, solicitante: { id: number }) {
  await obterTerrenoPai(parentId)

  const ua = await prisma.imovel.findUnique({ where: { id: uaId } })
  if (!ua) throw new AppError(404, 'Unidade Autônoma não encontrada')
  if (ua.parentId !== parentId) throw new AppError(404, 'Unidade Autônoma não pertence a este imóvel')
  if (!ua.ativo) throw new AppError(400, 'Unidade Autônoma já está excluída')

  const atualizado = await prisma.imovel.update({ where: { id: uaId }, data: { ativo: false } })

  await registrarAuditoria({
    userId: solicitante.id,
    acao: 'UA_EXCLUIDA',
    entidade: `Imovel:${uaId}`,
    detalhe: { insc: atualizado.insc },
  })

  return atualizado
}
