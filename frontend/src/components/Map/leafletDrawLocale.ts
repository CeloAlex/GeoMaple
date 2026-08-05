import L from 'leaflet'
import 'leaflet-draw'

// Traduz as mensagens padrão (em inglês) do leaflet-draw para português — em especial
// "No layers to edit"/"No layers to delete", que apareciam sem tradução e confundiam o
// usuário sobre o que os ícones de editar/excluir faziam. Import único, chamado a partir
// de MapView.tsx (efeito colateral em L.drawLocal, compartilhado por todas as instâncias
// de L.Control.Draw da aplicação).
export function aplicarLocalePtBr() {
  L.drawLocal.draw.toolbar.buttons.polyline = 'Desenhar uma linha'
  L.drawLocal.draw.toolbar.buttons.polygon = 'Desenhar um polígono'
  L.drawLocal.draw.handlers.polygon.tooltip.start = 'Clique para começar a desenhar o polígono.'
  L.drawLocal.draw.handlers.polygon.tooltip.cont = 'Clique para continuar desenhando o polígono.'
  L.drawLocal.draw.handlers.polygon.tooltip.end = 'Clique novamente no 1º vértice ou use o botão "Concluir polígono" para fechar.'
  L.drawLocal.draw.handlers.polyline.tooltip.start = 'Clique para começar a desenhar a linha.'
  L.drawLocal.draw.handlers.polyline.tooltip.cont = 'Clique para continuar desenhando a linha.'
  L.drawLocal.draw.handlers.polyline.tooltip.end = 'Clique no último ponto para finalizar a linha.'
  L.drawLocal.draw.handlers.polyline.error = '<strong>Erro:</strong> as bordas da forma não podem se cruzar!'

  L.drawLocal.edit.toolbar.buttons.edit = 'Editar polígonos'
  L.drawLocal.edit.toolbar.buttons.editDisabled = 'Nenhum polígono para editar — desenhe um primeiro'
  L.drawLocal.edit.toolbar.buttons.remove = 'Excluir polígonos'
  L.drawLocal.edit.toolbar.buttons.removeDisabled = 'Nenhum polígono para excluir'
  L.drawLocal.edit.toolbar.actions.save.text = 'Salvar'
  L.drawLocal.edit.toolbar.actions.save.title = 'Salvar alterações'
  L.drawLocal.edit.toolbar.actions.cancel.text = 'Cancelar'
  L.drawLocal.edit.toolbar.actions.cancel.title = 'Cancela a edição e descarta as alterações'
  L.drawLocal.edit.handlers.edit.tooltip.text = 'Arraste os vértices para editar o polígono.'
  L.drawLocal.edit.handlers.edit.tooltip.subtext = 'Clique em cancelar para desfazer as alterações.'
  L.drawLocal.edit.handlers.remove.tooltip.text = 'Clique em um polígono para excluí-lo.'
}
