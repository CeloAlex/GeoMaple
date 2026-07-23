import type { PolygonGeoJSON } from './imovel'

export type Provisorio = {
  id: number
  nome: string
  tipo: string
  status: string
  obs: string | null
  geom: PolygonGeoJSON | null
}
