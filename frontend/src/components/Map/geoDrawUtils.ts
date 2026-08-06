import L from 'leaflet'
import 'leaflet-draw'
import type { PolygonGeoJSON } from '../../types/imovel'
import type { LineStringGeoJSON } from '../../types/logradouro'
import { parseDMS, parseUTM, type SistemaCoord } from '../../utils/coords'

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

// Equivalentes de poligonoParaLatLngs/layerParaPoligono/calcularArea para o eixo de um
// logradouro (LineString aberta, sem fechamento de anel) — usados por SingleLineDraw.tsx.
export function linhaParaLatLngs(geom: LineStringGeoJSON): L.LatLngExpression[] {
  return geom.coordinates.map(([lng, lat]) => [lat, lng])
}

export function layerParaLinha(layer: L.Polyline): LineStringGeoJSON {
  const pontos = layer.getLatLngs() as L.LatLng[]
  return { type: 'LineString', coordinates: pontos.map((p): [number, number] => [p.lng, p.lat]) }
}

export function calcularComprimento(layer: L.Polyline, map: L.Map): number {
  const pontos = layer.getLatLngs() as L.LatLng[]
  let total = 0
  for (let i = 1; i < pontos.length; i++) total += map.distance(pontos[i - 1], pontos[i])
  return total
}

// Parseia uma lista de coordenadas colada pelo operador (uma por linha), no sistema
// escolhido — graus decimais ("lat,lng"/"lat lng"/"lat;lng"), DMS (`20°23'06.9"S
// 43°30'11.8"W`) ou UTM (`23S 612345E 7745678N`). Usada como alternativa a desenhar
// clicando no mapa, para quem já tem uma lista de pontos de GPS/estação total. Retorna
// null se não houver ao menos 3 pontos válidos (mínimo para formar um polígono).
export function parseListaCoordenadas(texto: string, sistema: SistemaCoord = 'dd'): L.LatLngExpression[] | null {
  const pontos: L.LatLngExpression[] = []
  for (const linhaBruta of texto.split('\n')) {
    const linha = linhaBruta.trim()
    if (!linha) continue

    if (sistema === 'dms') {
      const par = parseDMS(linha)
      if (par) pontos.push([par.lat, par.lng])
      continue
    }

    if (sistema === 'utm') {
      const par = parseUTM(linha)
      if (par) pontos.push([par.lat, par.lng])
      continue
    }

    const partes = linha.split(/[,; \t]+/).filter(Boolean)
    if (partes.length < 2) continue
    const lat = Number(partes[0])
    const lng = Number(partes[1])
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
    pontos.push([lat, lng])
  }
  return pontos.length >= 3 ? pontos : null
}
