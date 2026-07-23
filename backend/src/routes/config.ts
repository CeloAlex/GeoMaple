import { Router } from 'express'
import { municipio } from '../config/municipio'

const router = Router()

// Pública (sem auth) — a tela de login e o cadastro precisam do nome/UF/centro do mapa
// antes de o operador estar autenticado. Nunca incluir aqui segredos (client_secret etc.).
router.get('/', (_req, res) => {
  res.json({ municipio })
})

export default router
