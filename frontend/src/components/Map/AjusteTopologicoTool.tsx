import { useEffect, useRef, useState } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-draw'
import { api } from '../../api/client'
import type { ImovelFeature, ImovelFeatureCollection } from '../../types/imovel'
import { poligonoParaLatLngs, layerParaPoligono } from './geoDrawUtils'
import { buscarPontosVizinhos, encontrarSnap, type PontosVizinhos, type LoteVizinho } from './snapTopologico'

function extrairErro(err: unknown, fallback: string) {
  return (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? fallback
}

type Fase = 'inativo' | 'selecionando' | 'editando'
type PolyComEditing = L.Polygon & { editing?: { updateMarkers: () => void } }

type Props = {
  // Contador incrementado externamente (Toolbar "⬡ Ajuste topológico") — mesmo padrão de
  // ponte já usado por outros contadores de comando (MainLayout `medirAreaEm`/`fitTodosEm`).
  iniciarEm?: number
  imoveis: ImovelFeatureCollection
  onSalvo?: () => void
  onErro?: (msg: string) => void
}

// Ferramenta independente de ajuste topológico na barra superior (substitui o v1 errado,
// que rodava snap durante o DESENHO de um polígono novo — quando os confrontantes ainda
// não existem no mapa, tornando o ajuste impossível). Aqui a ferramenta opera sobre a
// camada de Imóveis já carregada no mapa principal: os confrontantes já estão visíveis
// naturalmente, sem nenhum trabalho extra. Fluxo — um lote por vez: 1) seleciona um lote
// clicando nele; 2) o operador aciona a edição pelo controle nativo do leaflet-draw (✏️,
// canto inferior esquerdo do mapa) — o mesmo padrão já usado em Quadras/Provisórios; 3) o
// snap nos confrontantes fica sempre ativo durante essa edição (é o único propósito desta
// ferramenta, não precisa de toggle) — e quando um vértice encaixa exatamente num vértice
// de um lote vizinho, esse vizinho é desenhado como uma camada "fantasma" (tracejada) que
// se move junto, estilo "topological editing" do QGIS; 4) salva com "💾 Salvar ajuste"
// (grava o lote principal E todo vizinho afetado numa única transação no backend — ver
// salvarAjusteTopologico em backend/src/services/geoService.ts) ou cancela com Esc.
export function AjusteTopologicoTool({ iniciarEm, imoveis, onSalvo, onErro }: Props) {
  const map = useMap()
  const [fase, setFase] = useState<Fase>('inativo')
  const [editandoInsc, setEditandoInsc] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [qtdVizinhosAfetados, setQtdVizinhosAfetados] = useState(0)

  const grupoRef = useRef(new L.FeatureGroup())
  const camadaSelecaoRef = useRef<L.GeoJSON | null>(null)
  const camadaEdicaoRef = useRef<L.Polygon | null>(null)
  const controleRef = useRef<L.Control.Draw | null>(null)
  const editandoIdRef = useRef<number | null>(null)
  const imoveisRef = useRef(imoveis)
  imoveisRef.current = imoveis
  const snapSempreAtivoRef = useRef(true)
  const vizinhosRef = useRef<PontosVizinhos>({ pontos: [], segmentos: [], lotes: [] })
  const vizinhosLotesRef = useRef<LoteVizinho[]>([])
  const fantasmasRef = useRef(new Map<number, L.Polygon>())
  const ajustesVizinhosRef = useRef(new Map<number, L.LatLng[]>())

  // Cria (se ainda não existir) e atualiza a camada "fantasma" de cada vizinho cujo vértice
  // acabou de ser movido junto com o lote em edição — `afetados` é loteId -> anelIndex ->
  // nova posição, calculado a cada evento de arraste (aoMudarVertice abaixo).
  function atualizarFantasmas(afetados: Map<number, Map<number, L.LatLng>>) {
    for (const [loteId, verticesNovos] of afetados) {
      let anelTrabalho = ajustesVizinhosRef.current.get(loteId)
      let fantasma = fantasmasRef.current.get(loteId)
      if (!anelTrabalho || !fantasma) {
        const loteOriginal = vizinhosLotesRef.current.find((l) => l.id === loteId)
        if (!loteOriginal) continue
        anelTrabalho = [...loteOriginal.anel]
        fantasma = L.polygon(anelTrabalho, { color: '#8e44ad', weight: 2, dashArray: '6,6', fillOpacity: 0.05 })
        fantasma.addTo(grupoRef.current)
        ajustesVizinhosRef.current.set(loteId, anelTrabalho)
        fantasmasRef.current.set(loteId, fantasma)
      }
      for (const [idx, latlng] of verticesNovos) anelTrabalho[idx] = latlng
      fantasma.setLatLngs(anelTrabalho)
    }
    if (afetados.size > 0) setQtdVizinhosAfetados(ajustesVizinhosRef.current.size)
  }

  useEffect(() => {
    const grupo = grupoRef.current
    grupo.addTo(map)

    function aoIniciarEdicao() {
      buscarPontosVizinhos(map, editandoIdRef.current ?? undefined).then((v) => {
        vizinhosRef.current = v
        vizinhosLotesRef.current = v.lotes
      })
    }

    // 'draw:editvertex' dispara a cada vértice arrastado, com o polígono editado em
    // `e.poly` já refletindo a nova posição. Reavalia o snap de TODO o anel (não só o
    // vértice que moveu) a cada evento — mesmo comportamento de antes — e, para todo
    // vértice que hoje coincide com um vértice de um vizinho, propaga a posição para a
    // camada fantasma daquele vizinho.
    function aoMudarVertice(e: L.LeafletEvent) {
      if (!snapSempreAtivoRef.current) return
      const poly = (e as unknown as { poly?: L.Polygon }).poly
      if (!poly) return
      const afetados = new Map<number, Map<number, L.LatLng>>()
      const anelAjustado = (poly.getLatLngs()[0] as L.LatLng[]).map((ll) => {
        const snap = encontrarSnap(map, ll, vizinhosRef.current)
        if (snap.loteId != null && snap.anelIndex != null) {
          if (!afetados.has(snap.loteId)) afetados.set(snap.loteId, new Map())
          afetados.get(snap.loteId)!.set(snap.anelIndex, snap.latlng)
        }
        return snap.latlng
      })
      poly.setLatLngs(anelAjustado)
      ;(poly as PolyComEditing).editing?.updateMarkers()
      atualizarFantasmas(afetados)
    }

    map.on(L.Draw.Event.EDITSTART, aoIniciarEdicao)
    map.on(L.Draw.Event.EDITVERTEX, aoMudarVertice)
    return () => {
      map.off(L.Draw.Event.EDITSTART, aoIniciarEdicao)
      map.off(L.Draw.Event.EDITVERTEX, aoMudarVertice)
      map.removeLayer(grupo)
    }
  }, [map])

  function limparCamadas() {
    if (camadaSelecaoRef.current) {
      map.removeLayer(camadaSelecaoRef.current)
      camadaSelecaoRef.current = null
    }
    if (controleRef.current) {
      map.removeControl(controleRef.current)
      controleRef.current = null
    }
    grupoRef.current.clearLayers()
    camadaEdicaoRef.current = null
    editandoIdRef.current = null
    fantasmasRef.current.clear()
    ajustesVizinhosRef.current.clear()
    setQtdVizinhosAfetados(0)
  }

  function encerrar() {
    limparCamadas()
    setFase('inativo')
    setEditandoInsc(null)
  }

  function montarSelecao() {
    const layer = L.geoJSON(imoveisRef.current as never, {
      style: { color: '#8e44ad', weight: 2, fillColor: '#8e44ad', fillOpacity: 0.06, dashArray: '3,3' },
      onEachFeature: (feature, lyr) => {
        lyr.on('click', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e)
          const f = feature as unknown as ImovelFeature
          selecionar(f)
        })
      },
    })
    layer.addTo(map)
    camadaSelecaoRef.current = layer
  }

  async function selecionar(feature: ImovelFeature) {
    if (camadaSelecaoRef.current) {
      map.removeLayer(camadaSelecaoRef.current)
      camadaSelecaoRef.current = null
    }
    const id = feature.properties.id
    editandoIdRef.current = id
    setEditandoInsc(feature.properties.insc)
    setFase('editando')

    const layer = L.polygon(poligonoParaLatLngs(feature.geometry), {
      color: '#8e44ad',
      weight: 3,
      fillColor: '#8e44ad',
      fillOpacity: 0.2,
    })
    grupoRef.current.addLayer(layer)
    camadaEdicaoRef.current = layer
    map.fitBounds(layer.getBounds(), { maxZoom: 20, padding: [60, 60] })

    const vizinhos = await buscarPontosVizinhos(map, id)
    vizinhosRef.current = vizinhos
    vizinhosLotesRef.current = vizinhos.lotes

    // 'bottomleft' (não 'topleft') — o canto superior esquerdo já tem a <div> fixa de
    // Régua/BotoesGoogle/PontoGeorreferenciado em MapView.tsx (mesmo z-index do container
    // de controles do Leaflet, renderizada depois dele no DOM), que cobria o ícone de
    // edição (✏️) assim que a barra do leaflet-draw crescia até aquela faixa da tela.
    const controle = new L.Control.Draw({
      position: 'bottomleft',
      draw: { polyline: false, polygon: false, rectangle: false, circle: false, marker: false, circlemarker: false },
      edit: { featureGroup: grupoRef.current, remove: false },
    })
    map.addControl(controle)
    controleRef.current = controle
  }

  async function salvar() {
    const layer = camadaEdicaoRef.current
    const id = editandoIdRef.current
    if (!layer || id == null) return
    setSalvando(true)
    try {
      const vizinhosAfetados = Array.from(fantasmasRef.current.entries()).map(([loteId, fantasma]) => ({
        id: loteId,
        geom: layerParaPoligono(fantasma),
      }))
      await api.put(`/api/imoveis/${id}/ajuste-topologico`, { geom: layerParaPoligono(layer), vizinhosAfetados })
      onSalvo?.()
      encerrar()
    } catch (err) {
      onErro?.(extrairErro(err, 'Não foi possível salvar o ajuste topológico.'))
    } finally {
      setSalvando(false)
    }
  }

  useEffect(() => {
    if (!iniciarEm) return
    limparCamadas()
    setEditandoInsc(null)
    montarSelecao()
    setFase('selecionando')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iniciarEm])

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape' && fase !== 'inativo') encerrar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase])

  if (fase === 'inativo') return null

  return (
    <div className="absolute top-4 left-1/2 z-1001 flex -translate-x-1/2 items-center gap-2 rounded bg-white px-3 py-2 text-sm shadow-lg print:hidden">
      {fase === 'selecionando' && (
        <span className="text-navy">🧲 Ajuste Topológico — clique num lote para ajustar seus vértices (Esc cancela)</span>
      )}
      {fase === 'editando' && (
        <>
          <span className="text-navy">
            🧲 Editando <strong>{editandoInsc}</strong> — use o ✏️ no canto inferior esquerdo do mapa para habilitar a
            edição dos vértices
            {qtdVizinhosAfetados > 0 && (
              <>
                {' '}
                — <strong>{qtdVizinhosAfetados}</strong> lote(s) vizinho(s) será(ão) ajustado(s) junto (vértice
                compartilhado)
              </>
            )}
          </span>
          <button
            onClick={salvar}
            disabled={salvando}
            className="shrink-0 rounded bg-verde px-3 py-1 text-xs font-medium text-white hover:bg-verde/90 disabled:opacity-60"
          >
            {salvando ? 'Salvando…' : '💾 Salvar ajuste'}
          </button>
          <button onClick={encerrar} className="shrink-0 rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50">
            Cancelar
          </button>
        </>
      )}
    </div>
  )
}
