import { useRef, useState } from 'react'
import { MapContainer, TileLayer, LayersControl } from 'react-leaflet'
import { SinglePolygonDraw, type SinglePolygonHandle } from '../Map/SinglePolygonDraw'
import { ColarCoordenadas } from '../Map/ColarCoordenadas'
import { ESRI_WORLD_IMAGERY, ESRI_MAX_NATIVE_ZOOM, MAX_ZOOM, OSM_STREETS } from '../Map/constants'
import { useMunicipioStore } from '../../store/municipioStore'
import { TIPO_LABEL, STATUS_LABEL, type ProvisorioFormData } from './types'

const COR_PROVISORIO = '#e67e22' // laranja — seção 7 do PROMPT_GEOMAPLE_MVP.md

function fmtArea(m2: number) {
  return m2 >= 10000
    ? `${(m2 / 10000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha`
    : `${m2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m²`
}

type Props = {
  titulo: string
  inicial: ProvisorioFormData
  onSalvar: (dados: ProvisorioFormData) => Promise<void>
  onCancelar: () => void
}

export function ProvisorioForm({ titulo, inicial, onSalvar, onCancelar }: Props) {
  const centro = useMunicipioStore((s) => s.municipio.centro)
  const [form, setForm] = useState<ProvisorioFormData>(inicial)
  const [area, setArea] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const drawRef = useRef<SinglePolygonHandle>(null)

  function set<K extends keyof ProvisorioFormData>(campo: K, valor: ProvisorioFormData[K]) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function handleSalvar() {
    if (!form.nome.trim()) return setErro('Informe o nome/identificação')
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

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">Nome / identificação *</label>
        <input
          value={form.nome}
          onChange={(e) => set('nome', e.target.value)}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-verde focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Tipo</label>
          <select
            value={form.tipo}
            onChange={(e) => set('tipo', e.target.value)}
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
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
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
            style={{ backgroundColor: COR_PROVISORIO }}
          >
            ✏️ Desenhar delimitação
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
        <div className="h-64 w-full overflow-hidden rounded border border-gray-300">
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
              cor={COR_PROVISORIO}
              onChange={(geom, areaM2) => {
                set('geom', geom)
                setArea(areaM2)
              }}
              ref={drawRef}
            />
          </MapContainer>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {form.geom ? `✅ ${fmtArea(area ?? 0)}` : 'Nenhum polígono desenhado ainda (opcional)'}
        </p>
      </div>

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      <button
        onClick={handleSalvar}
        disabled={salvando}
        className="w-full rounded bg-verde py-2 text-sm font-medium text-white hover:bg-verde/90 disabled:opacity-60"
      >
        {salvando ? 'Salvando…' : '💾 Salvar delimitação'}
      </button>
    </div>
  )
}
