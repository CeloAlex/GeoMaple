import { useState } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import type { LatLng } from 'leaflet'
import { formatarCoordenada, proximoSistema, SISTEMA_LABEL, type SistemaCoord } from '../../utils/coords'

type Props = {
  totalVisiveis: number
  mensagem?: string
}

export function StatusBar({ totalVisiveis, mensagem }: Props) {
  const map = useMap()
  const [cursor, setCursor] = useState<LatLng | null>(null)
  const [zoom, setZoom] = useState(map.getZoom())
  const [sistema, setSistema] = useState<SistemaCoord>('dd')

  useMapEvents({
    mousemove: (e) => setCursor(e.latlng),
    zoomend: () => setZoom(map.getZoom()),
  })

  return (
    <div className="absolute right-0 bottom-0 left-0 z-700 flex items-center gap-2 bg-navy/95 px-3 py-1 text-[11px] text-white/80">
      <span>{cursor ? formatarCoordenada(sistema, cursor.lat, cursor.lng) : '—'}</span>
      <span className="text-white/30">|</span>
      <span>Zoom: {zoom}</span>
      <span className="text-white/30">|</span>
      <button
        onClick={() => setSistema((s) => proximoSistema(s))}
        className="underline decoration-dotted hover:text-white"
        title="Clique para alternar o sistema de coordenadas"
      >
        Sistema: {SISTEMA_LABEL[sistema]}
      </button>
      <span className="ml-auto">Imóveis visíveis: {totalVisiveis}</span>
      {mensagem && (
        <>
          <span className="text-white/30">|</span>
          <span>{mensagem}</span>
        </>
      )}
    </div>
  )
}
