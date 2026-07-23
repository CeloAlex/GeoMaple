export type Operador = {
  id: number
  nome: string
  login: string
  email: string
  perm: 'admin' | 'editor' | 'viewer'
  ativo: boolean
  matricula: string | null
  setor: string | null
  telefone: string | null
  primeiroAcesso: boolean
  lastLoginAt: string | null
}
