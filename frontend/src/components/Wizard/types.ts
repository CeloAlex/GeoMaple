import type { PolygonGeoJSON } from '../../types/imovel'

export type WizardFormData = {
  // Etapa 1 — Inscrição
  di: string
  se: string
  qu: string
  lote: string
  unidade: string

  // Etapa 2 — Localização
  log: string
  nr: string
  bai: string
  cep: string

  // Etapa 3 — Georreferenciamento
  geom: PolygonGeoJSON | null
  geomBld: PolygonGeoJSON | null
  areaTerrenoCalc: number | null // área geodésica estimada no navegador (m²), só para exibição/alerta
  areaEdifCalc: number | null

  // Etapa 4 — Dados cadastrais
  prop: string
  uso: 'terreno' | 'construido' | 'em_construcao'
  tp: string
  st: 'regular' | 'em_fiscalizacao' | 'para_revisao'
  at_cad: string
  ac_cad: string
  num_pav: string
  frac_ideal: string
  obs: string
  cadurb_tipo: string
  tp_arq: string
  dest: string
  padrao: string
  ano_constr: string
  valor_venal: string
}

export const FORM_INICIAL: WizardFormData = {
  di: '',
  se: '',
  qu: '',
  lote: '',
  unidade: '000',

  log: '',
  nr: '',
  bai: '',
  cep: '',

  geom: null,
  geomBld: null,
  areaTerrenoCalc: null,
  areaEdifCalc: null,

  prop: '',
  uso: 'terreno',
  tp: '',
  st: 'regular',
  at_cad: '',
  ac_cad: '',
  num_pav: '',
  frac_ideal: '',
  obs: '',
  cadurb_tipo: '',
  tp_arq: '',
  dest: '1',
  padrao: '',
  ano_constr: '',
  valor_venal: '',
}

export type ImovelHerdado = {
  id: number
  insc: string
  prop: string
  log: string | null
  nr: string | null
  bai: string | null
  cep: string | null
  at_geo: number | null
  at_cad: number | null
  geom: PolygonGeoJSON | null
}

export const USO_LABEL: Record<WizardFormData['uso'], string> = {
  terreno: 'Terreno',
  construido: 'Construído',
  em_construcao: 'Em construção',
}

export const STATUS_LABEL: Record<WizardFormData['st'], string> = {
  regular: 'Regular',
  em_fiscalizacao: 'Em fiscalização',
  para_revisao: 'Para revisão',
}

export const CADURB_TIPO_LABEL: Record<string, string> = {
  '1': 'Territorial (sem edificação)',
  '2': 'Predial (com edificação)',
  '3': 'Bem de características especiais',
}

export const TP_ARQ_LABEL: Record<string, string> = {
  '1': 'Casa',
  '2': 'Apartamento',
  '3': 'Vaga de garagem',
  '4': 'Lage',
  '5': 'Sala',
  '6': 'Conjunto de salas',
  '7': 'Loja',
  '8': 'Sobreloja',
  '9': 'Estacionamento',
  '10': 'Barraco',
  '11': 'Galpão',
  '12': 'Outro',
}

export const DEST_LABEL: Record<string, string> = {
  '1': 'Residencial',
  '2': 'Comercial',
  '3': 'Prestação de serviço',
  '4': 'Industrial',
  '5': 'Educacional',
  '6': 'Lazer',
  '9': 'Institucional',
  '14': 'Uso misto',
}

export const PADRAO_LABEL: Record<string, string> = {
  '1': 'Popular',
  '2': 'Baixo',
  '3': 'Normal',
  '4': 'Alto',
  '5': 'Luxo',
}
