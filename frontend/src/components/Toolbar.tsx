import type { AcoesShell } from './shell/AcoesShell'
import { mensagemForaDoEscopo } from '../constants/mensagens'

export type Botao = { icone: string; dica: string; descricao: string; onClick: () => void; destaque?: string }

function Separador() {
  return <div className="mx-1 h-5 w-px bg-white/15" />
}

// Fábrica dos grupos de botões da toolbar — extraída da função do componente para que o
// Manual do Sistema (Relatorios/ManualSistema.tsx) possa importá-la e listar os mesmos
// botões (ícone/nome/descrição) automaticamente, sem duplicar a lista à mão.
export function criarGrupos(acoes: AcoesShell): Botao[][] {
  const indisponivel = (msg: string) => () => acoes.onIndisponivel(msg)

  return [
    [{ icone: '📑', dica: 'Painel lateral', descricao: 'Mostra ou esconde o painel lateral de cadastros e árvores.', onClick: acoes.onToggleSidebar }],
    [
      { icone: '🏠', dica: 'Novo Cadastro Definitivo (Ctrl+N)', descricao: 'Inicia o assistente de cadastro de um novo imóvel definitivo.', onClick: acoes.onNovoCadastro, destaque: 'bg-[#2980b9]/25 border-[#2980b9]' },
      { icone: '🚧', dica: 'Nova Delimitação Provisória (Ctrl+D)', descricao: 'Inicia o assistente de cadastro de uma delimitação provisória.', onClick: acoes.onNovaProvisoria, destaque: 'bg-[#e67e22]/25 border-[#e67e22]' },
    ],
    [
      { icone: '📐', dica: 'Régua: área', descricao: 'Mede a área de um polígono desenhado no mapa.', onClick: acoes.onMedirArea },
      { icone: '📏', dica: 'Régua: distância', descricao: 'Mede a distância entre pontos desenhados no mapa.', onClick: acoes.onMedirDistancia },
      { icone: '📍', dica: 'Ponto georreferenciado', descricao: 'Marca um ponto de referência no mapa (disponível pelo botão equivalente no próprio mapa).', onClick: indisponivel('Use o botão 📍 no mapa (abaixo da régua)') },
      { icone: '📥', dica: 'Importar KML / KMZ / GeoJSON', descricao: 'Importa feições de um arquivo KML, KMZ ou GeoJSON (disponível pela barra lateral).', onClick: indisponivel('Use "Importar KML/GeoJSON" na barra lateral') },
      { icone: '↩️', dica: 'Desfazer último vértice (Ctrl+Z)', descricao: 'Remove o último vértice desenhado durante o traçado de um polígono.', onClick: indisponivel('Disponível durante o desenho de um polígono') },
    ],
    [
      { icone: '🛰️', dica: 'Satélite', descricao: 'Alterna a camada de base para imagem de satélite (disponível pelo seletor de camadas do mapa).', onClick: indisponivel('Use o seletor de camadas no mapa') },
      { icone: '🗺️', dica: 'Mapa de ruas', descricao: 'Alterna a camada de base para o mapa de ruas (disponível pelo seletor de camadas do mapa).', onClick: indisponivel('Use o seletor de camadas no mapa') },
      { icone: '🧭', dica: 'Sistema de coordenadas', descricao: 'Alterna o sistema de coordenadas exibido (disponível pelo rótulo "Sistema" na barra inferior do mapa).', onClick: indisponivel('Clique no rótulo "Sistema" na barra inferior do mapa') },
    ],
    [
      { icone: '🖨️', dica: 'Imprimir mapa', descricao: 'Abre a visualização de impressão do mapa atual.', onClick: acoes.onImprimirMapa },
      { icone: '⬇️', dica: 'Exportar KML do imóvel selecionado', descricao: 'Baixa a geometria do imóvel selecionado em formato KML.', onClick: acoes.onExportarKmlSelecionado },
    ],
    [
      { icone: '📊', dica: 'Importar planilha (40.000+)', descricao: 'Importação em massa de cadastros a partir de planilha (fora do escopo deste protótipo).', onClick: indisponivel(mensagemForaDoEscopo('importação em massa; ver DESENVOLVIMENTO_STATUS.md')), destaque: 'bg-verde/20 border-verde' },
      { icone: '🌐', dica: 'GeoNetwork — Catálogo de camadas', descricao: 'Abre o catálogo GeoNetwork para adicionar camadas WMS externas ao mapa.', onClick: acoes.onAbrirCatalogoGeoNetwork, destaque: 'bg-[#1a6a8a]/25 border-[#1a6a8a]' },
      { icone: '⚠️', dica: 'Duplicidades cadastrais', descricao: 'Lista cadastros com possível sobreposição de geometria (dado mockado no protótipo original).', onClick: indisponivel(mensagemForaDoEscopo('dado mockado no protótipo original')), destaque: 'bg-red-500/15 border-red-500' },
      { icone: '👤', dica: 'Usuários e permissões', descricao: 'Abre o painel de gerenciamento de usuários e permissões.', onClick: acoes.onOperadores, destaque: 'bg-[#1a6a8a]/25 border-[#1a6a8a]' },
    ],
    [
      { icone: '⬡', dica: 'Ajuste topológico', descricao: 'Ativa a edição de vértices de um lote selecionado para corrigir sua geometria.', onClick: acoes.onAjusteTopologico, destaque: 'bg-ua/20 border-ua' },
      { icone: '🗂️', dica: 'Quadras Georreferenciadas', descricao: 'Abre o painel de cadastro e edição de quadras georreferenciadas.', onClick: acoes.onQuadras, destaque: 'bg-ambar/20 border-ambar' },
      { icone: '🛣️', dica: 'Cadastro de Logradouros', descricao: 'Abre o painel de cadastro e edição de logradouros.', onClick: acoes.onLogradouros, destaque: 'bg-ua/20 border-ua' },
      { icone: '🔄', dica: 'Converter feições KML em Cadastros', descricao: 'Converte feições previamente importadas de KML em cadastros definitivos.', onClick: acoes.onConverterImportados, destaque: 'bg-verde/20 border-verde' },
    ],
  ]
}

export function Toolbar(acoes: AcoesShell) {
  const grupos = criarGrupos(acoes)

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
