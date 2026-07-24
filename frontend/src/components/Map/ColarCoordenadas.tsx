import { useState } from 'react'
import type { LatLngExpression } from 'leaflet'
import { parseListaCoordenadas } from './geoDrawUtils'

type Props = {
  onAplicar: (pontos: LatLngExpression[]) => void
  rotulo?: string
}

// Alternativa a desenhar clicando no mapa: colar uma lista de coordenadas (uma por linha,
// "lat,lng" em graus decimais) — útil para levantamentos de campo com GPS/estação total
// que já produzem uma lista de pontos, em vez de redigitar clicando no mapa.
export function ColarCoordenadas({ onAplicar, rotulo = '📋 Colar coordenadas' }: Props) {
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  function aplicar() {
    const pontos = parseListaCoordenadas(texto)
    if (!pontos) {
      setErro('Cole ao menos 3 linhas no formato "lat,lng" (graus decimais).')
      return
    }
    onAplicar(pontos)
    setTexto('')
    setErro(null)
    setAberto(false)
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        {rotulo}
      </button>
    )
  }

  return (
    <div className="rounded border border-gray-300 bg-gray-50 p-2">
      <p className="mb-1 text-xs text-gray-600">
        Uma coordenada por linha, formato <code>lat,lng</code> (graus decimais). Mínimo 3 pontos.
      </p>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={4}
        placeholder={'-20.385242,-43.503265\n-20.385500,-43.503400\n-20.385700,-43.503100'}
        className="w-full rounded border border-gray-300 px-2 py-1 font-mono text-xs focus:border-verde focus:outline-none"
      />
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
      <div className="mt-1.5 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setAberto(false)
            setErro(null)
          }}
          className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={aplicar}
          className="rounded bg-navy px-2.5 py-1 text-xs font-medium text-white hover:bg-navy/90"
        >
          Aplicar
        </button>
      </div>
    </div>
  )
}
