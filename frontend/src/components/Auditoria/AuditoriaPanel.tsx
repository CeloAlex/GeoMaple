import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { EventoAuditoria, PaginaAuditoria } from '../../types/auditoria'
import type { Operador } from '../../types/usuario'
import { baixarBlob } from '../../utils/download'
import { DiffView } from './DiffView'

type Props = {
  onClose: () => void
}

const ACOES_COMUNS = [
  'IMOVEL_CRIADO',
  'IMOVEL_EDITADO',
  'IMOVEL_EXCLUIDO',
  'IMOVEL_STATUS_ALTERADO',
  'IMOVEL_GEOMETRIA_ADICIONADA',
  'IMOVEL_GEOMETRIA_EDITADA',
  'UA_CRIADA',
  'UA_EDITADA',
  'UA_EXCLUIDA',
  'QUADRA_CRIADA',
  'QUADRA_EDITADA',
  'QUADRA_EXCLUIDA',
  'PROVISORIO_CRIADO',
  'PROVISORIO_EDITADO',
  'PROVISORIO_EXCLUIDO',
  'SINTER_TRANSMITIDO',
  'USER_CRIADO',
  'USER_EDITADO',
  'USER_DESATIVADO',
  'USER_REATIVADO',
  'LOGIN',
]

export function AuditoriaPanel({ onClose }: Props) {
  const [pagina, setPagina] = useState<PaginaAuditoria | null>(null)
  const [operadores, setOperadores] = useState<Operador[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [selecionado, setSelecionado] = useState<EventoAuditoria | null>(null)

  const [userId, setUserId] = useState('')
  const [acao, setAcao] = useState('')
  const [entidade, setEntidade] = useState('')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [page, setPage] = useState(1)

  function montarFiltros() {
    return { userId: userId || undefined, acao: acao || undefined, entidade: entidade || undefined, de: de || undefined, ate: ate || undefined }
  }

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const { data } = await api.get<PaginaAuditoria>('/api/auditoria', {
        params: { userId: userId || undefined, acao: acao || undefined, entidade: entidade || undefined, de: de || undefined, ate: ate || undefined, page, limit: 30 },
      })
      setPagina(data)
    } catch (err) {
      setErro((err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? 'Falha ao carregar auditoria')
    } finally {
      setCarregando(false)
    }
  }, [userId, acao, entidade, de, ate, page])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    api.get<Operador[]>('/api/users').then(({ data }) => setOperadores(data)).catch(() => {})
  }, [])

  function aplicarFiltro<T>(setter: (v: T) => void) {
    return (v: T) => {
      setPage(1)
      setter(v)
    }
  }

  async function exportarCSV() {
    const { data } = await api.get('/api/auditoria/export', { params: montarFiltros(), responseType: 'blob' })
    baixarBlob('auditoria.csv', data as Blob)
  }

  const totalPaginas = pagina ? Math.max(1, Math.ceil(pagina.total / pagina.limit)) : 1

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-base font-semibold text-navy">📜 Trilha de Auditoria</h2>
          <div className="flex items-center gap-2">
            <button onClick={exportarCSV} className="rounded border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50">
              ⬇️ Exportar CSV
            </button>
            <button onClick={onClose} aria-label="Fechar" className="text-lg text-gray-400 hover:text-gray-700">
              ✕
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2 border-b border-gray-100 px-5 py-3">
          <select
            value={userId}
            onChange={(e) => aplicarFiltro(setUserId)(e.target.value)}
            className="rounded border border-gray-300 bg-white px-2 py-1.5 text-xs"
          >
            <option value="">Todos operadores</option>
            {operadores.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
          <select
            value={acao}
            onChange={(e) => aplicarFiltro(setAcao)(e.target.value)}
            className="rounded border border-gray-300 bg-white px-2 py-1.5 text-xs"
          >
            <option value="">Todas ações</option>
            {ACOES_COMUNS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <input
            value={entidade}
            onChange={(e) => aplicarFiltro(setEntidade)(e.target.value)}
            placeholder="Entidade (ex: Imovel)"
            className="rounded border border-gray-300 px-2 py-1.5 text-xs"
          />
          <input
            type="date"
            value={de}
            onChange={(e) => aplicarFiltro(setDe)(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-xs"
          />
          <input
            type="date"
            value={ate}
            onChange={(e) => aplicarFiltro(setAte)(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-xs"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {erro && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
          {carregando && <p className="text-sm text-gray-500">Carregando…</p>}

          {!carregando && pagina && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="py-1.5 pr-2 font-medium">Data</th>
                  <th className="py-1.5 pr-2 font-medium">Operador</th>
                  <th className="py-1.5 pr-2 font-medium">Ação</th>
                  <th className="py-1.5 pr-2 font-medium">Entidade</th>
                  <th className="py-1.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {pagina.itens.map((ev) => (
                  <tr key={ev.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-1.5 pr-2 whitespace-nowrap text-gray-600">{new Date(ev.createdAt).toLocaleString('pt-BR')}</td>
                    <td className="py-1.5 pr-2">{ev.user.nome}</td>
                    <td className="py-1.5 pr-2 font-mono text-navy">{ev.acao}</td>
                    <td className="py-1.5 pr-2 font-mono text-gray-500">{ev.entidade ?? '—'}</td>
                    <td className="py-1.5">
                      <button onClick={() => setSelecionado(ev)} className="text-navy underline hover:no-underline">
                        ver diff
                      </button>
                    </td>
                  </tr>
                ))}
                {pagina.itens.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400">
                      Nenhum evento encontrado com esses filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {pagina && (
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-2 text-xs text-gray-500">
            <span>{pagina.total} eventos</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40">
                ← Anterior
              </button>
              <span>
                Página {page} de {totalPaginas}
              </span>
              <button disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)} className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40">
                Próxima →
              </button>
            </div>
          </div>
        )}
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
            <p className="mb-3 text-xs text-gray-500">
              {selecionado.user.nome} ({selecionado.user.login}) · {new Date(selecionado.createdAt).toLocaleString('pt-BR')}
            </p>
            <DiffView detalheJson={selecionado.detalhe} />
          </div>
        </div>
      )}
    </div>
  )
}
