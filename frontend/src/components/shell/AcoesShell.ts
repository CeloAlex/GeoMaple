// Ações compartilhadas entre a barra de menu superior e a toolbar de ícones — ambas
// disparam os mesmos handlers definidos em MainLayout, espelhando a duplicação
// menu/toolbar que existe no protótipo (SGCIM_v10.html).
export type AcoesShell = {
  onToggleSidebar: () => void
  onNovoCadastro: () => void
  onNovaProvisoria: () => void
  onQuadras: () => void
  onOperadores: () => void
  onExportarKmlSelecionado: () => void
  onExportarGeoJsonSelecionado: () => void
  onVerTodos: () => void
  onAdicionarWms: () => void
  onImprimirMapa: () => void
  onSobre: () => void
  onIndisponivel: (mensagem: string) => void
}
