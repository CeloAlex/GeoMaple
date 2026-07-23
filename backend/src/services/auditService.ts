import { prisma } from '../db'

// Monta {antes, depois} só com os campos que de fato mudaram — usado para o diff colorido
// (vermelho=antes, verde=depois) na tela de auditoria.
export function calcDiff(
  registroAntes: Record<string, unknown>,
  registroDepois: Record<string, unknown>,
  campos: string[],
) {
  const antes: Record<string, unknown> = {}
  const depois: Record<string, unknown> = {}
  for (const campo of campos) {
    if (registroAntes[campo] !== registroDepois[campo]) {
      antes[campo] = registroAntes[campo] ?? null
      depois[campo] = registroDepois[campo] ?? null
    }
  }
  return { antes, depois }
}

export async function registrarAuditoria(params: {
  userId: number
  acao: string
  entidade?: string
  detalhe?: object | string
  ip?: string
}) {
  // Auditoria nunca deve quebrar a operação principal
  try {
    await prisma.auditoria.create({
      data: {
        userId: params.userId,
        acao: params.acao,
        entidade: params.entidade,
        detalhe:
          typeof params.detalhe === 'string'
            ? params.detalhe
            : params.detalhe
              ? JSON.stringify(params.detalhe)
              : undefined,
        ip: params.ip,
      },
    })
  } catch (e) {
    console.error('[AUDITORIA] Falha ao registrar:', e)
  }
}
