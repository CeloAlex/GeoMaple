import { kml } from '@tmcw/togeojson'

export type CamadaImportada = {
  id: string
  nome: string
  geojson: { type: 'FeatureCollection'; features: GeoJSONFeatureGenerica[] }
}

export type GeoJSONFeatureGenerica = {
  type: 'Feature'
  geometry: { type: string; coordinates: unknown }
  properties: Record<string, unknown>
}

export function parseGeoJSONTexto(texto: string, nome: string): CamadaImportada {
  const gj = JSON.parse(texto)
  const features: GeoJSONFeatureGenerica[] = gj.type === 'FeatureCollection' ? gj.features : [gj]
  return { id: crypto.randomUUID(), nome, geojson: { type: 'FeatureCollection', features } }
}

// Parser real de XML (via @tmcw/togeojson + DOMParser nativo do navegador) — cobre a
// estrutura padrão usada por exportações do Google Earth/QGIS (Polygon/outerBoundaryIs/
// LinearRing, MultiGeometry, namespaces), diferente da tentativa anterior por regex que
// só reconhecia <coordinates> diretamente dentro de <Polygon>.
export function parseKMLTexto(texto: string, nomeArquivo: string): CamadaImportada {
  const dom = new DOMParser().parseFromString(texto, 'text/xml')
  const erro = dom.querySelector('parsererror')
  if (erro) throw new Error('KML inválido: ' + erro.textContent)

  const gj = kml(dom)
  const features = gj.features.filter((f) => f.geometry != null) as unknown as GeoJSONFeatureGenerica[]
  return { id: crypto.randomUUID(), nome: nomeArquivo, geojson: { type: 'FeatureCollection', features } }
}

export async function importarArquivo(arquivo: File): Promise<CamadaImportada> {
  const texto = await arquivo.text()
  const nome = arquivo.name.replace(/\.[^.]+$/, '')

  if (/\.(geojson|json)$/i.test(arquivo.name)) {
    return parseGeoJSONTexto(texto, nome)
  }
  if (/\.kml$/i.test(arquivo.name)) {
    return parseKMLTexto(texto, nome)
  }
  // Sem extensão reconhecida: tenta JSON primeiro, senão trata como KML
  try {
    return parseGeoJSONTexto(texto, nome)
  } catch {
    return parseKMLTexto(texto, nome)
  }
}
