import type { PolygonGeoJSON } from '../types/imovel'

// Centro aproximado do polígono (média dos vértices do anel externo) — usado para
// centralizar o mapa e para links externos (Google Maps/Street View), não para cálculos
// cadastrais de área.
export function centroidePoligono(geom: PolygonGeoJSON): { lat: number; lng: number } {
  const anel = geom.coordinates[0]
  const soma = anel.reduce((acc, [lng, lat]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }), { lat: 0, lng: 0 })
  return { lat: soma.lat / anel.length, lng: soma.lng / anel.length }
}
