import { Router } from 'express'
import { auth } from '../middleware/auth'
import { permitir } from '../middleware/permission'
import { AppError } from '../utils/errors'
import {
  listarProvisorios,
  obterProvisorio,
  criarProvisorio,
  editarProvisorio,
  excluirProvisorio,
} from '../services/provisorioService'

const router = Router()

function tratarErro(e: unknown, res: import('express').Response) {
  if (e instanceof AppError) return res.status(e.status).json({ erro: e.message })
  console.error(e)
  return res.status(500).json({ erro: 'Erro interno' })
}

router.get('/', auth, async (_req, res) => {
  try {
    res.json(await listarProvisorios())
  } catch (e) {
    tratarErro(e, res)
  }
})

router.get('/:id', auth, async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ erro: 'id inválido' })
  try {
    res.json(await obterProvisorio(id))
  } catch (e) {
    tratarErro(e, res)
  }
})

router.post('/', auth, permitir('admin', 'editor'), async (req, res) => {
  try {
    const provisorio = await criarProvisorio(req.body, req.user!.id)
    res.status(201).json(provisorio)
  } catch (e) {
    tratarErro(e, res)
  }
})

router.put('/:id', auth, permitir('admin', 'editor'), async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ erro: 'id inválido' })
  try {
    res.json(await editarProvisorio(id, req.body, req.user!.id))
  } catch (e) {
    tratarErro(e, res)
  }
})

router.delete('/:id', auth, permitir('admin', 'editor'), async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ erro: 'id inválido' })
  try {
    res.json(await excluirProvisorio(id, req.user!.id))
  } catch (e) {
    tratarErro(e, res)
  }
})

export default router
