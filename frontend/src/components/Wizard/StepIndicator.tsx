const ETAPAS = ['Inscrição', 'Localização', 'Georreferenciamento', 'Dados cadastrais', 'Revisão']

export function StepIndicator({ step }: { step: number }) {
  return (
    <ol className="flex border-b border-gray-200 px-6 py-3 text-xs">
      {ETAPAS.map((titulo, i) => {
        const n = i + 1
        const ativo = n === step
        const concluido = n < step
        return (
          <li key={titulo} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-semibold ${
                ativo
                  ? 'bg-navy text-white'
                  : concluido
                    ? 'bg-verde text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {concluido ? '✓' : n}
            </span>
            <span className={ativo ? 'font-medium text-navy' : 'text-gray-500'}>{titulo}</span>
            {n < ETAPAS.length && <span className="mx-2 h-px flex-1 bg-gray-200" />}
          </li>
        )
      })}
    </ol>
  )
}
