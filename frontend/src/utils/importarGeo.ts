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

// Extração simplificada de Polygon/LineString de um KML — mesma abordagem por regex do
// protótipo SGCIM_v10.html (não é um parser XML completo, mas cobre o caso comum de
// exportações do Google Earth/QGIS usadas como referência visual).
export function parseKMLTexto(texto: string, nomeArquivo: string): CamadaImportada {
  const features: GeoJSONFeatureGenerica[] = []
  const placemarkRe = /<Placemark[\s\S]*?<\/Placemark>/g
  let m: RegExpExecArray | null

  while ((m = placemarkRe.exec(texto))) {
    const bloco = m[0]
    const nomeM = /<name>([\s\S]*?)<\/name>/.exec(bloco)
    const nome = nomeM?.[1]?.trim() || nomeArquivo

    const polyM = /<Polygon[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/.exec(bloco)
    const lineM = !polyM ? /<LineString[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/.exec(bloco) : null
    const raw = polyM?.[1] ?? lineM?.[1]
    if (!raw) continue

    const pontos = raw
      .trim()
      .split(/\s+/)
      .map((p) => p.split(',').map(Number))
      .filter((c) => c.length >= 2 && !Number.isNaN(c[0]) && !Number.isNaN(c[1]))
      .map(([lng, lat]) => [lng, lat])

    if (pontos.length < 2) continue

    features.push({
      type: 'Feature',
      geometry: polyM ? { type: 'Polygon', coordinates: [pontos] } : { type: 'LineString', coordinates: pontos },
      properties: { nome },
    })
  }

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
