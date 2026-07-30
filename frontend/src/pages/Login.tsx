import { useState, type FormEvent } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useMunicipioStore } from '../store/municipioStore'
import logo from '../assets/logo.png'

export function Login() {
  const autenticar = useAuthStore((s) => s.autenticar)
  const municipio = useMunicipioStore((s) => s.municipio)
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)

    try {
      const { data } = await api.post('/api/auth/login', { login, senha })
      autenticar({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        usuario: data.usuario,
      })
    } catch (err: unknown) {
      const mensagem =
        (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ??
        'Não foi possível entrar. Tente novamente.'
      setErro(mensagem)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-navy">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <img src={logo} alt="GeoMaple" className="mx-auto mb-2 w-40" />
          <p className="text-sm text-gray-500">
            SGCIM · Prefeitura de {municipio.nome}/{municipio.uf}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login" className="mb-1 block text-sm font-medium text-gray-700">
              Login
            </label>
            <input
              id="login"
              type="text"
              autoComplete="username"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-verde focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="senha" className="mb-1 block text-sm font-medium text-gray-700">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-verde focus:outline-none"
            />
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded bg-navy py-2 font-medium text-white transition hover:bg-navy/90 disabled:opacity-60"
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
