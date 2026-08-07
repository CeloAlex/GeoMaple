// Fórmula única de inconsistência entre área cadastral e área georreferenciada —
// reaproveitada por DetailPanel.tsx (ficha), Wizard/Step4Cadastrais.tsx (alerta durante o
// cadastro), utils/exportarImovel.ts (ficha impressa) e Relatorios/RelatorioInconsistencias.tsx.
export const LIMIAR_INCONSISTENCIA_PCT = 10

export function diferencaPercentualArea(cad: number | null, geo: number | null): number | null {
  if (cad == null || geo == null || cad === 0) return null
  return ((geo - cad) / cad) * 100
}

export function areaInconsistente(cad: number | null, geo: number | null, avisoOk = false): boolean {
  if (avisoOk) return false
  const diferenca = diferencaPercentualArea(cad, geo)
  return diferenca != null && Math.abs(diferenca) > LIMIAR_INCONSISTENCIA_PCT
}
