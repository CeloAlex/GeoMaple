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

// Parseia uma lista de coordenadas colada pelo operador (uma por linha, "lat,lng" /
// "lat lng" / "lat;lng" — graus decimais). Usada como alternativa a desenhar clicando no
// mapa, para quem já tem uma lista de pontos de GPS/estação total. Retorna null se não
// houver ao menos 3 pontos válidos (mínimo para formar um polígono).
export function parseListaCoordenadas(texto: string): L.LatLngExpression[] | null {
  const pontos: L.LatLngExpression[] = []
  for (const linha of texto.split('\n')) {
    const limpa = linha.trim()
    if (!limpa) continue
    const partes = limpa.split(/[,; \t]+/).filter(Boolean)
    if (partes.length < 2) continue
    const lat = Number(partes[0])
    const lng = Number(partes[1])
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
    pontos.push([lat, lng])
  }
  return pontos.length >= 3 ? pontos : null
}
