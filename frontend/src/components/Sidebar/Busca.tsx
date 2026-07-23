import { useEffect, useRef, useState } from 'react'
import { api } from '../../api/client'
import type { ImovelRegistro } from '../../types/imovel'
import { STATUS_LABEL } from '../../constants/imovel'
import { useMunicipioStore } from '../../store/municipioStore'
import type { Destino } from '../Map/MapView'

type Props = {
  onSelecionar: (imovel: ImovelRegistro) => void
  onBuscarEndereco: (destino: Destino, rotulo: string) => void
}

const STATUS_FILTROS = Object.keys(STATUS_LABEL)

type ResultadoNominatim = { lat: string; lon: string; display_name: string }

export function Busca({ onSelecionar, onBuscarEndereco }: Props) {
  const municipio = useMunicipioStore((s) => s.municipio)
  const [termo, setTermo] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<string | null>(null)
  const [resultados, setResultados] = useState<ImovelRegistro[]>([])
  const [buscando, setBuscando] = useState(false)
  const [aberto, setAberto] = useState(false)
  const [geocodificando, setGeocodificando] = useState(false)
  const [erroGeocodificacao, setErroGeocodificacao] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    clearTimeout(timeoutRef.current)
    if (termo.trim().length < 3 && !statusFiltro) {
      setResultados([])
      return
    }
    timeoutRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const params: Record<string, string> = {}
        if (termo.trim().length >= 3) params.q = termo.trim()
        if (statusFiltro) params.st = statusFiltro
        const { data } = await api.get<ImovelRegistro[]>('/api/imoveis', { params })
        setResultados(data)
        setAberto(true)
      } catch {
        setResultados([])
      } finally {
        setBuscando(false)
      }
    }, 300)
    return () => clearTimeout(timeoutRef.current)
  }, [termo, statusFiltro])

  function selecionar(imovel: ImovelRegistro) {
    onSelecionar(imovel)
    setAberto(false)
    setTermo('')
  }

  function alternarStatus(st: string) {
    setStatusFiltro((atual) => (atual === st ? null : st))
  }

  async function buscarComoEndereco() {
    const q = termo.trim()
    if (!q) return
    setGeocodificando(true)
    setErroGeocodificacao(null)
    try {
      const consulta = `${q}, ${municipio.nome}, ${municipio.uf}, Brasil`
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(consulta)}`
      const resposta = await fetch(url, { headers: { Accept: 'application/json' } })
      const dados: ResultadoNominatim[] = await resposta.json()
      if (dados.length === 0) {
        setErroGeocodificacao('Endereço não encontrado.')
        return
      }
      const { lat, lon, display_name } = dados[0]
      onBuscarEndereco({ lat: Number(lat), lng: Number(lon), zoom: 18 }, display_name)
      setAberto(false)
      setTermo('')
    } catch {
      setErroGeocodificacao('Não foi possível consultar o serviço de geocodificação.')
    } finally {
      setGeocodificando(false)
    }
  }

  return (
    <div className="relative">
      <input
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        onFocus={() => resultados.length > 0 && setAberto(true)}
        placeholder="Buscar inscrição, endereço ou proprietário…"
        className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-verde focus:bg-white/20 focus:outline-none"
      />

      <div className="mt-2 flex flex-wrap gap-1">
        {STATUS_FILTROS.map((st) => (
          <button
            key={st}
            onClick={() => alternarStatus(st)}
            className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
              statusFiltro === st
                ? 'border-verde bg-verde text-white'
                : 'border-white/20 text-white/70 hover:bg-white/10'
            }`}
          >
            {STATUS_LABEL[st]}
          </button>
        ))}
      </div>

      {aberto && (
        <div className="absolute z-1001 mt-1 max-h-72 w-full overflow-y-auto rounded border border-gray-200 bg-white text-navy shadow-xl">
          {buscando && <p className="px-3 py-2 text-xs text-gray-500">Buscando…</p>}
          {!buscando && resultados.length === 0 && (
            <div className="px-3 py-2">
              <p className="text-xs text-gray-500">Nenhum imóvel encontrado.</p>
              {termo.trim().length >= 3 && (
                <>
                  <button
                    onClick={buscarComoEndereco}
                    disabled={geocodificando}
                    className="mt-2 w-full rounded border border-navy/30 px-2 py-1.5 text-left text-xs text-navy hover:bg-navy/5 disabled:opacity-60"
                  >
                    {geocodificando
                      ? 'Buscando endereço…'
                      : `🌍 Buscar "${termo.trim()}" como endereço no mapa`}
                  </button>
                  {erroGeocodificacao && (
                    <p className="mt-1 text-[11px] text-red-600">{erroGeocodificacao}</p>
                  )}
                </>
              )}
            </div>
          )}
          {resultados.slice(0, 50).map((r) => (
            <button
              key={r.id}
              onClick={() => selecionar(r)}
              className="block w-full border-b border-gray-100 px-3 py-2 text-left last:border-0 hover:bg-gray-50"
            >
              <p className="font-mono text-xs font-semibold">{r.insc}</p>
              <p className="text-xs text-gray-600">{r.prop}</p>
              {r.log && (
                <p className="text-[11px] text-gray-400">
                  {r.log}
                  {r.bai ? ` — ${r.bai}` : ''}
                </p>
              )}
            </button>
          ))}
          {resultados.length > 50 && (
            <p className="px-3 py-2 text-[11px] text-gray-400">
              Mostrando 50 de {resultados.length} resultados. Refine a busca para ver outros.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
