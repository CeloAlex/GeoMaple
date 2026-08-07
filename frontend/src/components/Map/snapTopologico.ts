import L from 'leaflet'
import { api } from '../../api/client'
import type { ImovelFeatureCollection } from '../../types/imovel'

export type LoteVizinho = { id: number; insc: string; anel: L.LatLng[] }
type PontoVizinho = { latlng: L.LatLng; loteId: number; anelIndex: number }

export type PontosVizinhos = {
  pontos: PontoVizinho[]
  segmentos: [L.LatLng, L.LatLng][]
  lotes: LoteVizinho[]
}

const SEM_VIZINHOS: PontosVizinhos = { pontos: [], segmentos: [], lotes: [] }

// Busca os lotes visíveis nos bounds atuais do mapa (mesmo endpoint que já popula a camada
// de Imóveis) e devolve seus vértices e arestas, para servir de candidatos de "ajuste
// topológico" (encaixar o polígono em edição nos confrontantes, e — quando o encaixe cai
// exatamente num vértice existente — mover esse vizinho junto, ver AjusteTopologicoTool.tsx).
// `idExcluir` evita que o próprio lote em edição vire candidato de si mesmo. `lotes` traz o
// anel completo de cada vizinho (sem o ponto de fechamento duplicado, mesma convenção de
// poligonoParaLatLngs) para poder montar a camada "fantasma" de um vizinho afetado.
export async function buscarPontosVizinhos(map: L.Map, idExcluir?: number): Promise<PontosVizinhos> {
  const b = map.getBounds()
  const bbox = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`
  try {
    const { data } = await api.get<ImovelFeatureCollection>('/api/geo/bbox', { params: { bbox } })
    const pontos: PontoVizinho[] = []
    const segmentos: [L.LatLng, L.LatLng][] = []
    const lotes: LoteVizinho[] = []
    for (const f of data.features) {
      if (idExcluir != null && f.properties.id === idExcluir) continue
      const anel = f.geometry.coordinates[0].slice(0, -1).map(([lng, lat]) => L.latLng(lat, lng))
      lotes.push({ id: f.properties.id, insc: f.properties.insc, anel })
      for (let i = 0; i < anel.length; i++) {
        pontos.push({ latlng: anel[i], loteId: f.properties.id, anelIndex: i })
        segmentos.push([anel[i], anel[(i + 1) % anel.length]])
      }
    }
    return { pontos, segmentos, lotes }
  } catch {
    return SEM_VIZINHOS
  }
}

// Distância (em pixels de tela) de um ponto a um segmento, com o ponto de projeção mais
// próximo dentro do segmento (não na reta infinita).
function distanciaPontoSegmento(p: L.Point, a: L.Point, b: L.Point): { dist: number; ponto: L.Point } {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq))
  const ponto = L.point(a.x + t * dx, a.y + t * dy)
  return { dist: p.distanceTo(ponto), ponto }
}

export type ResultadoSnap = { latlng: L.LatLng; loteId?: number; anelIndex?: number }

// Se `latlng` estiver a `limiarPx` pixels ou menos de um vértice ou de uma aresta de um lote
// vizinho, devolve o ponto exato de encaixe; caso contrário devolve `latlng` sem alteração.
// `loteId`/`anelIndex` só vêm preenchidos quando o encaixe foi num VÉRTICE já existente do
// vizinho (não num ponto solto no meio de uma aresta) — é o único caso em que faz sentido
// mover o vizinho junto (ver AjusteTopologicoTool.tsx).
export function encontrarSnap(map: L.Map, latlng: L.LatLng, vizinhos: PontosVizinhos, limiarPx = 12): ResultadoSnap {
  const p = map.latLngToContainerPoint(latlng)
  let melhorDist = limiarPx
  let melhor: ResultadoSnap | null = null

  // Arestas primeiro: perto do CANTO de um vizinho, a aresta encostando naquele canto tem
  // distância praticamente idêntica (às vezes até marginalmente menor por ponto flutuante)
  // à distância até o vértice em si — se checados na ordem inversa, isso descartaria
  // silenciosamente um encaixe em vértice (com loteId) por um encaixe em aresta (sem
  // loteId) bem onde mais importa propagar. Vértices usam '<=' para vencer o empate.
  for (const [a, b] of vizinhos.segmentos) {
    const { dist, ponto } = distanciaPontoSegmento(p, map.latLngToContainerPoint(a), map.latLngToContainerPoint(b))
    if (dist < melhorDist) {
      melhorDist = dist
      melhor = { latlng: map.containerPointToLatLng(ponto) }
    }
  }

  for (const v of vizinhos.pontos) {
    const d = p.distanceTo(map.latLngToContainerPoint(v.latlng))
    if (d <= melhorDist) {
      melhorDist = d
      melhor = { latlng: v.latlng, loteId: v.loteId, anelIndex: v.anelIndex }
    }
  }

  return melhor ?? { latlng }
}
