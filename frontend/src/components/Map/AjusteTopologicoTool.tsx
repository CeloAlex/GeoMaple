import { useEffect, useRef, useState } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-draw'
import { api } from '../../api/client'
import type { ImovelFeature, ImovelFeatureCollection } from '../../types/imovel'
import { poligonoParaLatLngs, layerParaPoligono } from './geoDrawUtils'
import { buscarPontosVizinhos, instrumentarSnapNaEdicao, type PontosVizinhos } from './snapTopologico'

function extrairErro(err: unknown, fallback: string) {
  return (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? fallback
}

type Fase = 'inativo' | 'selecionando' | 'editando'

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
// naturalmente, sem nenhum trabalho extra. Fluxo v1 — um lote por vez: 1) seleciona um
// lote clicando nele; 2) o operador aciona a edição pelo controle nativo do leaflet-draw
// (✏️, canto superior esquerdo do mapa) — o mesmo padrão já usado em Quadras/Provisórios;
// 3) o snap nos confrontantes fica sempre ativo durante essa edição (é o único propósito
// desta ferramenta, não precisa de toggle); 4) salva com "💾 Salvar ajuste" ou cancela com
// Esc/"Cancelar".
export function AjusteTopologicoTool({ iniciarEm, imoveis, onSalvo, onErro }: Props) {
  const map = useMap()
  const [fase, setFase] = useState<Fase>('inativo')
  const [editandoInsc, setEditandoInsc] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const grupoRef = useRef(new L.FeatureGroup())
  const camadaSelecaoRef = useRef<L.GeoJSON | null>(null)
  const camadaEdicaoRef = useRef<L.Polygon | null>(null)
  const controleRef = useRef<L.Control.Draw | null>(null)
  const editandoIdRef = useRef<number | null>(null)
  const imoveisRef = useRef(imoveis)
  imoveisRef.current = imoveis
  const snapSempreAtivoRef = useRef(true)
  const vizinhosRef = useRef<PontosVizinhos>({ pontos: [], segmentos: [] })

  useEffect(() => {
    const grupo = grupoRef.current
    grupo.addTo(map)
    const removerSnap = instrumentarSnapNaEdicao(map, snapSempreAtivoRef, vizinhosRef)
    return () => {
      removerSnap()
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

    vizinhosRef.current = await buscarPontosVizinhos(map, id)

    const controle = new L.Control.Draw({
      position: 'topleft',
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
      await api.put(`/api/imoveis/${id}/geometria`, { geom: layerParaPoligono(layer) })
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
            🧲 Editando <strong>{editandoInsc}</strong> — use o ✏️ no canto superior esquerdo do mapa para habilitar a
            edição dos vértices
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
