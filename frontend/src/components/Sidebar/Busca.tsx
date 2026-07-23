import { useEffect, useRef, useState } from 'react'
import { api } from '../../api/client'
import type { ImovelRegistro } from '../../types/imovel'

type Props = {
  onSelecionar: (imovel: ImovelRegistro) => void
}

export function Busca({ onSelecionar }: Props) {
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<ImovelRegistro[]>([])
  const [buscando, setBuscando] = useState(false)
  const [aberto, setAberto] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    clearTimeout(timeoutRef.current)
    if (termo.trim().length < 3) {
      setResultados([])
      return
    }
    timeoutRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const { data } = await api.get<ImovelRegistro[]>('/api/imoveis', { params: { q: termo.trim() } })
        setResultados(data)
        setAberto(true)
      } catch {
        setResultados([])
      } finally {
        setBuscando(false)
      }
    }, 300)
    return () => clearTimeout(timeoutRef.current)
  }, [termo])

  function selecionar(imovel: ImovelRegistro) {
    onSelecionar(imovel)
    setAberto(false)
    setTermo('')
    setResultados([])
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

      {aberto && (
        <div className="absolute z-1001 mt-1 max-h-72 w-full overflow-y-auto rounded border border-gray-200 bg-white text-navy shadow-xl">
          {buscando && <p className="px-3 py-2 text-xs text-gray-500">Buscando…</p>}
          {!buscando && resultados.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-500">Nenhum imóvel encontrado.</p>
          )}
          {resultados.map((r) => (
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
        </div>
      )}
    </div>
  )
}
