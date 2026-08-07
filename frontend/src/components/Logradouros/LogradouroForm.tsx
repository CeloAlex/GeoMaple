import { useRef, useState } from 'react'
import { MapContainer, TileLayer, LayersControl } from 'react-leaflet'
import { SingleLineDraw, type SingleLineHandle } from '../Map/SingleLineDraw'
import { MapaExpansivel, InvalidateSizeAoMudar } from '../Map/MapaExpansivel'
import { ESRI_WORLD_IMAGERY, ESRI_MAX_NATIVE_ZOOM, MAX_ZOOM, OSM_STREETS } from '../Map/constants'
import { useMunicipioStore } from '../../store/municipioStore'
import { TIPO_LABEL, SITUACAO_LABEL, type LogradouroFormData } from './types'

const COR_LOGRADOURO = '#16a085'

function fmtComprimento(m: number) {
  return m >= 1000 ? `${(m / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} km` : `${m.toFixed(0)} m`
}

function extrairErro(err: unknown, fallback: string) {
  return (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? fallback
}

type Props = {
  titulo: string
  inicial: LogradouroFormData
  onSalvar: (dados: LogradouroFormData) => Promise<void>
  onCancelar: () => void
}

export function LogradouroForm({ titulo, inicial, onSalvar, onCancelar }: Props) {
  const centro = useMunicipioStore((s) => s.municipio.centro)
  const [form, setForm] = useState<LogradouroFormData>(inicial)
  const [comprimento, setComprimento] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const drawRef = useRef<SingleLineHandle>(null)
  const [expandido, setExpandido] = useState(false)

  function set<K extends keyof LogradouroFormData>(campo: K, valor: LogradouroFormData[K]) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function handleSalvar() {
    if (!form.nome.trim()) return setErro('Informe o nome do logradouro')
    setErro(null)
    setSalvando(true)
    try {
      await onSalvar(form)
    } catch (err) {
      setErro(extrairErro(err, 'Falha ao salvar'))
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
        <label className="mb-1 block text-xs font-medium text-gray-700">Nome *</label>
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
          <label className="mb-1 block text-xs font-medium text-gray-700">Situação</label>
          <select
            value={form.situacao}
            onChange={(e) => set('situacao', e.target.value)}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
          >
            {Object.entries(SITUACAO_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Bairro(s)</label>
          <input
            value={form.bairros}
            onChange={(e) => set('bairros', e.target.value)}
            placeholder="Separe por vírgula"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-verde focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">CEP</label>
          <input
            value={form.cep}
            onChange={(e) => set('cep', e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-verde focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">Distrito</label>
        <input
          value={form.distrito}
          onChange={(e) => set('distrito', e.target.value)}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-verde focus:outline-none"
        />
      </div>

      <fieldset className="rounded border border-gray-200 p-2.5">
        <legend className="px-1 text-xs font-medium text-gray-700">Lei de denominação</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-600">Número</label>
            <input
              value={form.leiNumero}
              onChange={(e) => set('leiNumero', e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-verde focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Data</label>
            <input
              type="date"
              value={form.leiData}
              onChange={(e) => set('leiData', e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-verde focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-2">
          <label className="mb-1 block text-xs text-gray-600">Link</label>
          <input
            value={form.leiLink}
            onChange={(e) => set('leiLink', e.target.value)}
            placeholder="https://…"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-verde focus:outline-none"
          />
        </div>
      </fieldset>

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
            style={{ backgroundColor: COR_LOGRADOURO }}
          >
            ✏️ Desenhar eixo do logradouro
          </button>
          <button
            type="button"
            onClick={() => drawRef.current?.finalizarDesenho()}
            className="rounded border border-verde px-3 py-1.5 text-xs font-medium text-verde hover:bg-verde/10"
          >
            ✅ Concluir linha
          </button>
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
            <SingleLineDraw
              geom={form.geom}
              cor={COR_LOGRADOURO}
              onChange={(geom, m) => {
                set('geom', geom)
                setComprimento(m)
              }}
              ref={drawRef}
            />
            <InvalidateSizeAoMudar watch={expandido} />
          </MapContainer>
        </MapaExpansivel>
        <p className="mt-1 text-xs text-gray-500">
          {form.geom ? `✅ ${fmtComprimento(comprimento ?? 0)}` : 'Nenhum eixo desenhado ainda (opcional)'}
        </p>
      </div>

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      <button
        onClick={handleSalvar}
        disabled={salvando}
        className="w-full rounded bg-verde py-2 text-sm font-medium text-white hover:bg-verde/90 disabled:opacity-60"
      >
        {salvando ? 'Salvando…' : '💾 Salvar logradouro'}
      </button>
    </div>
  )
}
