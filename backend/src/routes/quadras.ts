import { Router } from 'express'
import { auth } from '../middleware/auth'
import { permitir } from '../middleware/permission'
import { AppError } from '../utils/errors'
import { listarQuadras, obterQuadra, criarQuadra, editarQuadra, excluirQuadra } from '../services/quadraService'

const router = Router()

function tratarErro(e: unknown, res: import('express').Response) {
  if (e instanceof AppError) return res.status(e.status).json({ erro: e.message })
  console.error(e)
  return res.status(500).json({ erro: 'Erro interno' })
}

router.get('/', auth, async (_req, res) => {
  try {
    res.json(await listarQuadras())
  } catch (e) {
    tratarErro(e, res)
  }
})

router.get('/:id', auth, async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ erro: 'id inválido' })
  try {
    res.json(await obterQuadra(id))
  } catch (e) {
    tratarErro(e, res)
  }
})

router.post('/', auth, permitir('admin', 'editor'), async (req, res) => {
  try {
    const quadra = await criarQuadra(req.body, req.user!.id)
    res.status(201).json(quadra)
  } catch (e) {
    tratarErro(e, res)
  }
})

router.put('/:id', auth, permitir('admin', 'editor'), async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ erro: 'id inválido' })
  try {
    res.json(await editarQuadra(id, req.body, req.user!.id))
  } catch (e) {
    tratarErro(e, res)
  }
})

router.delete('/:id', auth, permitir('admin', 'editor'), async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ erro: 'id inválido' })
  try {
    res.json(await excluirQuadra(id, req.user!.id))
  } catch (e) {
    tratarErro(e, res)
  }
})

export default router
