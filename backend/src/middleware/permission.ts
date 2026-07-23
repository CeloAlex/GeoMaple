import { Request, Response, NextFunction } from 'express'

type Perfil = 'admin' | 'editor' | 'viewer'

export function permitir(...perfis: Perfil[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !perfis.includes(req.user.perm as Perfil)) {
      return res.status(403).json({ erro: 'Sem permissão para esta operação' })
    }
    next()
  }
}
