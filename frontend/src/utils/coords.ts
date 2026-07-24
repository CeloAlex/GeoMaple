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
