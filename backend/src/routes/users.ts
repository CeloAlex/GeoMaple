import { Router } from 'express'
import { auth } from '../middleware/auth'
import { permitir } from '../middleware/permission'
import { AppError } from '../utils/errors'
import {
  listarUsuarios,
  obterUsuario,
  criarUsuario,
  editarUsuario,
  alterarSenhaOperador,
  alterarStatusAtivo,
} from '../services/userService'

const router = Router()

function tratarErro(e: unknown, res: import('express').Response) {
  if (e instanceof AppError) return res.status(e.status).json({ erro: e.message })
  console.error(e)
  return res.status(500).json({ erro: 'Erro interno' })
}

router.get('/', auth, permitir('admin'), async (req, res) => {
  const { ativo } = req.query
  const filtro = ativo === undefined ? undefined : ativo === 'true'

  try {
    const usuarios = await listarUsuarios(filtro)
    res.json(usuarios)
  } catch (e) {
    tratarErro(e, res)
  }
})

router.post('/', auth, permitir('admin'), async (req, res) => {
  try {
    const resultado = await criarUsuario(req.body, req.user!.id)
    res.status(201).json(resultado)
  } catch (e) {
    tratarErro(e, res)
  }
})

router.get('/:id', auth, async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ erro: 'id inválido' })

  const isAdmin = req.user!.perm === 'admin'
  if (!isAdmin && req.user!.id !== id) {
    return res.status(403).json({ erro: 'Sem permissão para visualizar este operador' })
  }

  try {
    const usuario = await obterUsuario(id)
    res.json(usuario)
  } catch (e) {
    tratarErro(e, res)
  }
})

router.put('/:id', auth, async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ erro: 'id inválido' })

  try {
    const usuario = await editarUsuario(id, req.body, req.user!)
    res.json(usuario)
  } catch (e) {
    tratarErro(e, res)
  }
})

router.patch('/:id/senha', auth, async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ erro: 'id inválido' })

  try {
    const resultado = await alterarSenhaOperador(id, req.user!, req.body)
    res.json(resultado)
  } catch (e) {
    tratarErro(e, res)
  }
})

router.patch('/:id/ativo', auth, permitir('admin'), async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ erro: 'id inválido' })

  const { ativo } = req.body
  if (typeof ativo !== 'boolean') {
    return res.status(400).json({ erro: 'ativo deve ser booleano' })
  }

  try {
    const usuario = await alterarStatusAtivo(id, ativo, req.user!)
    res.json(usuario)
  } catch (e) {
    tratarErro(e, res)
  }
})

export default router
