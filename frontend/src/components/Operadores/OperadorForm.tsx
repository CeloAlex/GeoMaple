import { useState } from 'react'
import type { OperadorFormData } from './types'

const PERFIL_LABEL: Record<string, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Leitor',
}

type Props = {
  titulo: string
  inicial: OperadorFormData
  ehEdicao: boolean
  onSalvar: (dados: OperadorFormData) => Promise<void>
  onCancelar: () => void
}

export function OperadorForm({ titulo, inicial, ehEdicao, onSalvar, onCancelar }: Props) {
  const [form, setForm] = useState<OperadorFormData>(inicial)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function set<K extends keyof OperadorFormData>(campo: K, valor: OperadorFormData[K]) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function handleSalvar() {
    if (!form.nome.trim()) return setErro('Informe o nome')
    if (!form.email.trim()) return setErro('Informe o e-mail institucional')
    setErro(null)
    setSalvando(true)
    try {
      await onSalvar(form)
    } catch (err) {
      setErro((err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? 'Falha ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-3 rounded border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-navy">{titulo}</h3>
        <button onClick={onCancelar} className="text-xs text-gray-500 hover:text-gray-800">
          Cancelar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Nome *</label>
          <input
            value={form.nome}
            onChange={(e) => set('nome', e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-verde focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">E-mail institucional *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-verde focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Login {!ehEdicao && <span className="font-normal text-gray-400">(opcional — gerado a partir do nome)</span>}
          </label>
          <input
            value={form.login}
            onChange={(e) => set('login', e.target.value)}
            disabled={ehEdicao}
            className="w-full rounded border border-gray-300 px-2 py-1.5 font-mono text-sm focus:border-verde focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Perfil</label>
          <select
            value={form.perm}
            onChange={(e) => set('perm', e.target.value)}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
          >
            {Object.entries(PERFIL_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Matrícula</label>
          <input
            value={form.matricula}
            onChange={(e) => set('matricula', e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-verde focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Setor</label>
          <input
            value={form.setor}
            onChange={(e) => set('setor', e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-verde focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Telefone</label>
          <input
            value={form.telefone}
            onChange={(e) => set('telefone', e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-verde focus:outline-none"
          />
        </div>
      </div>

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      <button
        onClick={handleSalvar}
        disabled={salvando}
        className="w-full rounded bg-verde py-2 text-sm font-medium text-white hover:bg-verde/90 disabled:opacity-60"
      >
        {salvando ? 'Salvando…' : ehEdicao ? '💾 Salvar alterações' : '💾 Criar operador'}
      </button>
    </div>
  )
}
