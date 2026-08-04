import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { Quadra } from '../../types/quadra'
import { Visibilidade } from './Visibilidade'

type Props = {
  recarregarEm?: number
  onSelecionarQuadra: (quadra: Quadra) => void
  ramosOcultos: Set<string>
  onAlternarRamo: (chave: string) => void
}

type NoSetor = { se: string; quadras: Quadra[] }
type NoDistrito = { di: string; setores: NoSetor[] }

function montarArvore(quadras: Quadra[]): NoDistrito[] {
  const distritos = new Map<string, Map<string, Quadra[]>>()

  for (const q of quadras) {
    if (!distritos.has(q.di)) distritos.set(q.di, new Map())
    const setores = distritos.get(q.di)!
    if (!setores.has(q.se)) setores.set(q.se, [])
    setores.get(q.se)!.push(q)
  }

  return [...distritos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([di, setores]) => ({
      di,
      setores: [...setores.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([se, quadrasList]) => ({ se, quadras: quadrasList.sort((a, b) => a.qu.localeCompare(b.qu)) })),
    }))
}

// Árvore de Quadras: Distrito → Setor → Quadra, só os polígonos de quadra (sem listar
// lotes) — independente da árvore de Cadastros Definitivos (Sidebar/ArvoreCadastros.tsx).
export function ArvoreQuadras({ recarregarEm, onSelecionarQuadra, ramosOcultos, onAlternarRamo }: Props) {
  const [quadras, setQuadras] = useState<Quadra[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    setCarregando(true)
    api
      .get<Quadra[]>('/api/quadras')
      .then(({ data }) => setQuadras(data))
      .catch(() => setQuadras([]))
      .finally(() => setCarregando(false))
  }, [recarregarEm])

  if (carregando) return <p className="text-xs text-white/50">Carregando árvore…</p>
  if (quadras.length === 0) return <p className="text-xs text-white/50">Nenhuma quadra cadastrada.</p>

  const arvore = montarArvore(quadras)

  return (
    <div className="space-y-1 text-xs">
      {arvore.map((d) => (
        <details key={d.di} className="group" open>
          <summary className="flex cursor-pointer select-none items-center rounded px-1.5 py-1 font-medium text-white/90 hover:bg-white/10">
            <Visibilidade chave={d.di} ramosOcultos={ramosOcultos} onAlternarRamo={onAlternarRamo} />
            📍 Distrito {d.di}
          </summary>
          <div className="ml-3 space-y-1 border-l border-white/10 pl-2">
            {d.setores.map((s) => {
              const chaveSetor = `${d.di}.${s.se}`
              return (
                <details key={s.se} open>
                  <summary className="flex cursor-pointer select-none items-center rounded px-1.5 py-1 text-white/80 hover:bg-white/10">
                    <Visibilidade chave={chaveSetor} ramosOcultos={ramosOcultos} onAlternarRamo={onAlternarRamo} />
                    Setor {s.se}
                  </summary>
                  <div className="ml-3 space-y-0.5 border-l border-white/10 pl-2">
                    {s.quadras.map((q) => {
                      const chaveQuadra = `${chaveSetor}.${q.qu}`
                      return (
                        <div key={q.qu} className="flex items-center rounded px-1.5 py-1 text-white/70 hover:bg-white/10">
                          <Visibilidade chave={chaveQuadra} ramosOcultos={ramosOcultos} onAlternarRamo={onAlternarRamo} />
                          <span className="flex-1 truncate" title={q.cod ?? undefined}>
                            Quadra {q.qu}
                            {q.cod ? ` — ${q.cod}` : ''}
                          </span>
                          {q.geom ? (
                            <button
                              onClick={() => onSelecionarQuadra(q)}
                              title="Ver polígono da quadra no mapa"
                              className="ml-1 shrink-0 text-ambar hover:text-white"
                            >
                              🗺️
                            </button>
                          ) : (
                            <span className="ml-1 shrink-0 text-[10px] text-white/30" title="Sem polígono">
                              —
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </details>
              )
            })}
          </div>
        </details>
      ))}
    </div>
  )
}
