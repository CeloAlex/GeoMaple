import { useState } from 'react'
import type { UAFormData } from './types'

const USO_LABEL: Record<string, string> = {
  terreno: 'Terreno',
  construido: 'Construído',
  em_construcao: 'Em construção',
}

const STATUS_LABEL: Record<string, string> = {
  regular: 'Regular',
  em_fiscalizacao: 'Em fiscalização',
  para_revisao: 'Para revisão',
}

type Props = {
  titulo: string
  inicial: UAFormData
  paiInfo: { insc: string; vertices: number | null; areaTerreno: number | null }
  onSalvar: (dados: UAFormData) => Promise<void>
  onCancelar: () => void
}

export function UAForm({ titulo, inicial, paiInfo, onSalvar, onCancelar }: Props) {
  const [form, setForm] = useState<UAFormData>(inicial)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function set<K extends keyof UAFormData>(campo: K, valor: UAFormData[K]) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function handleSalvar() {
    if (!form.insc.trim()) return setErro('Informe a inscrição cadastral')
    if (!form.prop.trim()) return setErro('Informe o proprietário')
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
    <div className="space-y-3 rounded border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-navy">{titulo}</h3>
        <button onClick={onCancelar} className="text-xs text-gray-500 hover:text-gray-800">
          Cancelar
        </button>
      </div>

      <p className="text-xs text-gray-500">
        📐 Geometria herdada do terreno <span className="font-mono">{paiInfo.insc}</span>
        {paiInfo.vertices ? ` · ${paiInfo.vertices} vértices` : ' · sem polígono ainda'}
        {paiInfo.areaTerreno ? ` · ${paiInfo.areaTerreno.toLocaleString('pt-BR')} m²` : ''}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Inscrição *</label>
          <input
            value={form.insc}
            onChange={(e) => set('insc', e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 font-mono text-sm focus:border-verde focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Proprietário *</label>
          <input
            value={form.prop}
            onChange={(e) => set('prop', e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-verde focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Uso</label>
          <select
            value={form.uso}
            onChange={(e) => set('uso', e.target.value)}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
          >
            {Object.entries(USO_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Status</label>
          <select
            value={form.st}
            onChange={(e) => set('st', e.target.value)}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
          >
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Área privativa (m²)</label>
          <input
            type="number"
            value={form.ac_cad}
            onChange={(e) => set('ac_cad', e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-verde focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Fração ideal</label>
          <input
            value={form.frac_ideal}
            onChange={(e) => set('frac_ideal', e.target.value)}
            placeholder="Ex: 1/4"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-verde focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Nº pavimentos</label>
          <input
            type="number"
            value={form.num_pav}
            onChange={(e) => set('num_pav', e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-verde focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Área terreno cadastral (m²)</label>
          <input
            type="number"
            value={form.at_cad}
            onChange={(e) => set('at_cad', e.target.value)}
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

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      <button
        onClick={handleSalvar}
        disabled={salvando}
        className="w-full rounded bg-verde py-2 text-sm font-medium text-white hover:bg-verde/90 disabled:opacity-60"
      >
        {salvando ? 'Salvando…' : '💾 Salvar unidade'}
      </button>
    </div>
  )
}
