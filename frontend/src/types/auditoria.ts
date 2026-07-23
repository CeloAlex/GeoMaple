export type EventoAuditoria = {
  id: number
  userId: number
  acao: string
  entidade: string | null
  detalhe: string | null
  ip: string | null
  createdAt: string
  user: { nome: string; login: string }
}

export type PaginaAuditoria = {
  total: number
  page: number
  limit: number
  itens: EventoAuditoria[]
}
