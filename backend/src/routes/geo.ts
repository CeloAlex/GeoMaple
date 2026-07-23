import { Router } from 'express'
import { auth } from '../middleware/auth'
import { AppError } from '../utils/errors'
import { imoveisNoBbox } from '../services/geoService'

const router = Router()

router.get('/bbox', auth, async (req, res) => {
  try {
    const featureCollection = await imoveisNoBbox(req.query.bbox)
    res.json(featureCollection)
  } catch (e) {
    if (e instanceof AppError) return res.status(e.status).json({ erro: e.message })
    console.error(e)
    res.status(500).json({ erro: 'Erro interno' })
  }
})

export default router
