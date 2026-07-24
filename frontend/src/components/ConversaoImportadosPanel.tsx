import { useState } from 'react'
import L from 'leaflet'
import { api } from '../api/client'
import type { CamadaImportada, GeoJSONFeatureGenerica } from '../utils/importarGeo'
import type { PolygonGeoJSON } from '../types/imovel'
import { TIPO_LABEL, STATUS_LABEL } from './Provisorios/types'

type Props = {
  onClose: () => void
  camadasImportadas: CamadaImportada[]
  onConvertidoProvisorio: () => void
  onConverterParaDefinitivo: (geom: PolygonGeoJSON) => void
}

type FeicaoPoligono = {
  camada: string
  indice: number
  nome: string
  geom: PolygonGeoJSON
  areaM2: number
}

function ehPoligono(f: GeoJSONFeatureGenerica): f is GeoJSONFeatureGenerica & { geometry: PolygonGeoJSON } {
  return f.geometry.type === 'Polygon' && Array.isArray(f.geometry.coordinates)
}

function nomeFeicao(f: GeoJSONFeatureGenerica, indice: number): string {
  const props = f.properties as Record<string, unknown>
  return String(props.nome ?? props.name ?? props.Name ?? `Feição ${indice + 1}`)
}

function calcularAreaGeom(geom: PolygonGeoJSON): number {
  const latlngs = geom.coordinates[0].slice(0, -1).map(([lng, lat]) => L.latLng(lat, lng))
  return L.GeometryUtil.geodesicArea(latlngs)
}

function fmtArea(m2: number) {
  return m2 >= 10000
    ? `${(m2 / 10000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha`
    : `${m2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m²`
}

function extrairErro(err: unknown, fallback: string) {
  return (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? fallback
}

// "Converter feições KML em Cadastros" do protótipo: transforma um polígono de uma camada
// importada (hoje só referência visual — ver utils/importarGeo.ts) num registro real de
// Imóvel ou Delimitação Provisória. Conversão para Definitivo reaproveita o CadastroWizard
// (pré-carrega a geometria e deixa o operador preencher inscrição/proprietário); conversão
// para Provisório é direta, com um formulário rápido inline, pois exige poucos campos.
export function ConversaoImportadosPanel({
  onClose,
  camadasImportadas,
  onConvertidoProvisorio,
  onConverterParaDefinitivo,
}: Props) {
  const [convertendo, setConvertendo] = useState<FeicaoPoligono | null>(null)
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('rural')
  const [status, setStatus] = useState('em_estudo')
  const [obs, setObs] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const feicoes: FeicaoPoligono[] = camadasImportadas.flatMap((camada) =>
    camada.geojson.features
      .map((f, indice) => ({ f, indice }))
      .filter(({ f }) => ehPoligono(f))
      .map(({ f, indice }) => {
        const geom = f.geometry as PolygonGeoJSON
        return {
          camada: camada.nome,
          indice,
          nome: nomeFeicao(f, indice),
          geom,
          areaM2: calcularAreaGeom(geom),
        }
      }),
  )

  function iniciarConversaoProvisorio(feicao: FeicaoPoligono) {
    setConvertendo(feicao)
    setNome(feicao.nome)
    setTipo('rural')
    setStatus('em_estudo')
    setObs('')
    setErro(null)
  }

  async function salvarProvisorio() {
    if (!convertendo) return
    if (!nome.trim()) {
      setErro('Informe o nome/identificação')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await api.post('/api/provisorios', {
        nome: nome.trim(),
        tipo,
        status,
        obs: obs || undefined,
        geom: convertendo.geom,
      })
      setConvertendo(null)
      onConvertidoProvisorio()
    } catch (err) {
      setErro(extrairErro(err, 'Não foi possível salvar a delimitação provisória'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-2000 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-base font-semibold text-navy">🔄 Converter feições importadas em cadastros</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-lg text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {camadasImportadas.length === 0 && (
            <p className="rounded bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
              Nenhuma camada importada. Use "📥 Importar KML/GeoJSON" na barra lateral primeiro.
            </p>
          )}

          {camadasImportadas.length > 0 && feicoes.length === 0 && (
            <p className="rounded bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
              As camadas importadas não têm nenhum polígono (só é possível converter feições poligonais).
            </p>
          )}

          {!convertendo && feicoes.length > 0 && (
            <ul className="divide-y divide-gray-100 rounded border border-gray-100">
              {feicoes.map((feicao) => (
                <li key={`${feicao.camada}-${feicao.indice}`} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{feicao.nome}</p>
                    <p className="text-xs text-gray-400">
                      {feicao.camada} · {fmtArea(feicao.areaM2)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      onClick={() => iniciarConversaoProvisorio(feicao)}
                      className="rounded border border-orange-500 px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50"
                    >
                      🚧 Provisório
                    </button>
                    <button
                      onClick={() => {
                        onConverterParaDefinitivo(feicao.geom)
                        onClose()
                      }}
                      className="rounded bg-navy px-2 py-1 text-xs font-medium text-white hover:bg-navy/90"
                    >
                      🏠 Definitivo
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {convertendo && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-navy">Nova Delimitação Provisória — {convertendo.nome}</h3>
                <button onClick={() => setConvertendo(null)} className="text-xs text-gray-500 hover:text-gray-800">
                  ← Voltar
                </button>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Nome / identificação *</label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-verde focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Tipo</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
                  >
                    {Object.entries(TIPO_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
                  >
                    {Object.entries(STATUS_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Observações</label>
                <textarea
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  rows={2}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-verde focus:outline-none"
                />
              </div>

              <p className="text-xs text-gray-500">✅ Geometria: {fmtArea(convertendo.areaM2)} (herdada da feição importada)</p>

              {erro && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

              <button
                onClick={salvarProvisorio}
                disabled={salvando}
                className="w-full rounded bg-verde py-2 text-sm font-medium text-white hover:bg-verde/90 disabled:opacity-60"
              >
                {salvando ? 'Salvando…' : '💾 Salvar delimitação provisória'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
