import { useState } from 'react'
import { api } from '../../api/client'
import type { EventoAuditoria } from '../../types/auditoria'
import { DiffView } from './DiffView'

export function HistoricoImovel({ imovelId }: { imovelId: number }) {
  const [aberto, setAberto] = useState(false)
  const [eventos, setEventos] = useState<EventoAuditoria[] | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [expandido, setExpandido] = useState<number | null>(null)

  async function alternar() {
    if (aberto) {
      setAberto(false)
      return
    }
    setAberto(true)
    if (eventos) return
    setCarregando(true)
    try {
      const { data } = await api.get<EventoAuditoria[]>(`/api/auditoria/imovel/${imovelId}`, { params: { limit: 10 } })
      setEventos(data)
    } catch {
      setEventos([])
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="mt-3 border-t border-gray-200 pt-3">
      <button onClick={alternar} className="text-xs font-medium text-navy hover:underline">
        📜 Histórico {aberto ? '▲' : '▼'}
      </button>

      {aberto && (
        <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
          {carregando && <p className="text-xs text-gray-400">Carregando…</p>}
          {eventos?.length === 0 && <p className="text-xs text-gray-400">Sem eventos registrados.</p>}
          {eventos?.map((ev) => (
            <div key={ev.id} className="rounded border border-gray-100 bg-gray-50 px-2 py-1.5 text-xs">
              <button onClick={() => setExpandido(expandido === ev.id ? null : ev.id)} className="w-full text-left">
                <span className="font-mono font-medium text-navy">{ev.acao}</span>
                <span className="ml-2 text-gray-400">
                  {ev.user.nome} · {new Date(ev.createdAt).toLocaleString('pt-BR')}
                </span>
              </button>
              {expandido === ev.id && (
                <div className="mt-1.5">
                  <DiffView detalheJson={ev.detalhe} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
