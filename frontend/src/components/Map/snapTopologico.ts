import L from 'leaflet'
import { api } from '../../api/client'
import type { ImovelFeatureCollection } from '../../types/imovel'

export type PontosVizinhos = {
  pontos: L.LatLng[]
  segmentos: [L.LatLng, L.LatLng][]
}

const SEM_VIZINHOS: PontosVizinhos = { pontos: [], segmentos: [] }

// Busca os lotes visíveis nos bounds atuais do mapa (mesmo endpoint que já popula a camada
// de Imóveis) e devolve seus vértices e arestas, para servir de candidatos de "ajuste
// topológico" (encaixar o polígono em desenho/edição nos confrontantes). `idExcluir` evita
// que o próprio lote em edição vire candidato de si mesmo.
export async function buscarPontosVizinhos(map: L.Map, idExcluir?: number): Promise<PontosVizinhos> {
  const b = map.getBounds()
  const bbox = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`
  try {
    const { data } = await api.get<ImovelFeatureCollection>('/api/geo/bbox', { params: { bbox } })
    const pontos: L.LatLng[] = []
    const segmentos: [L.LatLng, L.LatLng][] = []
    for (const f of data.features) {
      if (idExcluir != null && f.properties.id === idExcluir) continue
      const anel = f.geometry.coordinates[0]
      const latlngs = anel.map(([lng, lat]) => L.latLng(lat, lng))
      for (let i = 0; i < latlngs.length; i++) {
        pontos.push(latlngs[i])
        if (i < latlngs.length - 1) segmentos.push([latlngs[i], latlngs[i + 1]])
      }
    }
    return { pontos, segmentos }
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

// Se `latlng` estiver a `limiarPx` pixels ou menos de um vértice ou de uma aresta de um lote
// vizinho, devolve o ponto exato de encaixe; caso contrário devolve `latlng` sem alteração.
export function encontrarSnap(map: L.Map, latlng: L.LatLng, vizinhos: PontosVizinhos, limiarPx = 12): L.LatLng {
  const p = map.latLngToContainerPoint(latlng)
  let melhorDist = limiarPx
  let melhorPonto: L.LatLng | null = null

  for (const v of vizinhos.pontos) {
    const d = p.distanceTo(map.latLngToContainerPoint(v))
    if (d < melhorDist) {
      melhorDist = d
      melhorPonto = v
    }
  }

  for (const [a, b] of vizinhos.segmentos) {
    const { dist, ponto } = distanciaPontoSegmento(p, map.latLngToContainerPoint(a), map.latLngToContainerPoint(b))
    if (dist < melhorDist) {
      melhorDist = dist
      melhorPonto = map.containerPointToLatLng(ponto)
    }
  }

  return melhorPonto ?? latlng
}

type DesenhoInstrumentavel = L.Draw.Polygon & { __snapInstrumentado?: boolean }

// Envolve addVertex do handler de desenho ATIVO para aplicar o snap na LatLng recebida antes
// de delegar ao método original — assim o marcador e o `_poly` interno do leaflet-draw ficam
// sempre consistentes entre si (é o próprio addVertex que atualiza os dois). Chamar de novo
// para o mesmo handler não tem efeito (idempotente).
export function instrumentarSnapNoDesenho(
  desenho: L.Draw.Polygon,
  map: L.Map,
  ativoRef: { current: boolean },
  vizinhosRef: { current: PontosVizinhos },
) {
  const d = desenho as DesenhoInstrumentavel
  if (d.__snapInstrumentado) return
  const original = d.addVertex.bind(d)
  d.addVertex = (latlng: L.LatLng) => {
    original(ativoRef.current ? encontrarSnap(map, latlng, vizinhosRef.current) : latlng)
  }
  d.__snapInstrumentado = true
}

type PolyComEditing = L.Polygon & { editing?: { updateMarkers: () => void } }

// Aplica o snap durante a EDIÇÃO de um polígono já salvo (arrastar vértices pela toolbar
// nativa do leaflet-draw). `draw:editvertex` só dispara uma vez por arraste concluído (no
// dragend do vértice), com o polígono editado em `e.poly` já refletindo a nova posição —
// ajustamos todos os vértices desse polígono (os que não estiverem perto de um vizinho saem
// inalterados) e forçamos o reposicionamento visual dos marcadores de edição.
export function instrumentarSnapNaEdicao(
  map: L.Map,
  ativoRef: { current: boolean },
  vizinhosRef: { current: PontosVizinhos },
) {
  function aoIniciarEdicao() {
    buscarPontosVizinhos(map).then((v) => {
      vizinhosRef.current = v
    })
  }

  function aoMudarVertice(e: L.LeafletEvent) {
    if (!ativoRef.current) return
    const poly = (e as unknown as { poly?: L.Polygon }).poly
    if (!poly) return
    const anel = (poly.getLatLngs()[0] as L.LatLng[]).map((ll) => encontrarSnap(map, ll, vizinhosRef.current))
    poly.setLatLngs(anel)
    ;(poly as PolyComEditing).editing?.updateMarkers()
  }

  map.on(L.Draw.Event.EDITSTART, aoIniciarEdicao)
  map.on(L.Draw.Event.EDITVERTEX, aoMudarVertice)

  return () => {
    map.off(L.Draw.Event.EDITSTART, aoIniciarEdicao)
    map.off(L.Draw.Event.EDITVERTEX, aoMudarVertice)
  }
}
