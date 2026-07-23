import bcrypt from 'bcrypt'
import { prisma } from '../db'
import { gerarAccessToken, gerarRefreshToken, verificarRefreshToken } from '../utils/jwt'
import { registrarAuditoria } from './auditService'
import { AppError } from '../utils/errors'

const MAX_TENTATIVAS = 5

export async function login(loginInput: string, senha: string, ip?: string) {
  const usuario = await prisma.user.findUnique({ where: { login: loginInput } })

  if (!usuario) {
    throw new AppError(401, 'Login ou senha inválidos')
  }

  if (!usuario.ativo) {
    throw new AppError(401, 'Usuário desativado. Procure o administrador.')
  }

  if (usuario.tentativasFalhas >= MAX_TENTATIVAS) {
    throw new AppError(401, 'Usuário bloqueado após múltiplas tentativas incorretas. Procure o administrador.')
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senha)

  if (!senhaValida) {
    const tentativas = usuario.tentativasFalhas + 1
    await prisma.user.update({ where: { id: usuario.id }, data: { tentativasFalhas: tentativas } })
    await registrarAuditoria({ userId: usuario.id, acao: 'LOGIN_FALHA', entidade: `User:${usuario.id}`, ip })

    if (tentativas >= MAX_TENTATIVAS) {
      throw new AppError(401, 'Usuário bloqueado após 5 tentativas incorretas. Procure o administrador.')
    }
    throw new AppError(401, 'Login ou senha inválidos')
  }

  await prisma.user.update({
    where: { id: usuario.id },
    data: { tentativasFalhas: 0, lastLoginAt: new Date(), lastLoginIp: ip },
  })

  await registrarAuditoria({ userId: usuario.id, acao: 'LOGIN', entidade: `User:${usuario.id}`, ip })

  const { token: accessToken } = gerarAccessToken(usuario)
  const { token: refreshToken } = gerarRefreshToken(usuario)

  return {
    accessToken,
    refreshToken,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      login: usuario.login,
      perm: usuario.perm,
      primeiroAcesso: usuario.primeiroAcesso,
    },
  }
}

export async function refresh(refreshToken: string) {
  let payload
  try {
    payload = verificarRefreshToken(refreshToken)
  } catch {
    throw new AppError(401, 'Refresh token inválido ou expirado')
  }

  const usuario = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!usuario || !usuario.ativo) {
    throw new AppError(401, 'Usuário inválido')
  }

  const { token: accessToken } = gerarAccessToken(usuario)
  return { accessToken }
}

export async function trocarSenha(userId: number, senhaAtual: string, senhaNova: string) {
  const usuario = await prisma.user.findUnique({ where: { id: userId } })
  if (!usuario) throw new AppError(404, 'Usuário não encontrado')

  const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha)
  if (!senhaValida) throw new AppError(401, 'Senha atual incorreta')

  if (senhaNova.length < 8) {
    throw new AppError(400, 'A nova senha deve ter no mínimo 8 caracteres')
  }

  const hash = await bcrypt.hash(senhaNova, 10)
  await prisma.user.update({
    where: { id: userId },
    data: { senha: hash, primeiroAcesso: false },
  })

  await registrarAuditoria({ userId, acao: 'SENHA_TROCA', entidade: `User:${userId}` })
}
