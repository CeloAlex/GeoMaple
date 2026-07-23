import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import type { Operador } from '../../types/usuario'
import { OperadorForm } from './OperadorForm'
import { operadorParaForm, formVazio, type OperadorFormData } from './types'
import { SenhaTemporariaModal } from './SenhaTemporariaModal'

const PERFIL_LABEL: Record<string, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Leitor',
}

type Props = {
  onClose: () => void
}

function erroDe(err: unknown, fallback: string) {
  return (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? fallback
}

export function OperadoresPanel({ onClose }: Props) {
  const usuarioLogado = useAuthStore((s) => s.usuario)
  const [operadores, setOperadores] = useState<Operador[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [modo, setModo] = useState<'lista' | 'nova' | number>('lista')
  const [confirmando, setConfirmando] = useState<Operador | null>(null)
  const [senhaRevelada, setSenhaRevelada] = useState<{ login: string; senha: string } | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const { data } = await api.get<Operador[]>('/api/users')
      setOperadores(data)
    } catch (err) {
      setErro(erroDe(err, 'Falha ao carregar operadores'))
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function criar(dados: OperadorFormData) {
    const payload = {
      nome: dados.nome.trim(),
      email: dados.email.trim(),
      login: dados.login.trim() || undefined,
      perm: dados.perm,
      matricula: dados.matricula || undefined,
      setor: dados.setor || undefined,
      telefone: dados.telefone || undefined,
    }
    const { data } = await api.post<{ usuario: Operador; senhaTemporaria: string }>('/api/users', payload)
    setModo('lista')
    await carregar()
    setSenhaRevelada({ login: data.usuario.login, senha: data.senhaTemporaria })
  }

  async function editar(id: number, dados: OperadorFormData) {
    await api.put(`/api/users/${id}`, {
      nome: dados.nome.trim(),
      email: dados.email.trim(),
      perm: dados.perm,
      matricula: dados.matricula || undefined,
      setor: dados.setor || undefined,
      telefone: dados.telefone || undefined,
    })
    setModo('lista')
    await carregar()
  }

  async function resetarSenha(o: Operador) {
    try {
      const { data } = await api.patch<{ senhaTemporaria: string }>(`/api/users/${o.id}/senha`, {})
      setSenhaRevelada({ login: o.login, senha: data.senhaTemporaria })
    } catch (err) {
      setErro(erroDe(err, 'Falha ao resetar senha'))
    }
  }

  async function confirmarAtivo() {
    if (!confirmando) return
    try {
      await api.patch(`/api/users/${confirmando.id}/ativo`, { ativo: !confirmando.ativo })
      setConfirmando(null)
      await carregar()
    } catch (err) {
      setErro(erroDe(err, 'Falha ao alterar status'))
      setConfirmando(null)
    }
  }

  const editando = typeof modo === 'number' ? operadores.find((o) => o.id === modo) : undefined

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-base font-semibold text-navy">👤 Gestão de Operadores</h2>
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
                {confirmando.ativo ? 'Desativar' : 'Reativar'} <span className="font-medium">{confirmando.nome}</span>?
              </span>
              <div className="flex gap-2">
                <button onClick={() => setConfirmando(null)} className="rounded border border-red-300 px-2 py-1 text-xs hover:bg-red-100">
                  Cancelar
                </button>
                <button onClick={confirmarAtivo} className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">
                  Confirmar
                </button>
              </div>
            </div>
          )}

          {!carregando && modo === 'lista' && (
            <>
              <ul className="divide-y divide-gray-100 rounded border border-gray-100">
                {operadores.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 p-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-navy">
                        {o.nome}
                        {o.id === usuarioLogado?.id && <span className="ml-2 text-xs text-gray-400">(você)</span>}
                      </p>
                      <p className="font-mono text-xs text-gray-500">{o.login}</p>
                      <p className="text-xs text-gray-400">
                        {PERFIL_LABEL[o.perm] ?? o.perm}
                        {o.setor ? ` · ${o.setor}` : ''}
                        {o.lastLoginAt ? ` · último acesso ${new Date(o.lastLoginAt).toLocaleString('pt-BR')}` : ' · nunca acessou'}
                      </p>
                    </div>
                    <span className={o.ativo ? 'rounded-full bg-verde/10 px-2.5 py-1 text-[11px] font-medium text-verde' : 'rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500'}>
                      {o.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => setModo(o.id)} className="rounded bg-navy px-2 py-1 text-xs text-white hover:bg-navy/90">
                        ✏️
                      </button>
                      <button onClick={() => resetarSenha(o)} className="rounded bg-ambar px-2 py-1 text-xs text-white hover:opacity-90" title="Resetar senha">
                        🔑
                      </button>
                      <button
                        onClick={() => setConfirmando(o)}
                        className={o.ativo ? 'rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700' : 'rounded bg-verde px-2 py-1 text-xs text-white hover:bg-verde/90'}
                      >
                        {o.ativo ? '🚫' : '✅'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setModo('nova')}
                className="mt-4 w-full rounded border border-dashed border-navy py-2 text-sm text-navy hover:bg-navy/5"
              >
                + Novo Operador
              </button>
            </>
          )}

          {!carregando && modo === 'nova' && (
            <OperadorForm titulo="Novo Operador" inicial={formVazio()} ehEdicao={false} onSalvar={criar} onCancelar={() => setModo('lista')} />
          )}

          {!carregando && editando && (
            <OperadorForm
              titulo={`Editar ${editando.nome}`}
              inicial={operadorParaForm(editando)}
              ehEdicao
              onSalvar={(dados) => editar(editando.id, dados)}
              onCancelar={() => setModo('lista')}
            />
          )}
        </div>
      </div>

      {senhaRevelada && (
        <SenhaTemporariaModal login={senhaRevelada.login} senha={senhaRevelada.senha} onFechar={() => setSenhaRevelada(null)} />
      )}
    </div>
  )
}
