import type { PolygonGeoJSON } from '../../types/imovel'
import type { Provisorio } from '../../types/provisorio'

export type ProvisorioFormData = {
  nome: string
  tipo: string
  status: string
  obs: string
  geom: PolygonGeoJSON | null
}

// Mesmas opções do protótipo SGCIM_v10.html (prov-tipo / prov-status)
export const TIPO_LABEL: Record<string, string> = {
  rural: 'Imóvel rural',
  estudo: 'Área em estudo',
  levantamento: 'Levantamento de campo',
  sem_id: 'Sem identificação',
  fiscalizacao: 'Fiscalização',
  novo: 'Novo cadastro',
}

export const STATUS_LABEL: Record<string, string> = {
  em_estudo: 'Em estudo',
  levantamento: 'Levantamento',
  fiscalizacao: 'Fiscalização',
  novo: 'Novo',
  convertido: 'Convertido em cadastro',
}

export function formVazio(): ProvisorioFormData {
  return { nome: '', tipo: 'rural', status: 'em_estudo', obs: '', geom: null }
}

export function provisorioParaForm(p: Provisorio): ProvisorioFormData {
  return { nome: p.nome, tipo: p.tipo, status: p.status, obs: p.obs ?? '', geom: p.geom }
}
