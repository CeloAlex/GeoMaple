import { Request, Response, NextFunction } from 'express'
import { verificarAccessToken } from '../utils/jwt'
import { prisma } from '../db'

export async function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não informado' })
  }

  const token = header.slice('Bearer '.length)

  try {
    const payload = verificarAccessToken(token)
    const usuario = await prisma.user.findUnique({ where: { id: payload.sub } })

    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ erro: 'Usuário inativo ou não encontrado' })
    }

    req.user = {
      id: usuario.id,
      nome: usuario.nome,
      login: usuario.login,
      perm: usuario.perm,
      primeiroAcesso: usuario.primeiroAcesso,
      jti: payload.jti,
    }
    next()
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' })
  }
}
