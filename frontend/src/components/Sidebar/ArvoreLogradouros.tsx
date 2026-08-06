import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { Logradouro } from '../../types/logradouro'
import { TIPO_LABEL } from '../Logradouros/types'
import { Visibilidade } from './Visibilidade'

type Props = {
  recarregarEm?: number
  onSelecionarLogradouro: (logradouro: Logradouro) => void
  ramosOcultos: Set<string>
  onAlternarRamo: (chave: string) => void
}

// Árvore de Logradouros: lista simples (sem hierarquia Distrito.Setor.Quadra — logradouros
// não pertencem a uma quadra) — independente das árvores de Cadastros e Quadras.
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

  return (
    <div className="space-y-0.5 text-xs">
      {logradouros.map((l) => {
        const chave = String(l.id)
        return (
          <div key={l.id} className="flex items-center rounded px-1.5 py-1 text-white/70 hover:bg-white/10">
            <Visibilidade chave={chave} ramosOcultos={ramosOcultos} onAlternarRamo={onAlternarRamo} />
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
  )
}
