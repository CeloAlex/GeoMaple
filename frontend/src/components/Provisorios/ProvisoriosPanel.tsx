import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import type { Provisorio } from '../../types/provisorio'
import { ProvisorioForm } from './ProvisorioForm'
import { TIPO_LABEL, STATUS_LABEL, formVazio, provisorioParaForm, type ProvisorioFormData } from './types'

type Props = {
  onClose: () => void
  onAlterado: () => void
  onSelecionar?: (provisorio: Provisorio) => void
}

function payload(form: ProvisorioFormData) {
  return {
    nome: form.nome.trim(),
    tipo: form.tipo,
    status: form.status,
    obs: form.obs || undefined,
    geom: form.geom ?? undefined,
  }
}

export function ProvisoriosPanel({ onClose, onAlterado, onSelecionar }: Props) {
  const usuario = useAuthStore((s) => s.usuario)
  const podeEditar = usuario?.perm === 'admin' || usuario?.perm === 'editor'

  const [lista, setLista] = useState<Provisorio[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [modo, setModo] = useState<'lista' | 'nova' | number>('lista')
  const [confirmando, setConfirmando] = useState<Provisorio | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const { data } = await api.get<Provisorio[]>('/api/provisorios')
      setLista(data)
    } catch (err) {
      setErro((err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? 'Falha ao carregar')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function criar(dados: ProvisorioFormData) {
    await api.post('/api/provisorios', payload(dados))
    setModo('lista')
    await carregar()
    onAlterado()
  }

  async function editar(id: number, dados: ProvisorioFormData) {
    await api.put(`/api/provisorios/${id}`, payload(dados))
    setModo('lista')
    await carregar()
    onAlterado()
  }

  async function confirmarExclusao() {
    if (!confirmando) return
    try {
      await api.delete(`/api/provisorios/${confirmando.id}`)
      setConfirmando(null)
      await carregar()
      onAlterado()
    } catch (err) {
      setErro((err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? 'Falha ao excluir')
      setConfirmando(null)
    }
  }

  const editando = typeof modo === 'number' ? lista.find((p) => p.id === modo) : undefined

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-base font-semibold text-navy">🚧 Delimitações Provisórias</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-lg text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {erro && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
          {carregando && <p className="text-sm text-gray-500">Carregando…</p>}

          {confirmando && (
            <div className="mb-3 flex items-center justify-between rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              <span>
                Excluir <span className="font-medium">{confirmando.nome}</span>?
              </span>
              <div className="flex gap-2">
                <button onClick={() => setConfirmando(null)} className="rounded border border-red-300 px-2 py-1 text-xs hover:bg-red-100">
                  Cancelar
                </button>
                <button onClick={confirmarExclusao} className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">
                  Excluir
                </button>
              </div>
            </div>
          )}

          {!carregando && modo === 'lista' && (
            <>
              {lista.length === 0 ? (
                <p className="rounded bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
                  Nenhuma delimitação provisória cadastrada.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded border border-gray-100">
                  {lista.map((p) => (
                    <li
                      key={p.id}
                      onClick={() => p.geom && onSelecionar?.(p)}
                      className={`flex items-center gap-3 p-3 ${p.geom && onSelecionar ? 'cursor-pointer hover:bg-navy/5' : ''}`}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-navy">{p.nome}</p>
                        <p className="text-xs text-gray-500">
                          {TIPO_LABEL[p.tipo] ?? p.tipo} · {STATUS_LABEL[p.status] ?? p.status}
                        </p>
                      </div>
                      <span className={p.geom ? 'text-xs text-verde' : 'text-xs text-gray-400'}>
                        {p.geom ? '✅ georreferenciada' : '— sem polígono'}
                      </span>
                      {podeEditar && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setModo(p.id)} className="rounded bg-navy px-2 py-1 text-xs text-white hover:bg-navy/90">
                            ✏️
                          </button>
                          <button onClick={() => setConfirmando(p)} className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">
                            🗑️
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {podeEditar && (
                <button
                  onClick={() => setModo('nova')}
                  className="mt-4 w-full rounded border border-dashed border-navy py-2 text-sm text-navy hover:bg-navy/5"
                >
                  + Nova Delimitação
                </button>
              )}
            </>
          )}

          {!carregando && modo === 'nova' && (
            <ProvisorioForm titulo="Nova Delimitação Provisória" inicial={formVazio()} onSalvar={criar} onCancelar={() => setModo('lista')} />
          )}

          {!carregando && editando && (
            <ProvisorioForm
              titulo={`Editar ${editando.nome}`}
              inicial={provisorioParaForm(editando)}
              onSalvar={(dados) => editar(editando.id, dados)}
              onCancelar={() => setModo('lista')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
