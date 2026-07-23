import { useState } from 'react'

type Props = {
  login: string
  senha: string
  onFechar: () => void
}

export function SenhaTemporariaModal({ login, senha, onFechar }: Props) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(senha)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Sem permissão de clipboard — o admin pode selecionar o texto manualmente
    }
  }

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-2xl">
        <h3 className="text-base font-semibold text-navy">🔑 Senha temporária gerada</h3>
        <p className="mt-1 text-xs text-red-600">
          Esta senha só é exibida uma vez. Copie e repasse ao operador com segurança.
        </p>

        <div className="mt-4 space-y-2">
          <div>
            <p className="text-xs text-gray-500">Login</p>
            <p className="font-mono text-sm font-semibold text-navy">{login}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Senha temporária</p>
            <p className="rounded bg-gray-100 px-2 py-1.5 font-mono text-sm font-semibold text-navy select-all">{senha}</p>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={copiar}
            className="flex-1 rounded bg-navy py-2 text-sm font-medium text-white hover:bg-navy/90"
          >
            {copiado ? '✅ Copiado!' : '📋 Copiar senha'}
          </button>
          <button onClick={onFechar} className="flex-1 rounded border border-gray-300 py-2 text-sm hover:bg-gray-50">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
