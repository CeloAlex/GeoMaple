import { useEffect, useRef, useState } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-draw'

function fmtDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} km` : `${m.toFixed(0)} m`
}

type Props = {
  // Contador incrementado externamente (Toolbar/MenuBar "Régua: distância") para iniciar
  // a medição sem exigir que o usuário clique no botão do mapa — mesmo padrão de ponte já
  // usado para abrir o formulário de WMS (MainLayout `wmsFormEm`/Ferramentas.tsx).
  iniciarEm?: number
}

// Ferramenta de régua (distância em tempo real), equivalente ao startLine/estPerim do
// protótipo. Usa o próprio handler de linha do leaflet-draw — o tooltip de distância
// acumulada aparece nativamente durante o desenho (showLength: true).
export function Regua({ iniciarEm }: Props) {
  const map = useMap()
  const grupoRef = useRef(new L.FeatureGroup())
  const [distancia, setDistancia] = useState<number | null>(null)
  const [medindo, setMedindo] = useState(false)

  useEffect(() => {
    const grupo = grupoRef.current
    grupo.addTo(map)

    function aoCriar(e: L.LeafletEvent) {
      const evento = e as L.DrawEvents.Created
      if (evento.layerType !== 'polyline') return
      grupo.clearLayers()
      const layer = evento.layer as L.Polyline
      grupo.addLayer(layer)

      const pontos = layer.getLatLngs() as L.LatLng[]
      let total = 0
      for (let i = 1; i < pontos.length; i++) total += map.distance(pontos[i - 1], pontos[i])
      setDistancia(total)
      setMedindo(false)
    }

    // O gesto de finalizar a linha (clicar no último vértice / duplo-clique) pode colidir
    // com o zoom por duplo-clique nativo do Leaflet — reforça o disable aqui em vez de
    // confiar só no comportamento interno do leaflet-draw.
    function aoParar() {
      map.doubleClickZoom.enable()
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
    map.doubleClickZoom.disable()
    new L.Draw.Polyline(map as unknown as L.DrawMap, {
      shapeOptions: { color: '#e74c3c', weight: 3 },
      showLength: true,
      metric: true,
    }).enable()
  }

  useEffect(() => {
    if (iniciarEm) iniciar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iniciarEm])

  function limpar() {
    grupoRef.current.clearLayers()
    setDistancia(null)
  }

  return (
    <div className="absolute top-[230px] left-2.5 z-1000 flex flex-col gap-1 print:hidden">
      <button
        onClick={iniciar}
        className={`rounded border border-gray-300 px-2 py-1.5 text-sm shadow ${medindo ? 'bg-red-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
        title="Régua — medir distância"
      >
        {medindo ? '📏 Clique no mapa…' : '📏'}
      </button>
      {distancia != null && (
        <div className="flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs shadow">
          <span className="font-medium text-red-600">{fmtDist(distancia)}</span>
          <button onClick={limpar} className="text-gray-400 hover:text-gray-700" title="Limpar régua">
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
