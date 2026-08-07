import crypto from 'crypto'
import { prisma } from '../db'
import { AppError } from '../utils/errors'
import { registrarAuditoria } from './auditService'

// 'existencia_denominacao'/'identificacao_logradouro' não são mais emitidos por nenhuma
// tela (unificados em 'denominacao_logradouro', TESTE 7) — continuam na lista só para não
// quebrar a verificação pública (GET /verificar/:codigo) de certidões já emitidas.
const TIPOS_CERTIDAO = ['existencia_denominacao', 'identificacao_logradouro', 'denominacao_logradouro']

// Emite uma certidão, alocando o próximo número sequencial do ano para o tipo (ex.:
// "001/2026", "002/2026"...) e um código de verificação único. `pg_advisory_xact_lock`
// serializa emissões concorrentes do MESMO tipo+ano (mesma trava dentro da transação, sem
// precisar de linha existente para travar — importante para a primeira certidão do ano).
export async function emitirCertidao(
  dados: { tipo?: string; logradouroId?: number; nomeConsultado?: string; resultadoValidacao?: unknown },
  solicitanteId: number,
) {
  const tipo = dados.tipo
  if (!tipo || !TIPOS_CERTIDAO.includes(tipo)) {
    throw new AppError(400, `tipo deve ser um de: ${TIPOS_CERTIDAO.join(', ')}`)
  }
  if (dados.logradouroId == null && !dados.nomeConsultado?.trim()) {
    throw new AppError(400, 'Informe logradouroId (via do mapa) ou nomeConsultado (nome sugerido)')
  }

  let logradouro: { id: number; nome: string; tipo: string; situacao: string } | null = null
  if (dados.logradouroId != null) {
    logradouro = await prisma.logradouro.findUnique({
      where: { id: dados.logradouroId },
      select: { id: true, nome: true, tipo: true, situacao: true },
    })
    if (!logradouro) throw new AppError(400, 'logradouroId não corresponde a um logradouro existente')
  }

  const ano = new Date().getFullYear()
  const codigoVerificacao = crypto.randomBytes(6).toString('hex').toUpperCase()

  const certidao = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${tipo}:${ano}`}))`
    const agregado = await tx.certidao.aggregate({ where: { tipo, ano }, _max: { seq: true } })
    const seq = (agregado._max.seq ?? 0) + 1
    const numero = `${String(seq).padStart(3, '0')}/${ano}`
    return tx.certidao.create({
      data: {
        tipo,
        ano,
        seq,
        numero,
        codigoVerificacao,
        logradouroId: dados.logradouroId ?? null,
        nomeConsultado: dados.nomeConsultado?.trim() || null,
        emitidoPorId: solicitanteId,
      },
    })
  })

  await registrarAuditoria({
    userId: solicitanteId,
    acao: 'CERTIDAO_EMITIDA',
    entidade: `Certidao:${certidao.id}`,
    detalhe: {
      tipo,
      numero: certidao.numero,
      logradouroId: dados.logradouroId,
      nomeConsultado: dados.nomeConsultado,
      ...(dados.resultadoValidacao ? { resultadoValidacao: dados.resultadoValidacao } : {}),
    },
  })

  return { ...certidao, logradouro }
}

// Rota pública (sem auth) — qualquer pessoa de posse do código impresso na certidão pode
// conferir sua autenticidade.
export async function verificarCertidao(codigo: string) {
  const certidao = await prisma.certidao.findUnique({
    where: { codigoVerificacao: codigo.trim().toUpperCase() },
    include: {
      logradouro: { select: { nome: true, tipo: true, situacao: true } },
      emitidoPor: { select: { nome: true } },
    },
  })
  if (!certidao) throw new AppError(404, 'Código de verificação não encontrado')
  return certidao
}
