import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import type { Quadra } from '../../types/quadra'
import type { PolygonGeoJSON } from '../../types/imovel'
import { QuadraForm, type QuadraFormData } from './QuadraForm'

type Props = {
  onClose: () => void
  onAlterado: () => void
  onSelecionar?: (quadra: Quadra) => void
  // Pré-carrega o polígono de uma geometria importada (KML/KMZ/Shapefile) direto no
  // formulário de nova quadra, substituindo a etapa de desenho manual.
  geomInicial?: PolygonGeoJSON | null
}

function payload(form: QuadraFormData) {
  return {
    di: form.di.trim(),
    se: form.se.trim(),
    qu: form.qu.trim(),
    cod: form.cod || undefined,
    obs: form.obs || undefined,
    geom: form.geom ?? undefined,
  }
}

function formVazio(): QuadraFormData {
  return { di: '', se: '', qu: '', cod: '', obs: '', geom: null }
}

function quadraParaForm(q: Quadra): QuadraFormData {
  return { di: q.di, se: q.se, qu: q.qu, cod: q.cod ?? '', obs: q.obs ?? '', geom: q.geom }
}

export function QuadrasPanel({ onClose, onAlterado, onSelecionar, geomInicial }: Props) {
  const usuario = useAuthStore((s) => s.usuario)
  const podeEditar = usuario?.perm === 'admin' || usuario?.perm === 'editor'

  const [quadras, setQuadras] = useState<Quadra[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [modo, setModo] = useState<'lista' | 'nova' | number>(geomInicial ? 'nova' : 'lista')
  const [confirmando, setConfirmando] = useState<Quadra | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const { data } = await api.get<Quadra[]>('/api/quadras')
      setQuadras(data)
    } catch (err) {
      setErro((err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? 'Falha ao carregar quadras')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function criar(dados: QuadraFormData) {
    await api.post('/api/quadras', payload(dados))
    setModo('lista')
    await carregar()
    onAlterado()
  }

  async function editar(id: number, dados: QuadraFormData) {
    await api.put(`/api/quadras/${id}`, payload(dados))
    setModo('lista')
    await carregar()
    onAlterado()
  }

  async function confirmarExclusao() {
    if (!confirmando) return
    try {
      await api.delete(`/api/quadras/${confirmando.id}`)
      setConfirmando(null)
      await carregar()
      onAlterado()
    } catch (err) {
      setErro((err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? 'Falha ao excluir')
      setConfirmando(null)
    }
  }

  const editando = typeof modo === 'number' ? quadras.find((q) => q.id === modo) : undefined

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-base font-semibold text-navy">🗺️ Quadras Georreferenciadas</h2>
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
                Excluir a quadra <span className="font-mono">{confirmando.di}.{confirmando.se}.{confirmando.qu}</span>?
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
              {podeEditar && (
                <button
                  onClick={() => setModo('nova')}
                  className="mb-4 w-full rounded border border-dashed border-navy py-2 text-sm text-navy hover:bg-navy/5"
                >
                  + Nova Quadra
                </button>
              )}

              {quadras.length === 0 ? (
                <p className="rounded bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
                  Nenhuma quadra georreferenciada cadastrada.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded border border-gray-100">
                  {quadras.map((q) => (
                    <li
                      key={q.id}
                      onClick={() => q.geom && onSelecionar?.(q)}
                      className={`flex items-center gap-3 p-3 ${q.geom && onSelecionar ? 'cursor-pointer hover:bg-navy/5' : ''}`}
                    >
                      <div className="flex-1">
                        <p className="font-mono text-sm font-semibold text-navy">
                          {q.di}.{q.se}.{q.qu}
                          {q.cod && <span className="ml-2 font-sans text-xs text-gray-500">{q.cod}</span>}
                        </p>
                        {q.obs && <p className="text-xs text-gray-500">{q.obs}</p>}
                      </div>
                      <span className={q.geom ? 'text-xs text-verde' : 'text-xs text-gray-400'}>
                        {q.geom ? '✅ georreferenciada' : '— sem polígono'}
                      </span>
                      {podeEditar && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setModo(q.id)} className="rounded bg-navy px-2 py-1 text-xs text-white hover:bg-navy/90">
                            ✏️
                          </button>
                          <button onClick={() => setConfirmando(q)} className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">
                            🗑️
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {!carregando && modo === 'nova' && (
            <QuadraForm
              titulo="Nova Quadra"
              inicial={{ ...formVazio(), geom: geomInicial ?? null }}
              onSalvar={criar}
              onCancelar={() => setModo('lista')}
            />
          )}

          {!carregando && editando && (
            <QuadraForm
              titulo={`Editar Quadra ${editando.di}.${editando.se}.${editando.qu}`}
              inicial={quadraParaForm(editando)}
              onSalvar={(dados) => editar(editando.id, dados)}
              onCancelar={() => setModo('lista')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
