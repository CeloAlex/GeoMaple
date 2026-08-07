import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { Logradouro } from '../../types/logradouro'
import { TIPO_LABEL } from '../Logradouros/types'
import { chaveDistrito, chaveBairro } from '../../utils/logradouroOculto'
import { Visibilidade } from './Visibilidade'

type Props = {
  recarregarEm?: number
  onSelecionarLogradouro: (logradouro: Logradouro) => void
  ramosOcultos: Set<string>
  onAlternarRamo: (chave: string) => void
}

type NoBairro = { bairro: string; chave: string; logradouros: Logradouro[] }
type NoDistrito = { distrito: string; chave: string; bairros: NoBairro[] }

// Um logradouro com vários bairros aparece uma vez em cada bairro — a mesma folha sob
// ramos diferentes, igual a um lote poder ter mais de uma Unidade Autônoma na árvore de
// Cadastros (cada ramo controla sua própria visibilidade, ver logradouroOculto.ts).
function montarArvore(logradouros: Logradouro[]): NoDistrito[] {
  const distritos = new Map<string, Map<string, Logradouro[]>>()

  for (const l of logradouros) {
    const di = chaveDistrito(l.distrito)
    if (!distritos.has(di)) distritos.set(di, new Map())
    const bairrosMap = distritos.get(di)!
    const listaBairros = l.bairros.length > 0 ? l.bairros : [null]
    for (const b of listaBairros) {
      const ba = chaveBairro(l.distrito, b)
      if (!bairrosMap.has(ba)) bairrosMap.set(ba, [])
      bairrosMap.get(ba)!.push(l)
    }
  }

  return [...distritos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([distrito, bairrosMap]) => ({
      distrito,
      chave: distrito,
      bairros: [...bairrosMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([chave, ls]) => ({
          bairro: chave.slice(distrito.length + 1),
          chave,
          logradouros: ls.sort((a, b) => a.nome.localeCompare(b.nome)),
        })),
    }))
}

// Árvore de Logradouros: Distrito → Bairro → Logradouro (distrito/bairro são campos livres
// do cadastro, sem tabela própria — agrupados em memória aqui, mesmo padrão de
// Sidebar/ArvoreCadastros.tsx). Independente das árvores de Cadastros e Quadras.
export function ArvoreLogradouros({ recarregarEm, onSelecionarLogradouro, ramosOcultos, onAlternarRamo }: Props) {
  const [logradouros, setLogradouros] = useState<Logradouro[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    setCarregando(true)
    api
      .get<Logradouro[]>('/api/logradouros')
      .then(({ data }) => setLogradouros(data))
      .catch(() => setLogradouros([]))
      .finally(() => setCarregando(false))
  }, [recarregarEm])

  if (carregando) return <p className="text-xs text-white/50">Carregando árvore…</p>
  if (logradouros.length === 0) return <p className="text-xs text-white/50">Nenhum logradouro cadastrado.</p>

  const arvore = montarArvore(logradouros)

  return (
    <div className="space-y-1 text-xs">
      {arvore.map((d) => (
        <details key={d.distrito} className="group" open>
          <summary className="flex cursor-pointer select-none items-center rounded px-1.5 py-1 font-medium text-white/90 hover:bg-white/10">
            <Visibilidade chave={d.chave} ramosOcultos={ramosOcultos} onAlternarRamo={onAlternarRamo} />
            📍 {d.distrito}
          </summary>
          <div className="ml-3 space-y-1 border-l border-white/10 pl-2">
            {d.bairros.map((b) => (
              <details key={b.chave} open>
                <summary className="flex cursor-pointer select-none items-center rounded px-1.5 py-1 text-white/80 hover:bg-white/10">
                  <Visibilidade chave={b.chave} ramosOcultos={ramosOcultos} onAlternarRamo={onAlternarRamo} />
                  {b.bairro}
                </summary>
                <div className="ml-3 space-y-0.5 border-l border-white/10 pl-2">
                  {b.logradouros.map((l) => {
                    const chaveLogradouro = `${b.chave}.${l.id}`
                    return (
                      <div key={l.id} className="flex items-center rounded px-1.5 py-1 text-white/70 hover:bg-white/10">
                        <Visibilidade chave={chaveLogradouro} ramosOcultos={ramosOcultos} onAlternarRamo={onAlternarRamo} />
                        <span className="flex-1 truncate" title={l.nome}>
                          {TIPO_LABEL[l.tipo] ?? l.tipo} {l.nome}
                        </span>
                        {l.geom ? (
                          <button
                            onClick={() => onSelecionarLogradouro(l)}
                            title="Ver eixo do logradouro no mapa"
                            className="ml-1 shrink-0 text-ua hover:text-white"
                          >
                            🛣️
                          </button>
                        ) : (
                          <span className="ml-1 shrink-0 text-[10px] text-white/30" title="Sem eixo desenhado">
                            —
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </details>
            ))}
          </div>
        </details>
      ))}
    </div>
  )
}
