import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { ImovelRegistro } from '../../types/imovel'
import { diferencaPercentualArea, areaInconsistente, LIMIAR_INCONSISTENCIA_PCT } from '../../utils/areaInconsistencia'
import { baixarArquivo, linhasParaCSV } from '../../utils/download'

type Props = {
  onClose: () => void
  onSelecionarImovel: (imovel: ImovelRegistro) => void
}

type Linha = {
  imovel: ImovelRegistro
  campo: 'Terreno' | 'Edificação'
  cad: number
  geo: number
  diferenca: number
}

function formatarArea(m2: number) {
  return `${m2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m²`
}

function montarLinhas(imoveis: ImovelRegistro[]): Linha[] {
  const linhas: Linha[] = []
  for (const im of imoveis) {
    if (areaInconsistente(im.at_cad, im.at_geo, im.at_aviso_ok)) {
      linhas.push({
        imovel: im,
        campo: 'Terreno',
        cad: im.at_cad!,
        geo: im.at_geo!,
        diferenca: diferencaPercentualArea(im.at_cad, im.at_geo)!,
      })
    }
    if (areaInconsistente(im.ac_cad, im.ac_geo, im.ac_aviso_ok)) {
      linhas.push({
        imovel: im,
        campo: 'Edificação',
        cad: im.ac_cad!,
        geo: im.ac_geo!,
        diferenca: diferencaPercentualArea(im.ac_cad, im.ac_geo)!,
      })
    }
  }
  return linhas.sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca))
}

// Reaproveita a mesma fórmula/limiar já usados na ficha do imóvel (DetailPanel.tsx) e no
// alerta do wizard (Wizard/Step4Cadastrais.tsx) — ver utils/areaInconsistencia.ts. Só lista
// imóveis com ativo=true (padrão de GET /api/imoveis) e não considera dispensas já
// marcadas como revisadas (at_aviso_ok/ac_aviso_ok).
export function RelatorioInconsistencias({ onClose, onSelecionarImovel }: Props) {
  const [imoveis, setImoveis] = useState<ImovelRegistro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setCarregando(true)
    api
      .get<ImovelRegistro[]>('/api/imoveis')
      .then(({ data }) => setImoveis(data))
      .catch((err) => setErro((err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? 'Falha ao carregar'))
      .finally(() => setCarregando(false))
  }, [])

  const linhas = montarLinhas(imoveis)

  function exportarCSV() {
    const csv = linhasParaCSV(
      ['inscricao', 'proprietario', 'campo', 'area_cadastral_m2', 'area_georreferenciada_m2', 'diferenca_pct'],
      linhas.map((l) => [l.imovel.insc, l.imovel.prop, l.campo, l.cad, l.geo, l.diferenca.toFixed(1)]),
    )
    baixarArquivo('inconsistencias_area.csv', csv, 'text/csv;charset=utf-8')
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-base font-semibold text-navy">⚠️ Relatório de Inconsistências de Área</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-lg text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {erro && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
          {carregando && <p className="text-sm text-gray-500">Carregando…</p>}

          {!carregando && (
            <>
              <p className="mb-3 text-xs text-gray-500">
                Imóveis com diferença superior a {LIMIAR_INCONSISTENCIA_PCT}% entre área cadastral e área
                georreferenciada (excluindo os já marcados como revisados na ficha) — {linhas.length} ocorrência(s).
              </p>

              {linhas.length === 0 ? (
                <p className="rounded bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
                  Nenhuma inconsistência encontrada.
                </p>
              ) : (
                <>
                  <button
                    onClick={exportarCSV}
                    className="mb-3 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    ⬇️ Exportar CSV
                  </button>
                  <div className="overflow-x-auto rounded border border-gray-100">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                          <th className="py-1.5 pr-2 pl-2">Inscrição</th>
                          <th className="py-1.5 pr-2">Proprietário</th>
                          <th className="py-1.5 pr-2">Campo</th>
                          <th className="py-1.5 pr-2 text-right">Cadastral</th>
                          <th className="py-1.5 pr-2 text-right">Georref.</th>
                          <th className="py-1.5 pr-2 text-right">Diferença</th>
                          <th className="py-1.5 pr-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {linhas.map((l, i) => (
                          <tr key={`${l.imovel.id}-${l.campo}`} className={i > 0 ? 'border-t border-gray-100' : undefined}>
                            <td className="py-1.5 pr-2 pl-2 font-mono text-navy">{l.imovel.insc}</td>
                            <td className="max-w-[140px] truncate py-1.5 pr-2" title={l.imovel.prop}>
                              {l.imovel.prop}
                            </td>
                            <td className="py-1.5 pr-2">{l.campo}</td>
                            <td className="py-1.5 pr-2 text-right">{formatarArea(l.cad)}</td>
                            <td className="py-1.5 pr-2 text-right">{formatarArea(l.geo)}</td>
                            <td className="py-1.5 pr-2 text-right font-medium text-red-600">
                              {l.diferenca > 0 ? '+' : ''}
                              {l.diferenca.toFixed(1)}%
                            </td>
                            <td className="py-1.5 pr-2 text-right">
                              <button
                                onClick={() => {
                                  onSelecionarImovel(l.imovel)
                                  onClose()
                                }}
                                className="font-medium text-navy hover:underline"
                              >
                                Ver no mapa
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
