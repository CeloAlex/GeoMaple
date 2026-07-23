import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'

const ACCESS_SECRET = process.env.JWT_SECRET!
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!

export interface AccessPayload {
  sub: number
  login: string
  perm: string
  jti: string
}

export interface RefreshPayload {
  sub: number
  jti: string
}

export function gerarAccessToken(usuario: { id: number; login: string; perm: string }) {
  const jti = randomUUID()
  const token = jwt.sign(
    { sub: usuario.id, login: usuario.login, perm: usuario.perm, jti },
    ACCESS_SECRET,
    { expiresIn: '8h' },
  )
  return { token, jti }
}

export function gerarRefreshToken(usuario: { id: number }) {
  const jti = randomUUID()
  const token = jwt.sign({ sub: usuario.id, jti }, REFRESH_SECRET, { expiresIn: '7d' })
  return { token, jti }
}

export function verificarAccessToken(token: string): AccessPayload {
  return jwt.verify(token, ACCESS_SECRET) as unknown as AccessPayload
}

export function verificarRefreshToken(token: string): RefreshPayload {
  return jwt.verify(token, REFRESH_SECRET) as unknown as RefreshPayload
}
