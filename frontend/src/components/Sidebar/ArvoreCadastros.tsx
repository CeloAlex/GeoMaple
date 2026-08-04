import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { ImovelRegistro } from '../../types/imovel'
import { parseInscricao } from '../../utils/inscricao'
import { Visibilidade } from './Visibilidade'

type Props = {
  recarregarEm?: number
  onSelecionarImovel: (imovel: ImovelRegistro) => void
  ramosOcultos: Set<string>
  onAlternarRamo: (chave: string) => void
}

type NoQuadra = { qu: string; imoveis: ImovelRegistro[] }
type NoSetor = { se: string; quadras: NoQuadra[] }
type NoDistrito = { di: string; setores: NoSetor[] }

function montarArvore(imoveis: ImovelRegistro[]): NoDistrito[] {
  const distritos = new Map<string, Map<string, Map<string, ImovelRegistro[]>>>()

  for (const im of imoveis) {
    const partes = parseInscricao(im.insc)
    if (!partes) continue
    const { di, se, qu } = partes
    if (!distritos.has(di)) distritos.set(di, new Map())
    const setores = distritos.get(di)!
    if (!setores.has(se)) setores.set(se, new Map())
    const quadras = setores.get(se)!
    if (!quadras.has(qu)) quadras.set(qu, [])
    quadras.get(qu)!.push(im)
  }

  return [...distritos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([di, setores]) => ({
      di,
      setores: [...setores.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([se, quadras]) => ({
          se,
          quadras: [...quadras.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([qu, imoveisList]) => ({ qu, imoveis: imoveisList.sort((a, b) => a.insc.localeCompare(b.insc)) })),
        })),
    }))
}

// Árvore de Cadastros Definitivos: Distrito → Setor → Quadra → Lotes, com
// expandir/recolher e habilitar/desabilitar visualização por nível — independente da
// árvore de Quadras (Sidebar/ArvoreQuadras.tsx), cada uma controla sua própria camada no
// mapa (ver MapView.tsx).
export function ArvoreCadastros({ recarregarEm, onSelecionarImovel, ramosOcultos, onAlternarRamo }: Props) {
  const [imoveis, setImoveis] = useState<ImovelRegistro[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    setCarregando(true)
    api
      .get<ImovelRegistro[]>('/api/imoveis')
      .then(({ data }) => setImoveis(data))
      .catch(() => setImoveis([]))
      .finally(() => setCarregando(false))
  }, [recarregarEm])

  if (carregando) return <p className="text-xs text-white/50">Carregando árvore…</p>
  if (imoveis.length === 0) return <p className="text-xs text-white/50">Nenhum cadastro ainda.</p>

  const arvore = montarArvore(imoveis)

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
                            Quadra {q.qu} ({q.imoveis.length})
                          </summary>
                          <div className="ml-3 space-y-0.5 border-l border-white/10 pl-2">
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
