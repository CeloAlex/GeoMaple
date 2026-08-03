export type SistemaCoord = 'dd' | 'dms' | 'utm'

export const SISTEMA_LABEL: Record<SistemaCoord, string> = {
  dd: 'Graus decimais',
  dms: 'Graus/min/seg',
  utm: 'UTM',
}

export function proximoSistema(atual: SistemaCoord): SistemaCoord {
  const ordem: SistemaCoord[] = ['dd', 'dms', 'utm']
  return ordem[(ordem.indexOf(atual) + 1) % ordem.length]
}

function paraDMSComponente(valor: number): string {
  const abs = Math.abs(valor)
  const graus = Math.floor(abs)
  const minFloat = (abs - graus) * 60
  const min = Math.floor(minFloat)
  const seg = (minFloat - min) * 60
  return `${graus}°${String(min).padStart(2, '0')}'${seg.toFixed(1).padStart(4, '0')}"`
}

export function formatarDMS(lat: number, lng: number): string {
  return `${paraDMSComponente(lat)}${lat >= 0 ? 'N' : 'S'} ${paraDMSComponente(lng)}${lng >= 0 ? 'E' : 'W'}`
}

// Conversão WGS84 lat/lng → UTM (fórmula padrão Snyder, precisão suficiente para exibição).
export function paraUTM(lat: number, lng: number): { zona: number; hemisferio: 'N' | 'S'; x: number; y: number } {
  const a = 6378137
  const f = 1 / 298.257223563
  const k0 = 0.9996
  const e = Math.sqrt(f * (2 - f))
  const e2 = e * e
  const e_2 = e2 / (1 - e2)

  const zona = Math.floor((lng + 180) / 6) + 1
  const lngOrigemCentral = (zona - 1) * 6 - 180 + 3

  const latRad = (lat * Math.PI) / 180
  const lngRad = (lng * Math.PI) / 180
  const lngOrigemRad = (lngOrigemCentral * Math.PI) / 180

  const N = a / Math.sqrt(1 - e2 * Math.sin(latRad) ** 2)
  const T = Math.tan(latRad) ** 2
  const C = e_2 * Math.cos(latRad) ** 2
  const A = Math.cos(latRad) * (lngRad - lngOrigemRad)

  const M =
    a *
    ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * latRad -
      ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * latRad) +
      ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * latRad) -
      ((35 * e2 ** 3) / 3072) * Math.sin(6 * latRad))

  let x =
    k0 *
      N *
      (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T ** 2 + 72 * C - 58 * e_2) * A ** 5) / 120) +
    500000

  let y =
    k0 *
    (M +
      N *
        Math.tan(latRad) *
        (A ** 2 / 2 +
          ((5 - T + 9 * C + 4 * C ** 2) * A ** 4) / 24 +
          ((61 - 58 * T + T ** 2 + 600 * C - 330 * e_2) * A ** 6) / 720))

  const hemisferio: 'N' | 'S' = lat >= 0 ? 'N' : 'S'
  if (hemisferio === 'S') y += 10000000

  x = Math.round(x)
  y = Math.round(y)

  return { zona, hemisferio, x, y }
}

export function formatarUTM(lat: number, lng: number): string {
  const { zona, hemisferio, x, y } = paraUTM(lat, lng)
  return `${zona}${hemisferio} ${x}E ${y}N`
}

export function formatarCoordenada(sistema: SistemaCoord, lat: number, lng: number): string {
  if (sistema === 'dms') return formatarDMS(lat, lng)
  if (sistema === 'utm') return formatarUTM(lat, lng)
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

// Inverso de paraDMSComponente/formatarDMS — aceita um componente isolado, ex.:
// `20°23'06.9"S` ou `43°30'11.8"W` (separadores °/º/:/espaço entre graus e minutos
// também aceitos, para colar de fontes com notação levemente diferente).
const DMS_COMPONENTE_RE = /(-?\d+(?:[.,]\d+)?)[°ºh:\s]+(\d+(?:[.,]\d+)?)['′:\s]+(\d+(?:[.,]\d+)?)["″]?\s*([NSEWnsew])?/

export function parseDMSComponente(texto: string): number | null {
  const m = DMS_COMPONENTE_RE.exec(texto.trim())
  if (!m) return null
  const graus = Number(m[1].replace(',', '.'))
  const min = Number(m[2].replace(',', '.'))
  const seg = Number(m[3].replace(',', '.'))
  if (Number.isNaN(graus) || Number.isNaN(min) || Number.isNaN(seg)) return null
  const hemisferio = m[4]?.toUpperCase()
  let valor = Math.abs(graus) + min / 60 + seg / 3600
  if (hemisferio === 'S' || hemisferio === 'W') valor = -valor
  else if (graus < 0) valor = -valor
  return valor
}

// Uma linha com dois componentes DMS (lat depois lng), ex.: `20°23'06.9"S 43°30'11.8"W`.
export function parseDMS(texto: string): { lat: number; lng: number } | null {
  const matches = [...texto.matchAll(new RegExp(DMS_COMPONENTE_RE, 'g'))]
  if (matches.length < 2) return null
  const lat = parseDMSComponente(matches[0][0])
  const lng = parseDMSComponente(matches[1][0])
  if (lat === null || lng === null) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

// Inverso de paraUTM (mesmas constantes/fórmula padrão Snyder, série inversa).
export function deUTM(zona: number, hemisferio: 'N' | 'S', x: number, y: number): { lat: number; lng: number } {
  const a = 6378137
  const f = 1 / 298.257223563
  const k0 = 0.9996
  const e2 = f * (2 - f)
  const e_2 = e2 / (1 - e2)
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2))

  const xRel = x - 500000
  const yRel = hemisferio === 'S' ? y - 10000000 : y

  const M = yRel / k0
  const mu = M / (a * (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256))

  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu)

  const N1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) ** 2)
  const T1 = Math.tan(phi1) ** 2
  const C1 = e_2 * Math.cos(phi1) ** 2
  const R1 = (a * (1 - e2)) / Math.pow(1 - e2 * Math.sin(phi1) ** 2, 1.5)
  const D = xRel / (N1 * k0)

  const lat =
    phi1 -
    ((N1 * Math.tan(phi1)) / R1) *
      (D ** 2 / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * e_2) * D ** 4) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * e_2 - 3 * C1 ** 2) * D ** 6) / 720)

  const lngOrigemCentral = (zona - 1) * 6 - 180 + 3
  const lng =
    (lngOrigemCentral * Math.PI) / 180 +
    (D -
      ((1 + 2 * T1 + C1) * D ** 3) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * e_2 + 24 * T1 ** 2) * D ** 5) / 120) /
      Math.cos(phi1)

  return { lat: (lat * 180) / Math.PI, lng: (lng * 180) / Math.PI }
}

// Uma linha no formato de saída de formatarUTM, ex.: `23S 612345E 7745678N`
// (aceita variações de espaçamento, ex.: `23 S 612345 7745678`).
export function parseUTM(texto: string): { lat: number; lng: number } | null {
  const m = /(\d{1,2})\s*([NSns])\s+(\d+(?:[.,]\d+)?)\s*E?\s+(\d+(?:[.,]\d+)?)\s*N?/.exec(texto.trim())
  if (!m) return null
  const zona = Number(m[1])
  if (zona < 1 || zona > 60) return null
  const hemisferio = m[2].toUpperCase() as 'N' | 'S'
  const x = Number(m[3].replace(',', '.'))
  const y = Number(m[4].replace(',', '.'))
  return deUTM(zona, hemisferio, x, y)
}
