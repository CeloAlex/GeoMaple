import { useEffect, useRef, useState } from 'react'
import type { ImovelFeatureCollection } from '../../types/imovel'
import type { CamadaImportada } from '../../utils/importarGeo'
import { importarArquivo } from '../../utils/importarGeo'
import { baixarArquivo, linhasParaCSV } from '../../utils/download'
import type { CamadaWms } from '../Map/MapView'

type Props = {
  imoveisVisiveis: ImovelFeatureCollection
  camadasImportadas: CamadaImportada[]
  onImportar: (camada: CamadaImportada) => void
  onLimparImportadas: () => void
  camadasWms: CamadaWms[]
  onAdicionarWms: (camada: CamadaWms) => void
  onRemoverWms: (id: string) => void
  abrirFormularioEm?: number
  onErro?: (msg: string) => void
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

export function Ferramentas({
  imoveisVisiveis,
  camadasImportadas,
  onImportar,
  onLimparImportadas,
  camadasWms,
  onAdicionarWms,
  onRemoverWms,
  abrirFormularioEm,
  onErro,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [wmsAberto, setWmsAberto] = useState(false)

  useEffect(() => {
    if (abrirFormularioEm) setWmsAberto(true)
  }, [abrirFormularioEm])
  const [wmsNome, setWmsNome] = useState('')
  const [wmsUrl, setWmsUrl] = useState('')
  const [wmsLayers, setWmsLayers] = useState('')
  const [wmsVersion, setWmsVersion] = useState<'1.1.1' | '1.3.0'>('1.1.1')

  async function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    try {
      const camada = await importarArquivo(arquivo)
      if (camada.geojson.features.length === 0) {
        onErro?.(`Não foi possível extrair feições de "${arquivo.name}" — verifique se é um KML/GeoJSON válido.`)
        return
      }
      onImportar(camada)
    } catch {
      onErro?.(`Falha ao importar "${arquivo.name}" — verifique se é um KML/GeoJSON válido.`)
    }
  }

  function adicionarWms() {
    if (!wmsUrl.trim() || !wmsLayers.trim()) return
    onAdicionarWms({
      id: crypto.randomUUID(),
      nome: wmsNome.trim() || wmsLayers.trim(),
      url: wmsUrl.trim(),
      layers: wmsLayers.trim(),
      version: wmsVersion,
    })
    setWmsNome('')
    setWmsUrl('')
    setWmsLayers('')
    setWmsVersion('1.1.1')
    setWmsAberto(false)
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

      <button
        onClick={() => setWmsAberto((a) => !a)}
        className="w-full rounded border border-white/20 py-1.5 text-xs text-white/80 hover:bg-white/10"
      >
        🌐 Adicionar camada WMS
      </button>

      {wmsAberto && (
        <div className="space-y-1.5 rounded border border-white/10 bg-white/5 p-2">
          <input
            value={wmsNome}
            onChange={(e) => setWmsNome(e.target.value)}
            placeholder="Nome de exibição (opcional)"
            className="w-full rounded border border-white/20 bg-white/10 px-2 py-1 text-[11px] text-white placeholder:text-white/40 focus:border-verde focus:outline-none"
          />
          <input
            value={wmsUrl}
            onChange={(e) => setWmsUrl(e.target.value)}
            placeholder="URL do serviço WMS"
            className="w-full rounded border border-white/20 bg-white/10 px-2 py-1 text-[11px] text-white placeholder:text-white/40 focus:border-verde focus:outline-none"
          />
          <input
            value={wmsLayers}
            onChange={(e) => setWmsLayers(e.target.value)}
            placeholder="Nome técnico da(s) layer(s)"
            className="w-full rounded border border-white/20 bg-white/10 px-2 py-1 text-[11px] text-white placeholder:text-white/40 focus:border-verde focus:outline-none"
          />
          <select
            value={wmsVersion}
            onChange={(e) => setWmsVersion(e.target.value as '1.1.1' | '1.3.0')}
            className="w-full rounded border border-white/20 bg-white/10 px-2 py-1 text-[11px] text-white focus:border-verde focus:outline-none"
          >
            <option value="1.1.1" className="text-black">Versão WMS 1.1.1 (padrão)</option>
            <option value="1.3.0" className="text-black">Versão WMS 1.3.0</option>
          </select>
          <button
            onClick={adicionarWms}
            disabled={!wmsUrl.trim() || !wmsLayers.trim()}
            className="w-full rounded bg-verde py-1 text-[11px] font-medium text-white hover:bg-verde/90 disabled:opacity-40"
          >
            Adicionar ao mapa
          </button>
        </div>
      )}

      {camadasWms.length > 0 && (
        <div className="space-y-1">
          {camadasWms.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded bg-white/5 px-2 py-1.5 text-[11px] text-white/60"
            >
              <span className="truncate" title={c.nome}>
                🌐 {c.nome}
              </span>
              <button onClick={() => onRemoverWms(c.id)} className="ml-2 shrink-0 text-white/50 hover:text-white">
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
