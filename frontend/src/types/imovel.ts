export type Usuario = {
  id: number
  nome: string
  login: string
  perm: 'admin' | 'editor' | 'viewer'
  primeiroAcesso: boolean
}

export type ImovelProperties = {
  id: number
  insc: string
  prop: string
  uso: string
  st: string
  at_cad: number | null
  at_geo: number | null
  parentId: number | null
  cib: string | null
}

export type ImovelFeature = {
  type: 'Feature'
  geometry: { type: 'Polygon'; coordinates: number[][][] }
  properties: ImovelProperties
}

export type ImovelFeatureCollection = {
  type: 'FeatureCollection'
  features: ImovelFeature[]
}

export type PolygonGeoJSON = {
  type: 'Polygon'
  coordinates: number[][][]
}

// Registro completo retornado por GET /api/imoveis/:id ou pela listagem GET /api/imoveis
export type ImovelRegistro = {
  id: number
  insc: string
  cod: string | null
  prop: string
  log: string | null
  nr: string | null
  bai: string | null
  cep: string | null
  uso: string
  tp: string | null
  st: string
  at_cad: number | null
  at_geo: number | null
  ac_cad: number | null
  ac_geo: number | null
  num_pav: number | null
  frac_ideal: string | null
  obs: string | null
  parentId: number | null
  cib: string | null
  cib_status: string | null
  cadurb_tipo: number | null
  tp_arq: number | null
  dest: number | null
  padrao: number | null
  ano_constr: number | null
  valor_venal: number | null
}

export type ImovelGeometria = {
  at_geo: number | null
  ac_geo: number | null
  geom: PolygonGeoJSON | null
  geom_bld: PolygonGeoJSON | null
}
