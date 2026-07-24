import type { AcoesShell } from './shell/AcoesShell'

type Botao = { icone: string; dica: string; onClick: () => void; destaque?: string }

function Separador() {
  return <div className="mx-1 h-5 w-px bg-white/15" />
}

export function Toolbar(acoes: AcoesShell) {
  const indisponivel = (msg: string) => () => acoes.onIndisponivel(msg)

  const grupos: Botao[][] = [
    [{ icone: '📑', dica: 'Painel lateral', onClick: acoes.onToggleSidebar }],
    [
      { icone: '🏠', dica: 'Novo Cadastro Definitivo (Ctrl+N)', onClick: acoes.onNovoCadastro, destaque: 'bg-[#2980b9]/25 border-[#2980b9]' },
      { icone: '🚧', dica: 'Nova Delimitação Provisória (Ctrl+D)', onClick: acoes.onNovaProvisoria, destaque: 'bg-[#e67e22]/25 border-[#e67e22]' },
    ],
    [
      { icone: '📐', dica: 'Régua: área', onClick: indisponivel('Use o botão de régua no mapa') },
      { icone: '📏', dica: 'Régua: distância', onClick: indisponivel('Use o botão de régua no mapa') },
      { icone: '📍', dica: 'Ponto georreferenciado', onClick: indisponivel('Use o botão 📍 no mapa (abaixo da régua)') },
      { icone: '📥', dica: 'Importar KML / KMZ / GeoJSON', onClick: indisponivel('Use "Importar KML/GeoJSON" na barra lateral') },
      { icone: '↩️', dica: 'Desfazer último vértice (Ctrl+Z)', onClick: indisponivel('Disponível durante o desenho de um polígono') },
    ],
    [
      { icone: '🛰️', dica: 'Satélite', onClick: indisponivel('Use o seletor de camadas no mapa') },
      { icone: '🗺️', dica: 'Mapa de ruas', onClick: indisponivel('Use o seletor de camadas no mapa') },
      { icone: '🧭', dica: 'Sistema de coordenadas', onClick: indisponivel('Clique no rótulo "Sistema" na barra inferior do mapa') },
    ],
    [
      { icone: '🖨️', dica: 'Imprimir mapa', onClick: acoes.onImprimirMapa },
      { icone: '⬇️', dica: 'Exportar KML do imóvel selecionado', onClick: acoes.onExportarKmlSelecionado },
    ],
    [
      { icone: '📊', dica: 'Importar planilha (40.000+)', onClick: indisponivel('Fora do escopo do MVP — ver DESENVOLVIMENTO_STATUS.md'), destaque: 'bg-verde/20 border-verde' },
      { icone: '🌐', dica: 'GeoNetwork — Catálogo de camadas', onClick: acoes.onAbrirCatalogoGeoNetwork, destaque: 'bg-[#1a6a8a]/25 border-[#1a6a8a]' },
      { icone: '⚠️', dica: 'Duplicidades cadastrais', onClick: indisponivel('Fora do escopo do MVP — dado mockado no protótipo original'), destaque: 'bg-red-500/15 border-red-500' },
      { icone: '👤', dica: 'Usuários e permissões', onClick: acoes.onOperadores, destaque: 'bg-[#1a6a8a]/25 border-[#1a6a8a]' },
    ],
    [
      { icone: '⬡', dica: 'Ajuste topológico', onClick: indisponivel('Ainda não implementado (Fase B)'), destaque: 'bg-ua/20 border-ua' },
      { icone: '🗂️', dica: 'Quadras Georreferenciadas', onClick: acoes.onQuadras, destaque: 'bg-ambar/20 border-ambar' },
      { icone: '🔄', dica: 'Converter feições KML em Cadastros', onClick: indisponivel('Ainda não implementado (Fase D)'), destaque: 'bg-verde/20 border-verde' },
    ],
  ]

  return (
    <div className="flex h-9 items-center gap-0.5 border-b border-white/10 bg-[#12253f] px-2 print:hidden">
      {grupos.map((grupo, i) => (
        <div key={i} className="flex items-center gap-0.5">
          {i > 0 && <Separador />}
          {grupo.map((b) => (
            <button
              key={b.dica}
              onClick={b.onClick}
              title={b.dica}
              className={`flex h-6.5 w-6.5 items-center justify-center rounded border border-transparent text-[13px] hover:bg-white/10 ${b.destaque ?? ''}`}
            >
              {b.icone}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
