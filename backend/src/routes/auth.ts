import { Router } from 'express'
import { login, refresh, trocarSenha } from '../services/authService'
import { AppError } from '../utils/errors'
import { auth } from '../middleware/auth'

const router = Router()

router.post('/login', async (req, res) => {
  const { login: loginInput, senha } = req.body
  if (!loginInput || !senha) {
    return res.status(400).json({ erro: 'login e senha são obrigatórios' })
  }

  try {
    const resultado = await login(loginInput, senha, req.ip)
    res.json(resultado)
  } catch (e) {
    if (e instanceof AppError) return res.status(e.status).json({ erro: e.message })
    console.error(e)
    res.status(500).json({ erro: 'Erro interno' })
  }
})

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(400).json({ erro: 'refreshToken é obrigatório' })

  try {
    const resultado = await refresh(refreshToken)
    res.json(resultado)
  } catch (e) {
    if (e instanceof AppError) return res.status(e.status).json({ erro: e.message })
    console.error(e)
    res.status(500).json({ erro: 'Erro interno' })
  }
})

router.patch('/senha', auth, async (req, res) => {
  const { senhaAtual, senhaNova } = req.body
  if (!senhaAtual || !senhaNova) {
    return res.status(400).json({ erro: 'senhaAtual e senhaNova são obrigatórios' })
  }

  try {
    await trocarSenha(req.user!.id, senhaAtual, senhaNova)
    res.json({ ok: true })
  } catch (e) {
    if (e instanceof AppError) return res.status(e.status).json({ erro: e.message })
    console.error(e)
    res.status(500).json({ erro: 'Erro interno' })
  }
})

export default router
