import { Router } from 'express'
import { auth } from '../middleware/auth'
import { permitir } from '../middleware/permission'
import { AppError } from '../utils/errors'
import { emitirCertidao, verificarCertidao } from '../services/certidaoService'

const router = Router()

function tratarErro(e: unknown, res: import('express').Response) {
  if (e instanceof AppError) return res.status(e.status).json({ erro: e.message })
  console.error(e)
  return res.status(500).json({ erro: 'Erro interno' })
}

router.post('/', auth, permitir('admin', 'editor'), async (req, res) => {
  try {
    const certidao = await emitirCertidao(req.body, req.user!.id)
    res.status(201).json(certidao)
  } catch (e) {
    tratarErro(e, res)
  }
})

// Pública — sem `auth` — para qualquer pessoa conferir a autenticidade de uma certidão
// impressa pelo código de verificação, sem precisar de login no sistema.
router.get('/verificar/:codigo', async (req, res) => {
  try {
    res.json(await verificarCertidao(req.params.codigo))
  } catch (e) {
    tratarErro(e, res)
  }
})

export default router
