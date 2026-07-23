import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import type { EventoAuditoria, PaginaAuditoria } from '../../types/auditoria'
import { DiffView } from './DiffView'

type Props = {
  onClose: () => void
}

export function MinhaAtividade({ onClose }: Props) {
  const usuario = useAuthStore((s) => s.usuario)
  const [pagina, setPagina] = useState<PaginaAuditoria | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [selecionado, setSelecionado] = useState<EventoAuditoria | null>(null)

  useEffect(() => {
    if (!usuario) return
    api
      .get<PaginaAuditoria>('/api/auditoria', { params: { userId: usuario.id, limit: 50 } })
      .then(({ data }) => setPagina(data))
      .finally(() => setCarregando(false))
  }, [usuario])

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-base font-semibold text-navy">🕒 Minha Atividade</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-lg text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {carregando && <p className="text-sm text-gray-500">Carregando…</p>}
          {!carregando && pagina?.itens.length === 0 && <p className="text-sm text-gray-400">Nenhuma ação registrada ainda.</p>}
          {!carregando && pagina && pagina.itens.length > 0 && (
            <ul className="divide-y divide-gray-100 rounded border border-gray-100 text-sm">
              {pagina.itens.map((ev) => (
                <li key={ev.id} className="flex items-center justify-between gap-3 p-2.5">
                  <div>
                    <p className="font-mono text-xs font-semibold text-navy">{ev.acao}</p>
                    <p className="text-xs text-gray-400">
                      {ev.entidade ?? '—'} · {new Date(ev.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <button onClick={() => setSelecionado(ev)} className="text-xs text-navy underline hover:no-underline">
                    ver diff
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {selecionado && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/60 p-4" onClick={() => setSelecionado(null)}>
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-navy">
                {selecionado.acao} · {selecionado.entidade ?? '—'}
              </h3>
              <button onClick={() => setSelecionado(null)} className="text-gray-400 hover:text-gray-700">
                ✕
              </button>
            </div>
            <DiffView detalheJson={selecionado.detalhe} />
          </div>
        </div>
      )}
    </div>
  )
}
