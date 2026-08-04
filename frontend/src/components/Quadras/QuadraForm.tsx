import { useRef, useState } from 'react'
import { MapContainer, TileLayer, LayersControl } from 'react-leaflet'
import { SinglePolygonDraw, type SinglePolygonHandle } from '../Map/SinglePolygonDraw'
import { ColarCoordenadas } from '../Map/ColarCoordenadas'
import { MapaExpansivel, InvalidateSizeAoMudar } from '../Map/MapaExpansivel'
import { ESRI_WORLD_IMAGERY, ESRI_MAX_NATIVE_ZOOM, MAX_ZOOM, OSM_STREETS } from '../Map/constants'
import { useMunicipioStore } from '../../store/municipioStore'
import type { PolygonGeoJSON } from '../../types/imovel'

const COR_QUADRA = '#c9a227' // dourado — seção 7 do PROMPT_GEOMAPLE_MVP.md

export type QuadraFormData = {
  di: string
  se: string
  qu: string
  cod: string
  obs: string
  geom: PolygonGeoJSON | null
}

function fmtArea(m2: number) {
  return m2 >= 10000
    ? `${(m2 / 10000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha`
    : `${m2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m²`
}

type Props = {
  titulo: string
  inicial: QuadraFormData
  onSalvar: (dados: QuadraFormData) => Promise<void>
  onCancelar: () => void
}

export function QuadraForm({ titulo, inicial, onSalvar, onCancelar }: Props) {
  const centro = useMunicipioStore((s) => s.municipio.centro)
  const [form, setForm] = useState<QuadraFormData>(inicial)
  const [area, setArea] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const drawRef = useRef<SinglePolygonHandle>(null)
  const [expandido, setExpandido] = useState(false)

  function set<K extends keyof QuadraFormData>(campo: K, valor: QuadraFormData[K]) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function handleSalvar() {
    if (!form.di.trim() || !form.se.trim() || !form.qu.trim()) {
      return setErro('Distrito, Setor e Quadra são obrigatórios')
    }
    setErro(null)
    setSalvando(true)
    try {
      await onSalvar(form)
    } catch (err) {
      setErro((err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? 'Falha ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-navy">{titulo}</h3>
        <button onClick={onCancelar} className="text-xs text-gray-500 hover:text-gray-800">
          Cancelar
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Distrito *</label>
          <input
            value={form.di}
            onChange={(e) => set('di', e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 font-mono text-sm focus:border-verde focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Setor *</label>
          <input
            value={form.se}
            onChange={(e) => set('se', e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 font-mono text-sm focus:border-verde focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Quadra *</label>
          <input
            value={form.qu}
            onChange={(e) => set('qu', e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 font-mono text-sm focus:border-verde focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Código</label>
          <input
            value={form.cod}
            onChange={(e) => set('cod', e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-verde focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">Observações</label>
        <textarea
          value={form.obs}
          onChange={(e) => set('obs', e.target.value)}
          rows={2}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-verde focus:outline-none"
        />
      </div>

      <div>
        <div className="mb-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => drawRef.current?.iniciarDesenho()}
            className="rounded px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            style={{ backgroundColor: COR_QUADRA }}
          >
            ✏️ Desenhar polígono da quadra
          </button>
          <button
            type="button"
            onClick={() => drawRef.current?.finalizarDesenho()}
            className="rounded border border-verde px-3 py-1.5 text-xs font-medium text-verde hover:bg-verde/10"
          >
            ✅ Concluir polígono
          </button>
          <ColarCoordenadas onAplicar={(pontos) => drawRef.current?.criarDePontos(pontos)} />
        </div>
        <MapaExpansivel expandido={expandido} onToggle={() => setExpandido((e) => !e)} alturaNormal="h-64">
          <MapContainer center={[centro.lat, centro.lng]} zoom={16} maxZoom={MAX_ZOOM} className="h-full w-full">
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Satélite">
                <TileLayer url={ESRI_WORLD_IMAGERY} attribution="Tiles &copy; Esri" maxZoom={MAX_ZOOM} maxNativeZoom={ESRI_MAX_NATIVE_ZOOM} />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Mapa">
                <TileLayer url={OSM_STREETS} attribution="&copy; OpenStreetMap" maxZoom={MAX_ZOOM} maxNativeZoom={19} />
              </LayersControl.BaseLayer>
            </LayersControl>
            <SinglePolygonDraw
              geom={form.geom}
              cor={COR_QUADRA}
              onChange={(geom, areaM2) => {
                set('geom', geom)
                setArea(areaM2)
              }}
              ref={drawRef}
            />
            <InvalidateSizeAoMudar watch={expandido} />
          </MapContainer>
        </MapaExpansivel>
        <p className="mt-1 text-xs text-gray-500">{form.geom ? `✅ ${fmtArea(area ?? 0)}` : 'Nenhum polígono desenhado ainda (opcional)'}</p>
      </div>

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      <button
        onClick={handleSalvar}
        disabled={salvando}
        className="w-full rounded bg-verde py-2 text-sm font-medium text-white hover:bg-verde/90 disabled:opacity-60"
      >
        {salvando ? 'Salvando…' : '💾 Salvar quadra'}
      </button>
    </div>
  )
}
