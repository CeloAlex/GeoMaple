// Renderiza {antes, depois} como diff colorido (vermelho=antes, verde=depois) quando o
// `detalhe` tem essa forma (ver calcDiff no backend); caso contrário, mostra o JSON bruto —
// nem toda ação tem diff estruturado (ex.: LOGIN, exclusões).
export function DiffView({ detalheJson }: { detalheJson: string | null }) {
  if (!detalheJson) return <p className="text-xs text-gray-400">Sem detalhes registrados.</p>

  let obj: Record<string, unknown>
  try {
    obj = JSON.parse(detalheJson)
  } catch {
    return <pre className="whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs text-gray-600">{detalheJson}</pre>
  }

  const antes = obj.antes as Record<string, unknown> | undefined
  const depois = obj.depois as Record<string, unknown> | undefined

  if (antes && depois && Object.keys(depois).length > 0) {
    return (
      <div className="space-y-1.5">
        {Object.keys(depois).map((campo) => (
          <div key={campo} className="grid grid-cols-[100px_1fr_1fr] items-center gap-2 text-xs">
            <span className="font-medium text-gray-500">{campo}</span>
            <span className="rounded bg-red-50 px-2 py-1 text-red-700 line-through">
              {antes[campo] == null || antes[campo] === '' ? '—' : String(antes[campo])}
            </span>
            <span className="rounded bg-verde/10 px-2 py-1 text-verde">
              {depois[campo] == null || depois[campo] === '' ? '—' : String(depois[campo])}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return <pre className="whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs text-gray-600">{JSON.stringify(obj, null, 2)}</pre>
}
