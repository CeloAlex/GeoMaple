import { Router } from 'express'
import { auth } from '../middleware/auth'
import { permitir } from '../middleware/permission'
import { AppError } from '../utils/errors'
import {
  listarLogradouros,
  obterLogradouro,
  criarLogradouro,
  editarLogradouro,
  excluirLogradouro,
  buscarPorNome,
  verificarDenominacao,
} from '../services/logradouroService'

const router = Router()

function tratarErro(e: unknown, res: import('express').Response) {
  if (e instanceof AppError) return res.status(e.status).json({ erro: e.message })
  console.error(e)
  return res.status(500).json({ erro: 'Erro interno' })
}

router.get('/', auth, async (_req, res) => {
  try {
    res.json(await listarLogradouros())
  } catch (e) {
    tratarErro(e, res)
  }
})

// Precisa vir antes de GET /:id — senão "buscar" seria interpretado como id.
router.get('/buscar', auth, async (req, res) => {
  const nome = String(req.query.nome ?? '').trim()
  if (!nome) return res.json([])
  try {
    res.json(await buscarPorNome(nome))
  } catch (e) {
    tratarErro(e, res)
  }
})

// Certidão de Denominação de Logradouro (TESTE 7) — valida um eixo desenhado avulso
// (não salvo como Logradouro) antes da emissão.
router.post('/verificar-denominacao', auth, async (req, res) => {
  try {
    res.json(await verificarDenominacao(req.body.nome, req.body.geom))
  } catch (e) {
    tratarErro(e, res)
  }
})

router.get('/:id', auth, async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ erro: 'id inválido' })
  try {
    res.json(await obterLogradouro(id))
  } catch (e) {
    tratarErro(e, res)
  }
})

router.post('/', auth, permitir('admin', 'editor'), async (req, res) => {
  try {
    const logradouro = await criarLogradouro(req.body, req.user!.id)
    res.status(201).json(logradouro)
  } catch (e) {
    tratarErro(e, res)
  }
})

router.put('/:id', auth, permitir('admin', 'editor'), async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ erro: 'id inválido' })
  try {
    res.json(await editarLogradouro(id, req.body, req.user!.id))
  } catch (e) {
    tratarErro(e, res)
  }
})

router.delete('/:id', auth, permitir('admin', 'editor'), async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ erro: 'id inválido' })
  try {
    res.json(await excluirLogradouro(id, req.user!.id))
  } catch (e) {
    tratarErro(e, res)
  }
})

export default router
