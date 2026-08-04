import { useEffect, useState } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { formatarDMS, formatarUTM } from '../../utils/coords'

type Ponto = { id: string; lat: number; lng: number }

// Ferramenta "Ponto georreferenciado" do protótipo: captura coordenadas por clique no
// mapa (ou entrada manual), mantém uma lista na sessão com marcador visual e conversão
// DD/DMS/UTM — não persiste no backend, é uma ferramenta de apoio de campo.
export function PontoGeorreferenciado() {
  const map = useMap()
  const [ativo, setAtivo] = useState(false)
  const [pontos, setPontos] = useState<Ponto[]>([])
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  const [grupo] = useState(() => new L.FeatureGroup())

  useEffect(() => {
    grupo.addTo(map)
    return () => {
      map.removeLayer(grupo)
    }
  }, [map, grupo])

  useEffect(() => {
    grupo.clearLayers()
    for (const p of pontos) {
      L.circleMarker([p.lat, p.lng], { radius: 6, color: '#e67e22', weight: 2, fillColor: '#e67e22', fillOpacity: 0.7 })
        .bindTooltip(`${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`)
        .addTo(grupo)
    }
  }, [pontos, grupo])

  useMapEvents({
    click(e) {
      if (!ativo) return
      adicionar(e.latlng.lat, e.latlng.lng)
    },
  })

  function adicionar(lat: number, lng: number) {
    setPontos((ps) => [...ps, { id: crypto.randomUUID(), lat, lng }])
  }

  function adicionarManual() {
    const lat = Number(manualLat.replace(',', '.'))
    const lng = Number(manualLng.replace(',', '.'))
    if (Number.isNaN(lat) || Number.isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return
    adicionar(lat, lng)
    map.panTo([lat, lng])
    setManualLat('')
    setManualLng('')
  }

  function remover(id: string) {
    setPontos((ps) => ps.filter((p) => p.id !== id))
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => setAtivo((a) => !a)}
        className={`rounded border border-gray-300 px-2 py-1.5 text-sm shadow ${ativo ? 'bg-orange-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
        title="Ponto georreferenciado"
      >
        {ativo ? '📍 Clique no mapa…' : '📍'}
      </button>

      {(ativo || pontos.length > 0) && (
        <div className="max-h-72 w-64 overflow-y-auto rounded border border-gray-300 bg-white p-2 text-xs shadow">
          {ativo && (
            <div className="mb-2 flex gap-1 border-b border-gray-200 pb-2">
              <input
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                placeholder="Lat"
                className="w-1/2 rounded border border-gray-300 px-1.5 py-1 text-xs focus:border-verde focus:outline-none"
              />
              <input
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                placeholder="Lng"
                className="w-1/2 rounded border border-gray-300 px-1.5 py-1 text-xs focus:border-verde focus:outline-none"
              />
              <button
                onClick={adicionarManual}
                className="shrink-0 rounded bg-navy px-2 text-xs font-medium text-white hover:bg-navy/90"
              >
                +
              </button>
            </div>
          )}

          {pontos.length === 0 && <p className="text-gray-400">Nenhum ponto registrado.</p>}

          {pontos.map((p, i) => (
            <div key={p.id} className="mb-1.5 border-b border-gray-100 pb-1.5 last:border-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-orange-600">Ponto {i + 1}</span>
                <button onClick={() => remover(p.id)} className="text-gray-400 hover:text-red-600">
                  ✕
                </button>
              </div>
              <p className="font-mono text-[10px] text-gray-600">
                {p.lat.toFixed(6)}, {p.lng.toFixed(6)}
              </p>
              <p className="font-mono text-[10px] text-gray-500">{formatarDMS(p.lat, p.lng)}</p>
              <p className="font-mono text-[10px] text-gray-500">{formatarUTM(p.lat, p.lng)}</p>
            </div>
          ))}

          {pontos.length > 0 && (
            <button onClick={() => setPontos([])} className="mt-1 text-[11px] text-gray-400 hover:text-red-600">
              🗑️ Limpar todos
            </button>
          )}
        </div>
      )}
    </div>
  )
}
