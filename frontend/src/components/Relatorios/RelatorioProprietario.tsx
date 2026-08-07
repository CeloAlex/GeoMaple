import { useState } from 'react'
import { api } from '../../api/client'
import type { DestaqueProprietario } from '../Map/MapView'

type Props = {
  onClose: () => void
  onDestacar: (destaque: DestaqueProprietario | null) => void
}

type ImovelPorProprietario = {
  id: number
  insc: string
  prop: string
  geom: { type: 'Polygon'; coordinates: number[][][] }
}

function extrairErro(err: unknown, fallback: string) {
  return (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? fallback
}

// Relatório "Mapa de localização dos imóveis por proprietário" (TESTE 7): busca todos os
// lotes georreferenciados de um proprietário e destaca todos ao mesmo tempo no mapa
// principal (camada própria em MapView.tsx — CamadaDestaqueProprietario), enquadrando o
// zoom para mostrá-los juntos.
export function RelatorioProprietario({ onClose, onDestacar }: Props) {
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<ImovelPorProprietario[] | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function buscar() {
    if (!termo.trim()) return
    setBuscando(true)
    setErro(null)
    setResultados(null)
    try {
      const { data } = await api.get<ImovelPorProprietario[]>('/api/imoveis/por-proprietario', {
        params: { prop: termo.trim() },
      })
      setResultados(data)
      if (data.length === 0) {
        setErro('Nenhum imóvel georreferenciado encontrado para este proprietário.')
      }
    } catch (err) {
      setErro(extrairErro(err, 'Falha ao buscar'))
    } finally {
      setBuscando(false)
    }
  }

  function destacarNoMapa() {
    if (!resultados || resultados.length === 0) return
    onDestacar({
      type: 'FeatureCollection',
      features: resultados.map((r) => ({ type: 'Feature', geometry: r.geom, properties: { id: r.id, insc: r.insc } })),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-base font-semibold text-navy">🗺️ Mapa de Localização por Proprietário</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-lg text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-3 text-xs text-gray-500">
            Busque pelo nome (ou parte do nome) do proprietário para destacar todos os imóveis georreferenciados dele
            de uma vez no mapa principal.
          </p>
          <div className="flex gap-2">
            <input
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscar()}
              placeholder="Nome do proprietário"
              autoFocus
              className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-navy focus:outline-none"
            />
            <button
              onClick={buscar}
              disabled={buscando || !termo.trim()}
              className="shrink-0 rounded bg-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50"
            >
              {buscando ? 'Buscando…' : '🔍 Buscar'}
            </button>
          </div>

          {erro && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

          {resultados && resultados.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-gray-500">{resultados.length} imóvel(is) georreferenciado(s) encontrado(s):</p>
              <ul className="mb-3 max-h-52 divide-y divide-gray-100 overflow-y-auto rounded border border-gray-100 text-sm">
                {resultados.map((r) => (
                  <li key={r.id} className="px-3 py-1.5">
                    <span className="font-mono text-navy">{r.insc}</span> — {r.prop}
                  </li>
                ))}
              </ul>
              <button
                onClick={destacarNoMapa}
                className="w-full rounded bg-verde py-2 text-sm font-medium text-white hover:bg-verde/90"
              >
                🗺️ Destacar {resultados.length} imóvel(is) no mapa
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
