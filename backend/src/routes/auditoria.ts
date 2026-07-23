import { Router } from 'express'
import { prisma } from '../db'
import { auth } from '../middleware/auth'
import { permitir } from '../middleware/permission'

const router = Router()

function montarFiltro(query: Record<string, unknown>) {
  const where: Record<string, unknown> = {}
  if (query.userId) where.userId = Number(query.userId)
  if (query.acao) where.acao = String(query.acao)
  if (query.entidade) where.entidade = { startsWith: String(query.entidade) }

  const createdAt: Record<string, Date> = {}
  if (query.de) createdAt.gte = new Date(String(query.de))
  if (query.ate) createdAt.lte = new Date(String(query.ate))
  if (Object.keys(createdAt).length > 0) where.createdAt = createdAt

  return where
}

// Só admin vê a trilha completa; qualquer operador autenticado pode consultar a própria
// (usada pelo "Minha atividade" — o middleware abaixo garante userId=self quando não-admin).
router.get('/', auth, async (req, res) => {
  const isAdmin = req.user!.perm === 'admin'
  if (!isAdmin && req.query.userId && Number(req.query.userId) !== req.user!.id) {
    return res.status(403).json({ erro: 'Você só pode consultar sua própria atividade' })
  }

  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50))
  const where = montarFiltro(req.query as Record<string, unknown>)
  if (!isAdmin) where.userId = req.user!.id

  const [total, itens] = await Promise.all([
    prisma.auditoria.count({ where }),
    prisma.auditoria.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { nome: true, login: true } } },
    }),
  ])

  res.json({ total, page, limit, itens })
})

// Histórico de um imóvel específico (aba "Histórico" no painel de detalhe)
router.get('/imovel/:id', auth, async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ erro: 'id inválido' })

  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '10'), 10) || 10))

  const itens = await prisma.auditoria.findMany({
    where: { entidade: `Imovel:${id}` },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { nome: true, login: true } } },
  })
  res.json(itens)
})

// Atividade de um operador (admin, ou o próprio operador)
router.get('/user/:id', auth, async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ erro: 'id inválido' })
  if (req.user!.perm !== 'admin' && req.user!.id !== id) {
    return res.status(403).json({ erro: 'Sem permissão' })
  }

  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50))

  const [total, itens] = await Promise.all([
    prisma.auditoria.count({ where: { userId: id } }),
    prisma.auditoria.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { nome: true, login: true } } },
    }),
  ])

  res.json({ total, page, limit, itens })
})

function csvEscape(valor: unknown) {
  const s = valor == null ? '' : String(valor)
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

router.get('/export', auth, permitir('admin'), async (req, res) => {
  const where = montarFiltro(req.query as Record<string, unknown>)
  const itens = await prisma.auditoria.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 5000,
    include: { user: { select: { nome: true, login: true } } },
  })

  const linhas = [
    ['data', 'operador', 'login', 'acao', 'entidade', 'ip', 'detalhe'].join(';'),
    ...itens.map((i) =>
      [i.createdAt.toISOString(), i.user.nome, i.user.login, i.acao, i.entidade ?? '', i.ip ?? '', i.detalhe ?? '']
        .map(csvEscape)
        .join(';'),
    ),
  ].join('\r\n')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="auditoria.csv"')
  res.send(linhas)
})

export default router
