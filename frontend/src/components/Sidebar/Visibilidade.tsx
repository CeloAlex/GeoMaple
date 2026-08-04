// Checkbox de habilitar/desabilitar um ramo (Distrito/Setor/Quadra) nas árvores de camadas
// (ArvoreCadastros.tsx, ArvoreQuadras.tsx) — compartilhado pelas duas árvores. `onClick`
// para propagação é interrompido para não disparar o toggle nativo do <details>/<summary>
// que envolve o checkbox.
export function Visibilidade({
  chave,
  ramosOcultos,
  onAlternarRamo,
}: {
  chave: string
  ramosOcultos: Set<string>
  onAlternarRamo: (chave: string) => void
}) {
  return (
    <input
      type="checkbox"
      checked={!ramosOcultos.has(chave)}
      onClick={(e) => e.stopPropagation()}
      onChange={() => onAlternarRamo(chave)}
      title="Exibir/ocultar no mapa"
      className="mr-1.5 shrink-0 accent-verde"
    />
  )
}
