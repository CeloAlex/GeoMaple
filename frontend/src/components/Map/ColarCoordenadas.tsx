import { useState } from 'react'
import type { LatLngExpression } from 'leaflet'
import { parseListaCoordenadas } from './geoDrawUtils'
import { SISTEMA_LABEL, type SistemaCoord } from '../../utils/coords'

type Props = {
  onAplicar: (pontos: LatLngExpression[]) => void
  rotulo?: string
}

const PLACEHOLDER: Record<SistemaCoord, string> = {
  dd: '-20.385242,-43.503265\n-20.385500,-43.503400\n-20.385700,-43.503100',
  dms: '20°23\'06.9"S 43°30\'11.8"W\n20°23\'08.0"S 43°30\'12.3"W\n20°23\'09.1"S 43°30\'11.0"W',
  utm: '23S 612345E 7745678N\n23S 612360E 7745690N\n23S 612380E 7745670N',
}

const AJUDA: Record<SistemaCoord, string> = {
  dd: 'Uma coordenada por linha, formato lat,lng (graus decimais).',
  dms: 'Uma coordenada por linha, formato graus/min/seg com hemisfério (lat depois lng).',
  utm: 'Uma coordenada por linha, formato zona+hemisfério easting northing.',
}

// Alternativa a desenhar clicando no mapa: colar uma lista de coordenadas (uma por
// linha) em graus decimais, DMS ou UTM — útil para levantamentos de campo com GPS/estação
// total que já produzem uma lista de pontos, em vez de redigitar clicando no mapa.
export function ColarCoordenadas({ onAplicar, rotulo = '📋 Colar coordenadas' }: Props) {
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const [sistema, setSistema] = useState<SistemaCoord>('dd')
  const [erro, setErro] = useState<string | null>(null)

  function aplicar() {
    const pontos = parseListaCoordenadas(texto, sistema)
    if (!pontos) {
      setErro(`Cole ao menos 3 linhas válidas no formato ${SISTEMA_LABEL[sistema]}.`)
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
      <div className="mb-1 flex items-center gap-2">
        <label className="text-xs text-gray-600">Sistema:</label>
        <select
          value={sistema}
          onChange={(e) => setSistema(e.target.value as SistemaCoord)}
          className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs focus:border-verde focus:outline-none"
        >
          {(Object.keys(SISTEMA_LABEL) as SistemaCoord[]).map((s) => (
            <option key={s} value={s}>
              {SISTEMA_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      <p className="mb-1 text-xs text-gray-600">{AJUDA[sistema]} Mínimo 3 pontos.</p>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={4}
        placeholder={PLACEHOLDER[sistema]}
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
