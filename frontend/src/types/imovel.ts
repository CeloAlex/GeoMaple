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
  at_aviso_ok: boolean
  ac_aviso_ok: boolean
  num_pav: number | null
  frac_ideal: string | null
  matricula: string | null
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

// GET /api/imoveis/:id/geometria retorna, na prática, todos os campos do imóvel (o
// backend faz `{ ...imovel, ...geometria }`) — não só os 4 campos geométricos. O tipo
// reflete isso para permitir montar o imóvel selecionado (DetailPanel/ficha) com um único
// fetch, sem precisar de uma segunda chamada a GET /api/imoveis/:id.
export type ImovelGeometria = ImovelRegistro & {
  geom: PolygonGeoJSON | null
  geom_bld: PolygonGeoJSON | null
}

// Retornado pelo backend (409) quando a geometria enviada em PUT /:id/geometria sobrepõe a
// de outro terreno já cadastrado — ver `detalhes` na resposta de erro (geoService.ts).
export type ConflitoGeometria = { id: number; insc: string; prop: string }

// Retornado por GET /api/imoveis/verificar-duplicidade — candidatos a cadastro duplicado
// por mesmo endereço e/ou proximidade geográfica (ver imovelService.ts).
export type DuplicataCandidata = {
  id: number
  insc: string
  prop: string
  log: string | null
  nr: string | null
  motivos: ('endereco' | 'proximidade')[]
}

// Imóvel selecionado no mapa (clique no polígono ou na árvore/busca) — sempre com o
// registro completo, ao contrário de ImovelFeature (campos reduzidos vindos do bbox do
// mapa, usados só para estilizar/clicar os polígonos da camada de Imóveis).
export type ImovelSelecionado = {
  type: 'Feature'
  geometry: PolygonGeoJSON
  properties: ImovelGeometria
}
