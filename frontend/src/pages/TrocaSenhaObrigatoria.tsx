import { useState, type FormEvent } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useMunicipioStore } from '../store/municipioStore'

export function TrocaSenhaObrigatoria() {
  const usuario = useAuthStore((s) => s.usuario)
  const marcarSenhaTrocada = useAuthStore((s) => s.marcarSenhaTrocada)
  const logout = useAuthStore((s) => s.logout)
  const municipio = useMunicipioStore((s) => s.municipio)

  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaNova, setSenhaNova] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)

    if (senhaNova.length < 8) return setErro('A nova senha deve ter no mínimo 8 caracteres')
    if (senhaNova !== confirmar) return setErro('As senhas não coincidem')

    setSalvando(true)
    try {
      await api.patch('/api/auth/senha', { senhaAtual, senhaNova })
      marcarSenhaTrocada()
    } catch (err) {
      setErro((err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? 'Falha ao trocar a senha')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-navy">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-navy">Troca de senha obrigatória</h1>
          <p className="mt-1 text-sm text-gray-500">
            {usuario?.nome} · {municipio.nome}/{municipio.uf}
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Este é seu primeiro acesso (ou uma senha temporária foi definida). Defina uma nova senha para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Senha temporária atual</label>
            <input
              type="password"
              autoComplete="current-password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-verde focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nova senha</label>
            <input
              type="password"
              autoComplete="new-password"
              value={senhaNova}
              onChange={(e) => setSenhaNova(e.target.value)}
              required
              minLength={8}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-verde focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Confirmar nova senha</label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
              minLength={8}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-verde focus:outline-none"
            />
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button
            type="submit"
            disabled={salvando}
            className="w-full rounded bg-navy py-2 font-medium text-white transition hover:bg-navy/90 disabled:opacity-60"
          >
            {salvando ? 'Salvando…' : 'Definir nova senha e entrar'}
          </button>
          <button
            type="button"
            onClick={logout}
            className="w-full rounded border border-gray-300 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
          >
            Sair
          </button>
        </form>
      </div>
    </div>
  )
}
