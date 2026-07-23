import L from 'leaflet'
import 'leaflet-draw'
import type { PolygonGeoJSON } from '../../types/imovel'

export function poligonoParaLatLngs(geom: PolygonGeoJSON): L.LatLngExpression[] {
  return geom.coordinates[0].slice(0, -1).map(([lng, lat]) => [lat, lng])
}

export function layerParaPoligono(layer: L.Polygon): PolygonGeoJSON {
  let anel = layer.getLatLngs()[0] as L.LatLng[] | L.LatLng[][]
  if (Array.isArray(anel[0])) anel = (anel as L.LatLng[][])[0]
  const pontos = (anel as L.LatLng[]).map((p): [number, number] => [p.lng, p.lat])
  pontos.push(pontos[0])
  return { type: 'Polygon', coordinates: [pontos] }
}

export function calcularArea(layer: L.Polygon): number {
  return L.GeometryUtil.geodesicArea(layer.getLatLngs()[0] as L.LatLng[])
}
