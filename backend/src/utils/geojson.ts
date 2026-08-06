export type PolygonGeoJSON = {
  type: 'Polygon'
  coordinates: number[][][]
}

export type LineStringGeoJSON = {
  type: 'LineString'
  coordinates: number[][]
}

// Polígono fechado (primeiro ponto = último ponto), coordenadas [lng, lat] em WGS84 (seção 8.2)
export function validarPolygonGeoJSON(valor: unknown): valor is PolygonGeoJSON {
  if (!valor || typeof valor !== 'object') return false
  const geo = valor as Record<string, unknown>
  if (geo.type !== 'Polygon') return false
  if (!Array.isArray(geo.coordinates) || geo.coordinates.length === 0) return false

  for (const anel of geo.coordinates) {
    if (!Array.isArray(anel) || anel.length < 4) return false

    for (const ponto of anel) {
      if (!Array.isArray(ponto) || ponto.length < 2) return false
      const [lng, lat] = ponto
      if (typeof lng !== 'number' || typeof lat !== 'number') return false
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return false
    }

    const [primLng, primLat] = anel[0]
    const [ultLng, ultLat] = anel[anel.length - 1]
    if (primLng !== ultLng || primLat !== ultLat) return false
  }

  return true
}

// Eixo de logradouro: linha aberta (sem fechamento de anel), coordenadas [lng, lat] em
// WGS84, mínimo 2 pontos.
export function validarLineStringGeoJSON(valor: unknown): valor is LineStringGeoJSON {
  if (!valor || typeof valor !== 'object') return false
  const geo = valor as Record<string, unknown>
  if (geo.type !== 'LineString') return false
  if (!Array.isArray(geo.coordinates) || geo.coordinates.length < 2) return false

  for (const ponto of geo.coordinates) {
    if (!Array.isArray(ponto) || ponto.length < 2) return false
    const [lng, lat] = ponto
    if (typeof lng !== 'number' || typeof lat !== 'number') return false
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return false
  }

  return true
}
