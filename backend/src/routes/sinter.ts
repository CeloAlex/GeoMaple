import { Router } from 'express'
import { auth } from '../middleware/auth'
import { permitir } from '../middleware/permission'
import { AppError } from '../utils/errors'
import { prisma } from '../db'
import { transmitirImovel, montarPayloadSinter, validarPayloadSinter, sinterConfigurado } from '../services/sinterService'

const router = Router()

// Prévia do payload CADURB sem transmitir — o frontend usa isto para mostrar o payload e os
// erros de validação antes do operador confirmar o envio (mesmo fluxo do modal do protótipo).
router.get('/preview/:imovelId', auth, permitir('admin', 'editor'), async (req, res) => {
  const imovelId = Number(req.params.imovelId)
  if (Number.isNaN(imovelId)) return res.status(400).json({ erro: 'imovelId inválido' })

  const imovel = await prisma.imovel.findUnique({ where: { id: imovelId } })
  if (!imovel) return res.status(404).json({ erro: 'Imóvel não encontrado' })

  const payload = montarPayloadSinter(imovel)
  const erros = validarPayloadSinter(payload)
  res.json({ payload, erros, configurado: sinterConfigurado() })
})

router.post('/transmitir/:imovelId', auth, permitir('admin', 'editor'), async (req, res) => {
  const imovelId = Number(req.params.imovelId)
  if (Number.isNaN(imovelId)) return res.status(400).json({ erro: 'imovelId inválido' })

  try {
    const imovel = await transmitirImovel(imovelId, req.user!)
    res.json(imovel)
  } catch (e) {
    if (e instanceof AppError) return res.status(e.status).json({ erro: e.message })
    console.error('[SINTER] Falha inesperada na transmissão')
    res.status(500).json({ erro: 'Erro interno' })
  }
})

export default router
