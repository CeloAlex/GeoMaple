import type { Operador } from '../../types/usuario'

export type OperadorFormData = {
  nome: string
  email: string
  login: string
  perm: string
  matricula: string
  setor: string
  telefone: string
}

export function operadorParaForm(o: Operador): OperadorFormData {
  return {
    nome: o.nome,
    email: o.email,
    login: o.login,
    perm: o.perm,
    matricula: o.matricula ?? '',
    setor: o.setor ?? '',
    telefone: o.telefone ?? '',
  }
}

export function formVazio(): OperadorFormData {
  return { nome: '', email: '', login: '', perm: 'viewer', matricula: '', setor: '', telefone: '' }
}
