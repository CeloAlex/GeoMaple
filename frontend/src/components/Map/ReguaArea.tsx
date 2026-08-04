import { useEffect, useRef, useState } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-draw'
import { calcularArea } from './geoDrawUtils'

function fmtArea(m2: number) {
  return m2 >= 10000
    ? `${(m2 / 10000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha (${m2.toFixed(0)} m²)`
    : `${m2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m²`
}

type Props = {
  // Contador incrementado externamente (Toolbar/MenuBar "Régua: área") para iniciar a
  // medição sem exigir que o usuário clique no botão do mapa — mesmo padrão de ponte já
  // usado para abrir o formulário de WMS (MainLayout `wmsFormEm`/Ferramentas.tsx).
  iniciarEm?: number
}

// Ferramenta de régua de área (medição em tempo real), equivalente à Regua.tsx de
// distância mas usando o handler de polígono do leaflet-draw (showArea: true) em vez do
// de linha.
export function ReguaArea({ iniciarEm }: Props) {
  const map = useMap()
  const grupoRef = useRef(new L.FeatureGroup())
  const [area, setArea] = useState<number | null>(null)
  const [medindo, setMedindo] = useState(false)

  useEffect(() => {
    const grupo = grupoRef.current
    grupo.addTo(map)

    function aoCriar(e: L.LeafletEvent) {
      const evento = e as L.DrawEvents.Created
      if (evento.layerType !== 'polygon') return
      grupo.clearLayers()
      const layer = evento.layer as L.Polygon
      grupo.addLayer(layer)
      setArea(calcularArea(layer))
      setMedindo(false)
    }

    function aoParar() {
      setMedindo(false)
    }

    map.on(L.Draw.Event.CREATED, aoCriar)
    map.on(L.Draw.Event.DRAWSTOP, aoParar)
    return () => {
      map.off(L.Draw.Event.CREATED, aoCriar)
      map.off(L.Draw.Event.DRAWSTOP, aoParar)
      map.removeLayer(grupo)
    }
  }, [map])

  function iniciar() {
    setMedindo(true)
    new L.Draw.Polygon(map as unknown as L.DrawMap, {
      shapeOptions: { color: '#8e44ad', weight: 3, fillColor: '#8e44ad', fillOpacity: 0.15 },
      showArea: true,
      allowIntersection: false,
    }).enable()
  }

  useEffect(() => {
    if (iniciarEm) iniciar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iniciarEm])

  function limpar() {
    grupoRef.current.clearLayers()
    setArea(null)
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={iniciar}
        className={`rounded border border-gray-300 px-2 py-1.5 text-sm shadow ${medindo ? 'bg-purple-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
        title="Régua — medir área"
      >
        {medindo ? '📐 Clique no mapa…' : '📐'}
      </button>
      {area != null && (
        <div className="flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs shadow">
          <span className="font-medium text-purple-700">{fmtArea(area)}</span>
          <button onClick={limpar} className="text-gray-400 hover:text-gray-700" title="Limpar régua de área">
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
