import { kml } from '@tmcw/togeojson'
import JSZip from 'jszip'
import shp from 'shpjs'

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

// KMZ é só um KML compactado em .zip — descompacta, acha o .kml interno (normalmente
// "doc.kml", mas pode ter outro nome) e reaproveita o parser de KML já existente.
export async function parseKMZArquivo(arquivo: File, nomeArquivo: string): Promise<CamadaImportada> {
  const zip = await JSZip.loadAsync(arquivo)
  const entradaKml = Object.values(zip.files).find((f) => !f.dir && /\.kml$/i.test(f.name))
  if (!entradaKml) throw new Error('Nenhum arquivo .kml encontrado dentro do KMZ.')
  const texto = await entradaKml.async('text')
  return parseKMLTexto(texto, nomeArquivo)
}

// Shapefile (.shp acompanhado de .dbf/.prj/etc, todos dentro de um .zip) — shpjs projeta
// para WGS84 e devolve GeoJSON diretamente. Um .zip pode conter mais de uma camada
// (retorna array nesse caso); usamos a primeira, que cobre o caso comum de um único
// shapefile por arquivo importado.
export async function parseShapefileArquivo(arquivo: File, nomeArquivo: string): Promise<CamadaImportada> {
  const buffer = await arquivo.arrayBuffer()
  const resultado = await shp(buffer)
  const fc = Array.isArray(resultado) ? resultado[0] : resultado
  if (!fc) throw new Error('Nenhuma camada encontrada no Shapefile.')
  const features = (fc.features ?? []) as unknown as GeoJSONFeatureGenerica[]
  return { id: crypto.randomUUID(), nome: nomeArquivo, geojson: { type: 'FeatureCollection', features } }
}

export async function importarArquivo(arquivo: File): Promise<CamadaImportada> {
  const nome = arquivo.name.replace(/\.[^.]+$/, '')

  if (/\.kmz$/i.test(arquivo.name)) {
    return parseKMZArquivo(arquivo, nome)
  }
  if (/\.(zip|shp)$/i.test(arquivo.name)) {
    return parseShapefileArquivo(arquivo, nome)
  }

  const texto = await arquivo.text()
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
