import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import type { AcoesShell } from './shell/AcoesShell'
import { mensagemForaDoEscopo } from '../constants/mensagens'

// `submenu` substitui `onClick` num item de 2º nível (ex.: Relatórios → Certidões → …) —
// só 1 nível de aninhamento, aberto/fechado junto com o menu pai (fecha ao clicar fora,
// trocar de menu de topo ou escolher qualquer item folha).
type Item = { label: string; atalho?: string; onClick?: () => void; submenu?: Item[] }
type Menu = { label: string; itens: Item[] }

export function MenuBar(acoes: AcoesShell) {
  const logout = useAuthStore((s) => s.logout)
  const [aberto, setAberto] = useState<string | null>(null)
  const [submenuAberto, setSubmenuAberto] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(null)
        setSubmenuAberto(null)
      }
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
        { label: 'Importar planilha', onClick: indisponivel(mensagemForaDoEscopo('importação em massa; ver DESENVOLVIMENTO_STATUS.md')) },
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
        { label: 'Régua: distância', onClick: acoes.onMedirDistancia },
        { label: 'Régua: área', onClick: acoes.onMedirArea },
        { label: 'Duplicidades cadastrais', onClick: indisponivel(mensagemForaDoEscopo('dado mockado no protótipo original')) },
        { label: 'Consistência por quadra', onClick: indisponivel(mensagemForaDoEscopo('dado mockado no protótipo original')) },
        { label: 'Alterar sistema de coordenadas', onClick: indisponivel('Clique no rótulo "Sistema" na barra inferior do mapa') },
      ],
    },
    {
      label: 'GeoNetwork',
      itens: [{ label: 'Adicionar camada WMS', onClick: acoes.onAbrirCatalogoGeoNetwork }],
    },
    {
      label: 'Relatórios',
      itens: [
        {
          label: 'Certidões',
          submenu: [{ label: 'Certidão de Denominação de Logradouro', onClick: acoes.onCertidaoLogradouro }],
        },
        { label: 'Inconsistências de área', onClick: acoes.onRelatorioInconsistencias },
        { label: 'Mapa por proprietário', onClick: acoes.onRelatorioProprietario },
        { label: 'Manual do sistema', onClick: acoes.onManualSistema },
      ],
    },
    {
      label: 'Ajuda',
      itens: [{ label: 'Sobre o SGCIM', onClick: acoes.onSobre }],
    },
  ]

  function clicarItem(item: Item) {
    if (item.submenu) {
      setSubmenuAberto((s) => (s === item.label ? null : item.label))
      return
    }
    item.onClick?.()
    setAberto(null)
    setSubmenuAberto(null)
  }

  return (
    <div ref={ref} className="flex h-8 items-center gap-0.5 border-b border-white/10 bg-navy px-2 text-[13px] text-white/85 print:hidden">
      {menus.map((menu) => (
        <div key={menu.label} className="relative">
          <button
            onClick={() => {
              setAberto((a) => (a === menu.label ? null : menu.label))
              setSubmenuAberto(null)
            }}
            className={`rounded px-2.5 py-1 hover:bg-white/10 ${aberto === menu.label ? 'bg-white/10' : ''}`}
          >
            {menu.label}
          </button>
          {aberto === menu.label && (
            <div className="absolute top-full left-0 z-1002 min-w-[240px] rounded-b border border-gray-200 bg-white py-1 text-[13px] text-gray-800 shadow-xl">
              {menu.itens.map((item) => (
                <div key={item.label} className="relative">
                  <button
                    onClick={() => clicarItem(item)}
                    className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-gray-100"
                  >
                    <span>{item.label}</span>
                    <span className="ml-4 flex items-center gap-1 text-[11px] text-gray-400">
                      {item.atalho}
                      {item.submenu && '▶'}
                    </span>
                  </button>
                  {item.submenu && submenuAberto === item.label && (
                    <div className="absolute top-0 left-full z-1003 min-w-[260px] rounded border border-gray-200 bg-white py-1 text-[13px] text-gray-800 shadow-xl">
                      {item.submenu.map((sub) => (
                        <button
                          key={sub.label}
                          onClick={() => clicarItem(sub)}
                          className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-gray-100"
                        >
                          <span>{sub.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
