import { useRef, useState } from 'react'
import type { ImovelFeatureCollection } from '../../types/imovel'
import type { CamadaImportada } from '../../utils/importarGeo'
import { importarArquivo } from '../../utils/importarGeo'
import { baixarArquivo, linhasParaCSV } from '../../utils/download'
import type { CamadaWms } from '../Map/MapView'

export type DestinoImportacao = 'cadastro' | 'provisorio' | 'quadra'

type Props = {
  imoveisVisiveis: ImovelFeatureCollection
  camadasImportadas: CamadaImportada[]
  onImportar: (camada: CamadaImportada) => void
  onLimparImportadas: () => void
  camadasWms: CamadaWms[]
  onRemoverWms: (id: string) => void
  onAtualizarWms: (id: string, patch: Partial<Pick<CamadaWms, 'ativa' | 'opacidade'>>) => void
  onAbrirCatalogoWms: () => void
  onErro?: (msg: string) => void
  // Ao importar um arquivo com pelo menos um polígono, pergunta o destino (cadastro,
  // provisório ou quadra) — a geometria substitui a etapa de desenho manual na tela
  // correspondente. Sem essa prop (ou se o usuário escolher "só visualizar"), cai no
  // comportamento padrão de camada de referência via onImportar.
  onEscolherDestinoImportacao?: (camada: CamadaImportada, destino: DestinoImportacao) => void
}

function primeiroPoligono(camada: CamadaImportada) {
  return camada.geojson.features.find((f) => f.geometry?.type === 'Polygon')
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
  onRemoverWms,
  onAtualizarWms,
  onAbrirCatalogoWms,
  onErro,
  onEscolherDestinoImportacao,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [camadaPendente, setCamadaPendente] = useState<CamadaImportada | null>(null)

  async function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    try {
      const camada = await importarArquivo(arquivo)
      if (camada.geojson.features.length === 0) {
        onErro?.(`Não foi possível extrair feições de "${arquivo.name}" — verifique se é um KML/KMZ/GeoJSON/Shapefile válido.`)
        return
      }
      if (onEscolherDestinoImportacao && primeiroPoligono(camada)) {
        setCamadaPendente(camada)
        return
      }
      onImportar(camada)
    } catch {
      onErro?.(`Falha ao importar "${arquivo.name}" — verifique se é um KML/KMZ/GeoJSON/Shapefile válido.`)
    }
  }

  function escolherDestino(destino: DestinoImportacao) {
    if (!camadaPendente) return
    onEscolherDestinoImportacao?.(camadaPendente, destino)
    setCamadaPendente(null)
  }

  function visualizarComoReferencia() {
    if (!camadaPendente) return
    onImportar(camadaPendente)
    setCamadaPendente(null)
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

      <input
        ref={inputRef}
        type="file"
        accept=".geojson,.json,.kml,.kmz,.zip,.shp"
        className="hidden"
        onChange={handleArquivo}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full rounded border border-white/20 py-1.5 text-xs text-white/80 hover:bg-white/10"
      >
        📥 Importar KML/KMZ/GeoJSON/Shapefile
      </button>

      {camadaPendente && (
        <div className="space-y-1.5 rounded border border-white/10 bg-white/5 p-2 text-[11px] text-white/80">
          <p>
            "{camadaPendente.nome}" importado. Para onde deseja levar o polígono?
          </p>
          <div className="grid grid-cols-1 gap-1">
            <button
              onClick={() => escolherDestino('cadastro')}
              className="rounded bg-verde/80 px-2 py-1 text-left hover:bg-verde"
            >
              🏠 Cadastro Definitivo
            </button>
            <button
              onClick={() => escolherDestino('provisorio')}
              className="rounded bg-orange-600/80 px-2 py-1 text-left hover:bg-orange-600"
            >
              🚧 Delimitação Provisória
            </button>
            <button
              onClick={() => escolherDestino('quadra')}
              className="rounded bg-ambar/80 px-2 py-1 text-left hover:bg-ambar"
            >
              🗺️ Quadra
            </button>
            <button onClick={visualizarComoReferencia} className="rounded border border-white/20 px-2 py-1 text-left hover:bg-white/10">
              👁️ Só visualizar como referência
            </button>
          </div>
        </div>
      )}

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
        onClick={onAbrirCatalogoWms}
        className="w-full rounded border border-white/20 py-1.5 text-xs text-white/80 hover:bg-white/10"
      >
        🌐 Adicionar camada WMS
      </button>

      {camadasWms.length > 0 && (
        <div className="space-y-1.5">
          {camadasWms.map((c) => (
            <div key={c.id} className="space-y-1 rounded bg-white/5 px-2 py-1.5 text-[11px] text-white/60">
              <div className="flex items-center justify-between gap-2">
                <label className="flex min-w-0 flex-1 items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={c.ativa !== false}
                    onChange={(e) => onAtualizarWms(c.id, { ativa: e.target.checked })}
                  />
                  <span className="truncate" title={c.nome}>
                    🌐 {c.nome}
                  </span>
                </label>
                <button onClick={() => onRemoverWms(c.id)} className="ml-2 shrink-0 text-white/50 hover:text-white">
                  🗑️
                </button>
              </div>
              <div className="flex items-center gap-1.5 pl-5">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={c.opacidade ?? 100}
                  onChange={(e) => onAtualizarWms(c.id, { opacidade: Number(e.target.value) })}
                  className="h-1 flex-1 accent-verde"
                />
                <span className="w-8 shrink-0 text-right text-white/50">{c.opacidade ?? 100}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
