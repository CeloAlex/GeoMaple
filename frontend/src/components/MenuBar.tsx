import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import type { AcoesShell } from './shell/AcoesShell'

type Item = { label: string; atalho?: string; onClick: () => void }
type Menu = { label: string; itens: Item[] }

export function MenuBar(acoes: AcoesShell) {
  const logout = useAuthStore((s) => s.logout)
  const [aberto, setAberto] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(null)
    }
    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [])

  const indisponivel = (msg: string) => () => acoes.onIndisponivel(msg)

  const menus: Menu[] = [
    {
      label: 'SGCIM',
      itens: [
        { label: 'Gerenciar usuários', onClick: acoes.onOperadores },
        { label: 'Sair', onClick: logout },
      ],
    },
    {
      label: 'Arquivo',
      itens: [
        { label: 'Novo Cadastro Definitivo', atalho: 'Ctrl+N', onClick: acoes.onNovoCadastro },
        { label: 'Nova Delimitação Provisória', atalho: 'Ctrl+D', onClick: acoes.onNovaProvisoria },
        { label: 'Importar planilha', onClick: indisponivel('Importação em massa fora do escopo atual — ver DESENVOLVIMENTO_STATUS.md') },
        { label: 'Abrir KML / KMZ / GeoJSON', onClick: indisponivel('Use "📥 Importar KML/GeoJSON" na barra lateral') },
        { label: 'Exportar KML', onClick: acoes.onExportarKmlSelecionado },
        { label: 'Exportar GeoJSON', onClick: acoes.onExportarGeoJsonSelecionado },
        { label: 'Imprimir mapa', atalho: 'Ctrl+P', onClick: acoes.onImprimirMapa },
      ],
    },
    {
      label: 'Editar',
      itens: [
        { label: 'Desfazer vértice', atalho: 'Ctrl+Z', onClick: indisponivel('Disponível durante o desenho de um polígono') },
        { label: 'Cancelar desenho', atalho: 'Esc', onClick: indisponivel('Disponível durante o desenho de um polígono') },
      ],
    },
    {
      label: 'Exibir',
      itens: [
        { label: 'Satélite', onClick: indisponivel('Use o seletor de camadas no canto superior direito do mapa') },
        { label: 'Mapa de ruas', onClick: indisponivel('Use o seletor de camadas no canto superior direito do mapa') },
        { label: 'Painel de coordenadas', onClick: indisponivel('Sempre visível na barra inferior do mapa') },
        { label: 'Ver todos', onClick: acoes.onVerTodos },
      ],
    },
    {
      label: 'Ferramentas',
      itens: [
        { label: 'Régua: distância', onClick: indisponivel('Use o botão de régua no mapa') },
        { label: 'Régua: área', onClick: indisponivel('Use o botão de régua no mapa') },
        { label: 'Duplicidades cadastrais', onClick: indisponivel('Fora do escopo do MVP — dado mockado no protótipo original') },
        { label: 'Consistência por quadra', onClick: indisponivel('Fora do escopo do MVP — dado mockado no protótipo original') },
        { label: 'Alterar sistema de coordenadas', onClick: indisponivel('Clique no rótulo "Sistema" na barra inferior do mapa') },
      ],
    },
    {
      label: 'GeoNetwork',
      itens: [
        { label: 'Abrir catálogo GeoNetwork', onClick: acoes.onAbrirCatalogoGeoNetwork },
        { label: 'Adicionar WMS manualmente', onClick: acoes.onAdicionarWms },
      ],
    },
    {
      label: 'Ajuda',
      itens: [{ label: 'Sobre o SGCIM', onClick: acoes.onSobre }],
    },
  ]

  return (
    <div ref={ref} className="flex h-8 items-center gap-0.5 border-b border-white/10 bg-navy px-2 text-[13px] text-white/85 print:hidden">
      {menus.map((menu) => (
        <div key={menu.label} className="relative">
          <button
            onClick={() => setAberto((a) => (a === menu.label ? null : menu.label))}
            className={`rounded px-2.5 py-1 hover:bg-white/10 ${aberto === menu.label ? 'bg-white/10' : ''}`}
          >
            {menu.label}
          </button>
          {aberto === menu.label && (
            <div className="absolute top-full left-0 z-1002 min-w-[240px] rounded-b border border-gray-200 bg-white py-1 text-[13px] text-gray-800 shadow-xl">
              {menu.itens.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    item.onClick()
                    setAberto(null)
                  }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-gray-100"
                >
                  <span>{item.label}</span>
                  {item.atalho && <span className="ml-4 text-[11px] text-gray-400">{item.atalho}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
