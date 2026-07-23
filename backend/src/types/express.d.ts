export {}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number
        nome: string
        login: string
        perm: string
        primeiroAcesso: boolean
        jti: string
      }
    }
  }
}
