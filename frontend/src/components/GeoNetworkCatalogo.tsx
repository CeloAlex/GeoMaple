import { useState } from 'react'
import { api } from '../api/client'
import type { CamadaWms } from './Map/MapView'

type CamadaCatalogo = { name: string; title: string; abstract: string }

type Props = {
  onClose: () => void
  camadasWms: CamadaWms[]
  onAdicionarWms: (camada: CamadaWms) => void
  onRemoverWms: (id: string) => void
}

function extrairErro(err: unknown, fallback: string) {
  return (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? fallback
}

// Catálogo GeoNetwork/WMS: consulta o GetCapabilities de um servidor informado pelo
// operador (via proxy no backend, para evitar bloqueio de CORS) e lista as camadas
// disponíveis para adicionar ao mapa com um clique — em vez de precisar saber de antemão
// a URL exata e o nome técnico da layer (que continua disponível como "Adicionar WMS
// manualmente", útil quando o servidor não responde a GetCapabilities).
export function GeoNetworkCatalogo({ onClose, camadasWms, onAdicionarWms, onRemoverWms }: Props) {
  const [url, setUrl] = useState('')
  const [consultando, setConsultando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [layers, setLayers] = useState<CamadaCatalogo[] | null>(null)
  const [filtro, setFiltro] = useState('')

  async function consultar() {
    if (!url.trim()) return
    setConsultando(true)
    setErro(null)
    setLayers(null)
    try {
      const { data } = await api.get<{ layers: CamadaCatalogo[] }>('/api/geonetwork/capabilities', {
        params: { url: url.trim() },
      })
      setLayers(data.layers)
      if (data.layers.length === 0) setErro('O servidor respondeu, mas nenhuma camada foi encontrada.')
    } catch (err) {
      setErro(extrairErro(err, 'Não foi possível consultar o catálogo'))
    } finally {
      setConsultando(false)
    }
  }

  function camadaExistente(camada: CamadaCatalogo) {
    return camadasWms.find((c) => c.url === url.trim() && c.layers === camada.name)
  }

  function alternar(camada: CamadaCatalogo) {
    const existente = camadaExistente(camada)
    if (existente) {
      onRemoverWms(existente.id)
    } else {
      onAdicionarWms({ id: crypto.randomUUID(), nome: camada.title, url: url.trim(), layers: camada.name })
    }
  }

  const layersFiltradas = (layers ?? []).filter((l) => {
    const q = filtro.trim().toLowerCase()
    if (!q) return true
    return l.title.toLowerCase().includes(q) || l.name.toLowerCase().includes(q)
  })

  return (
    <div className="fixed inset-0 z-2000 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-base font-semibold text-navy">🌐 Catálogo GeoNetwork / WMS</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-lg text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-3 text-xs text-gray-500">
            Informe a URL de um servidor WMS/GeoServer para listar as camadas publicadas (via GetCapabilities).
          </p>
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && consultar()}
              placeholder="https://exemplo.gov.br/geoserver/wms"
              className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-verde focus:outline-none"
            />
            <button
              onClick={consultar}
              disabled={consultando || !url.trim()}
              className="shrink-0 rounded bg-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50"
            >
              {consultando ? 'Consultando…' : '🔄 Consultar catálogo'}
            </button>
          </div>

          {erro && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

          {layers && layers.length > 0 && (
            <div className="mt-4">
              <input
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Filtrar camadas…"
                className="mb-2 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-verde focus:outline-none"
              />
              <p className="mb-2 text-xs text-gray-400">
                {layersFiltradas.length} de {layers.length} camadas
              </p>
              <ul className="divide-y divide-gray-100 rounded border border-gray-100">
                {layersFiltradas.map((camada) => {
                  const adicionada = !!camadaExistente(camada)
                  return (
                    <li key={camada.name} className="flex items-start gap-3 p-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800" title={camada.title}>
                          {camada.title}
                        </p>
                        <p className="truncate font-mono text-[11px] text-gray-400" title={camada.name}>
                          {camada.name}
                        </p>
                        {camada.abstract && <p className="mt-0.5 line-clamp-2 text-[11px] text-gray-500">{camada.abstract}</p>}
                      </div>
                      <button
                        onClick={() => alternar(camada)}
                        className={`shrink-0 rounded px-2.5 py-1 text-xs font-medium ${
                          adicionada
                            ? 'border border-red-300 text-red-700 hover:bg-red-50'
                            : 'bg-verde text-white hover:bg-verde/90'
                        }`}
                      >
                        {adicionada ? '✓ Remover' : '+ Adicionar'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
