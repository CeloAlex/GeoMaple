import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import type { Logradouro } from '../../types/logradouro'
import { LogradouroForm } from './LogradouroForm'
import { TIPO_LABEL, SITUACAO_LABEL, formVazio, logradouroParaForm, type LogradouroFormData } from './types'

type Props = {
  onClose: () => void
  onAlterado: () => void
  onSelecionar?: (logradouro: Logradouro) => void
}

function payload(form: LogradouroFormData) {
  return {
    nome: form.nome.trim(),
    tipo: form.tipo,
    bairros: form.bairros
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean),
    cep: form.cep || undefined,
    distrito: form.distrito || undefined,
    leiNumero: form.leiNumero || undefined,
    leiData: form.leiData || undefined,
    leiLink: form.leiLink || undefined,
    situacao: form.situacao,
    obs: form.obs || undefined,
    geom: form.geom ?? undefined,
  }
}

export function LogradourosPanel({ onClose, onAlterado, onSelecionar }: Props) {
  const usuario = useAuthStore((s) => s.usuario)
  const podeEditar = usuario?.perm === 'admin' || usuario?.perm === 'editor'

  const [lista, setLista] = useState<Logradouro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [modo, setModo] = useState<'lista' | 'nova' | number>('lista')
  const [confirmando, setConfirmando] = useState<Logradouro | null>(null)
  const [busca, setBusca] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const { data } = await api.get<Logradouro[]>('/api/logradouros')
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

  async function criar(dados: LogradouroFormData) {
    await api.post('/api/logradouros', payload(dados))
    setModo('lista')
    await carregar()
    onAlterado()
  }

  async function editar(id: number, dados: LogradouroFormData) {
    await api.put(`/api/logradouros/${id}`, payload(dados))
    setModo('lista')
    await carregar()
    onAlterado()
  }

  async function confirmarExclusao() {
    if (!confirmando) return
    try {
      await api.delete(`/api/logradouros/${confirmando.id}`)
      setConfirmando(null)
      await carregar()
      onAlterado()
    } catch (err) {
      setErro((err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? 'Falha ao excluir')
      setConfirmando(null)
    }
  }

  const editando = typeof modo === 'number' ? lista.find((l) => l.id === modo) : undefined

  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  const listaFiltrada = termo
    ? lista.filter((l) =>
        [l.nome, TIPO_LABEL[l.tipo] ?? l.tipo, SITUACAO_LABEL[l.situacao] ?? l.situacao, ...l.bairros]
          .join(' ')
          .toLocaleLowerCase('pt-BR')
          .includes(termo),
      )
    : lista

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-base font-semibold text-navy">🛣️ Cadastro de Logradouros</h2>
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
              {podeEditar && (
                <button
                  onClick={() => setModo('nova')}
                  className="mb-4 w-full rounded border border-dashed border-navy py-2 text-sm text-navy hover:bg-navy/5"
                >
                  + Novo Logradouro
                </button>
              )}

              {lista.length > 0 && (
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, tipo, situação ou bairro…"
                  className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm text-navy placeholder:text-gray-400 focus:border-navy focus:outline-none"
                />
              )}
              {lista.length === 0 ? (
                <p className="rounded bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">Nenhum logradouro cadastrado.</p>
              ) : listaFiltrada.length === 0 ? (
                <p className="rounded bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
                  Nenhum logradouro encontrado para "{busca}".
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded border border-gray-100">
                  {listaFiltrada.map((l) => (
                    <li
                      key={l.id}
                      onClick={() => l.geom && onSelecionar?.(l)}
                      className={`flex items-center gap-3 p-3 ${l.geom && onSelecionar ? 'cursor-pointer hover:bg-navy/5' : ''}`}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-navy">
                          {TIPO_LABEL[l.tipo] ?? l.tipo} {l.nome}
                        </p>
                        <p className="text-xs text-gray-500">
                          {SITUACAO_LABEL[l.situacao] ?? l.situacao}
                          {l.bairros.length > 0 ? ` · ${l.bairros.join(', ')}` : ''}
                        </p>
                      </div>
                      <span className={l.geom ? 'text-xs text-verde' : 'text-xs text-gray-400'}>
                        {l.geom ? '✅ georreferenciado' : '— sem eixo'}
                      </span>
                      {podeEditar && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setModo(l.id)} className="rounded bg-navy px-2 py-1 text-xs text-white hover:bg-navy/90">
                            ✏️
                          </button>
                          <button onClick={() => setConfirmando(l)} className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">
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
            <LogradouroForm titulo="Novo Logradouro" inicial={formVazio()} onSalvar={criar} onCancelar={() => setModo('lista')} />
          )}

          {!carregando && editando && (
            <LogradouroForm
              titulo={`Editar ${editando.nome}`}
              id={editando.id}
              inicial={logradouroParaForm(editando)}
              onSalvar={(dados) => editar(editando.id, dados)}
              onCancelar={() => setModo('lista')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
