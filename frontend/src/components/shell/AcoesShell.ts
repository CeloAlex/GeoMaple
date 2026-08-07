// Ações compartilhadas entre a barra de menu superior e a toolbar de ícones — ambas
// disparam os mesmos handlers definidos em MainLayout, espelhando a duplicação
// menu/toolbar que existe no protótipo (SGCIM_v10.html).
export type AcoesShell = {
  onToggleSidebar: () => void
  onNovoCadastro: () => void
  onNovaProvisoria: () => void
  onQuadras: () => void
  onLogradouros: () => void
  onOperadores: () => void
  onExportarKmlSelecionado: () => void
  onExportarGeoJsonSelecionado: () => void
  onVerTodos: () => void
  onAbrirCatalogoGeoNetwork: () => void
  onConverterImportados: () => void
  onImprimirMapa: () => void
  onSobre: () => void
  onIndisponivel: (mensagem: string) => void
  onMedirDistancia: () => void
  onMedirArea: () => void
  onAjusteTopologico: () => void
  onCertidaoLogradouro: () => void
  onRelatorioInconsistencias: () => void
  onRelatorioProprietario: () => void
  onManualSistema: () => void
  onMaterialDivulgacao: () => void
}
