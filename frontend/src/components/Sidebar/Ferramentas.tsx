import { useRef } from 'react'
import type { ImovelFeatureCollection } from '../../types/imovel'
import type { CamadaImportada } from '../../utils/importarGeo'
import { importarArquivo } from '../../utils/importarGeo'
import { baixarArquivo, linhasParaCSV } from '../../utils/download'

type Props = {
  imoveisVisiveis: ImovelFeatureCollection
  camadasImportadas: CamadaImportada[]
  onImportar: (camada: CamadaImportada) => void
  onLimparImportadas: () => void
}

function exportarCSV(fc: ImovelFeatureCollection) {
  const csv = linhasParaCSV(
    ['inscricao', 'proprietario', 'uso', 'status', 'area_cadastral_m2', 'area_georreferenciada_m2'],
    fc.features.map((f) => [
      f.properties.insc,
      f.properties.prop,
      f.properties.uso,
      f.properties.st,
      f.properties.at_cad,
      f.properties.at_geo,
    ]),
  )
  baixarArquivo('imoveis_visiveis.csv', csv, 'text/csv;charset=utf-8')
}

export function Ferramentas({ imoveisVisiveis, camadasImportadas, onImportar, onLimparImportadas }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    try {
      const camada = await importarArquivo(arquivo)
      onImportar(camada)
    } catch {
      // Falha silenciosa é aceitável aqui — é uma camada de referência visual, não dado cadastral
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => exportarCSV(imoveisVisiveis)}
        disabled={imoveisVisiveis.features.length === 0}
        className="w-full rounded border border-white/20 py-1.5 text-xs text-white/80 hover:bg-white/10 disabled:opacity-40"
      >
        ⬇️ Exportar CSV ({imoveisVisiveis.features.length} visíveis)
      </button>

      <input ref={inputRef} type="file" accept=".geojson,.json,.kml" className="hidden" onChange={handleArquivo} />
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full rounded border border-white/20 py-1.5 text-xs text-white/80 hover:bg-white/10"
      >
        📥 Importar KML/GeoJSON
      </button>

      {camadasImportadas.length > 0 && (
        <div className="flex items-center justify-between rounded bg-white/5 px-2 py-1.5 text-[11px] text-white/60">
          <span>
            {camadasImportadas.length} camada{camadasImportadas.length > 1 ? 's' : ''} importada
            {camadasImportadas.length > 1 ? 's' : ''}
          </span>
          <button onClick={onLimparImportadas} className="text-white/50 hover:text-white">
            🗑️ limpar
          </button>
        </div>
      )}
    </div>
  )
}
