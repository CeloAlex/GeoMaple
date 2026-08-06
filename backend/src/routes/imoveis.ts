import { Router } from 'express'
import { auth } from '../middleware/auth'
import { permitir } from '../middleware/permission'
import { AppError } from '../utils/errors'
import {
  listarImoveis,
  obterImovel,
  criarImovel,
  editarImovel,
  excluirImovel,
  verificarDuplicidade,
} from '../services/imovelService'
import { atualizarGeometria, obterGeometria } from '../services/geoService'
import { listarUnidades, criarUnidade, editarUnidade, excluirUnidade } from '../services/uaService'

const router = Router()

function tratarErro(e: unknown, res: import('express').Response) {
  if (e instanceof AppError) {
    return res.status(e.status).json(e.details !== undefined ? { erro: e.message, detalhes: e.details } : { erro: e.message })
  }
  console.error(e)
  return res.status(500).json({ erro: 'Erro interno' })
}

router.get('/', auth, async (req, res) => {
  const { di, se, qu, prop, st, ativo, q } = req.query

  try {
    const imoveis = await listarImoveis({
      di: di ? String(di) : undefined,
      se: se ? String(se) : undefined,
      qu: qu ? String(qu) : undefined,
      prop: prop ? String(prop) : undefined,
      st: st ? String(st) : undefined,
      ativo: ativo === undefined ? undefined : ativo === 'true',
      q: q ? String(q) : undefined,
    })
    res.json(imoveis)
  } catch (e) {
    tratarErro(e, res)
  }
})

router.post('/', auth, permitir('admin', 'editor'), async (req, res) => {
  try {
    const imovel = await criarImovel(req.body, req.user!.id)
    res.status(201).json(imovel)
  } catch (e) {
    tratarErro(e, res)
  }
})

// Precisa vir antes de GET /:id — senão "verificar-duplicidade" seria interpretado como id.
router.get('/verificar-duplicidade', auth, async (req, res) => {
  const { log, nr, lat, lng, excluirId } = req.query
  try {
    const candidatos = await verificarDuplicidade({
      log: log ? String(log) : undefined,
      nr: nr ? String(nr) : undefined,
      lat: lat !== undefined ? Number(lat) : undefined,
      lng: lng !== undefined ? Number(lng) : undefined,
      excluirId: excluirId !== undefined ? Number(excluirId) : undefined,
    })
    res.json(candidatos)
  } catch (e) {
    tratarErro(e, res)
  }
})

router.get('/:id', auth, async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ erro: 'id inválido' })

  try {
    const imovel = await obterImovel(id)
    res.json(imovel)
  } catch (e) {
    tratarErro(e, res)
  }
})

router.put('/:id', auth, permitir('admin', 'editor'), async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ erro: 'id inválido' })

  try {
    const imovel = await editarImovel(id, req.body, req.user!)
    res.json(imovel)
  } catch (e) {
    tratarErro(e, res)
  }
})

router.get('/:id/geometria', auth, async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ erro: 'id inválido' })

  try {
    const geometria = await obterGeometria(id)
    res.json(geometria)
  } catch (e) {
    tratarErro(e, res)
  }
})

router.put('/:id/geometria', auth, permitir('admin', 'editor'), async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ erro: 'id inválido' })

  try {
    const imovel = await atualizarGeometria(id, req.body, req.user!)
    res.json(imovel)
  } catch (e) {
    tratarErro(e, res)
  }
})

router.get('/:id/unidades', auth, async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ erro: 'id inválido' })

  try {
    const unidades = await listarUnidades(id)
    res.json(unidades)
  } catch (e) {
    tratarErro(e, res)
  }
})

router.post('/:id/unidades', auth, permitir('admin', 'editor'), async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ erro: 'id inválido' })

  try {
    const ua = await criarUnidade(id, req.body, req.user!.id)
    res.status(201).json(ua)
  } catch (e) {
    tratarErro(e, res)
  }
})

router.put('/:id/unidades/:uaId', auth, permitir('admin', 'editor'), async (req, res) => {
  const id = Number(req.params.id)
  const uaId = Number(req.params.uaId)
  if (Number.isNaN(id) || Number.isNaN(uaId)) return res.status(400).json({ erro: 'id inválido' })

  try {
    const ua = await editarUnidade(id, uaId, req.body, req.user!)
    res.json(ua)
  } catch (e) {
    tratarErro(e, res)
  }
})

router.delete('/:id/unidades/:uaId', auth, permitir('admin', 'editor'), async (req, res) => {
  const id = Number(req.params.id)
  const uaId = Number(req.params.uaId)
  if (Number.isNaN(id) || Number.isNaN(uaId)) return res.status(400).json({ erro: 'id inválido' })

  try {
    const ua = await excluirUnidade(id, uaId, req.user!)
    res.json(ua)
  } catch (e) {
    tratarErro(e, res)
  }
})

router.delete('/:id', auth, permitir('admin', 'editor'), async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ erro: 'id inválido' })

  try {
    const imovel = await excluirImovel(id, req.user!)
    res.json(imovel)
  } catch (e) {
    tratarErro(e, res)
  }
})

export default router
