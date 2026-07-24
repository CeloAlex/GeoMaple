import { Router } from 'express'
import { auth } from '../middleware/auth'
import { AppError } from '../utils/errors'
import { consultarCapacidadesWms } from '../services/geonetworkService'

const router = Router()

function tratarErro(e: unknown, res: import('express').Response) {
  if (e instanceof AppError) return res.status(e.status).json({ erro: e.message })
  console.error(e)
  return res.status(500).json({ erro: 'Erro interno' })
}

router.get('/capabilities', auth, async (req, res) => {
  const { url } = req.query
  if (!url || typeof url !== 'string') return res.status(400).json({ erro: 'url é obrigatória' })

  try {
    const dados = await consultarCapacidadesWms(url)
    res.json(dados)
  } catch (e) {
    tratarErro(e, res)
  }
})

export default router
