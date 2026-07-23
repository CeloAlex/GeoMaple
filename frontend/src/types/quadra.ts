import type { PolygonGeoJSON } from './imovel'

export type Quadra = {
  id: number
  di: string
  se: string
  qu: string
  cod: string | null
  obs: string | null
  geom: PolygonGeoJSON | null
}
