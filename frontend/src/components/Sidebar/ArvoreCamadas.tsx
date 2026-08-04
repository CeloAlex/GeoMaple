import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { ImovelRegistro } from '../../types/imovel'
import type { Quadra } from '../../types/quadra'
import { parseInscricao } from '../../utils/inscricao'

type Props = {
  recarregarEm?: number
  onSelecionarImovel: (imovel: ImovelRegistro) => void
  onSelecionarQuadra: (quadra: Quadra) => void
  ramosOcultos: Set<string>
  onAlternarRamo: (chave: string) => void
}

type NoQuadra = { qu: string; quadra?: Quadra; imoveis: ImovelRegistro[] }
type NoSetor = { se: string; quadras: NoQuadra[] }
type NoDistrito = { di: string; setores: NoSetor[] }

// Árvore unificada Distrito → Setor → Quadra → Imóveis (estilo Google Earth) — substitui
// a antiga ArvoreHierarquica.tsx (só imóveis) e a camada de Quadras como um toggle único
// no seletor de camadas do mapa. Quadras georreferenciadas e imóveis compartilham a mesma
// chave di/se/qu (Quadra já vem com esses campos; imóveis são agrupados via
// parseInscricao), então um nó de Quadra pode existir mesmo sem imóveis cadastrados nela,
// e vice-versa.
function montarArvoreCombinada(imoveis: ImovelRegistro[], quadras: Quadra[]): NoDistrito[] {
  const distritos = new Map<string, Map<string, Map<string, { quadra?: Quadra; imoveis: ImovelRegistro[] }>>>()

  function celula(di: string, se: string, qu: string) {
    if (!distritos.has(di)) distritos.set(di, new Map())
    const setores = distritos.get(di)!
    if (!setores.has(se)) setores.set(se, new Map())
    const quadrasMap = setores.get(se)!
    if (!quadrasMap.has(qu)) quadrasMap.set(qu, { imoveis: [] })
    return quadrasMap.get(qu)!
  }

  for (const im of imoveis) {
    const partes = parseInscricao(im.insc)
    if (!partes) continue
    celula(partes.di, partes.se, partes.qu).imoveis.push(im)
  }
  for (const q of quadras) {
    celula(q.di, q.se, q.qu).quadra = q
  }

  return [...distritos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([di, setores]) => ({
      di,
      setores: [...setores.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([se, quadrasMap]) => ({
          se,
          quadras: [...quadrasMap.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([qu, { quadra, imoveis }]) => ({
              qu,
              quadra,
              imoveis: imoveis.sort((a, b) => a.insc.localeCompare(b.insc)),
            })),
        })),
    }))
}

function Visibilidade({
  chave,
  ramosOcultos,
  onAlternarRamo,
}: {
  chave: string
  ramosOcultos: Set<string>
  onAlternarRamo: (chave: string) => void
}) {
  return (
    <input
      type="checkbox"
      checked={!ramosOcultos.has(chave)}
      onClick={(e) => e.stopPropagation()}
      onChange={() => onAlternarRamo(chave)}
      title="Exibir/ocultar no mapa"
      className="mr-1.5 shrink-0 accent-verde"
    />
  )
}

export function ArvoreCamadas({ recarregarEm, onSelecionarImovel, onSelecionarQuadra, ramosOcultos, onAlternarRamo }: Props) {
  const [imoveis, setImoveis] = useState<ImovelRegistro[]>([])
  const [quadras, setQuadras] = useState<Quadra[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    setCarregando(true)
    Promise.all([api.get<ImovelRegistro[]>('/api/imoveis'), api.get<Quadra[]>('/api/quadras')])
      .then(([imoveisRes, quadrasRes]) => {
        setImoveis(imoveisRes.data)
        setQuadras(quadrasRes.data)
      })
      .catch(() => {
        setImoveis([])
        setQuadras([])
      })
      .finally(() => setCarregando(false))
  }, [recarregarEm])

  if (carregando) return <p className="text-xs text-white/50">Carregando árvore…</p>
  if (imoveis.length === 0 && quadras.length === 0) return <p className="text-xs text-white/50">Nenhum cadastro ainda.</p>

  const arvore = montarArvoreCombinada(imoveis, quadras)

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
                <details key={s.se}>
                  <summary className="flex cursor-pointer select-none items-center rounded px-1.5 py-1 text-white/80 hover:bg-white/10">
                    <Visibilidade chave={chaveSetor} ramosOcultos={ramosOcultos} onAlternarRamo={onAlternarRamo} />
                    Setor {s.se}
                  </summary>
                  <div className="ml-3 space-y-1 border-l border-white/10 pl-2">
                    {s.quadras.map((q) => {
                      const chaveQuadra = `${chaveSetor}.${q.qu}`
                      return (
                        <details key={q.qu}>
                          <summary className="flex cursor-pointer select-none items-center rounded px-1.5 py-1 text-white/70 hover:bg-white/10">
                            <Visibilidade chave={chaveQuadra} ramosOcultos={ramosOcultos} onAlternarRamo={onAlternarRamo} />
                            <span className="flex-1 truncate">
                              Quadra {q.qu}
                              {q.quadra?.cod ? ` — ${q.quadra.cod}` : ''} ({q.imoveis.length})
                            </span>
                            {q.quadra?.geom && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onSelecionarQuadra(q.quadra!)
                                }}
                                title="Ver polígono da quadra no mapa"
                                className="ml-1 shrink-0 text-ambar hover:text-white"
                              >
                                🗺️
                              </button>
                            )}
                          </summary>
                          <div className="ml-3 space-y-0.5 border-l border-white/10 pl-2">
                            {q.imoveis.length === 0 && <p className="py-0.5 text-[11px] text-white/40">Nenhum imóvel nesta quadra.</p>}
                            {q.imoveis.map((im) => (
                              <button
                                key={im.id}
                                onClick={() => onSelecionarImovel(im)}
                                className="block w-full truncate rounded px-1.5 py-1 text-left font-mono text-[11px] text-white/60 hover:bg-white/10 hover:text-white"
                                title={`${im.insc} — ${im.prop}`}
                              >
                                {im.insc.split('-')[1]} · {im.prop}
                              </button>
                            ))}
                          </div>
                        </details>
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
