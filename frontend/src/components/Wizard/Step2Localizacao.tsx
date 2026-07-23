import { useState } from 'react'
import type { WizardFormData } from './types'
import { buscarCep, mascararCep } from '../../api/viaCep'
import { useMunicipioStore } from '../../store/municipioStore'

type Props = {
  form: WizardFormData
  set: <K extends keyof WizardFormData>(campo: K, valor: WizardFormData[K]) => void
}

export function Step2Localizacao({ form, set }: Props) {
  const municipio = useMunicipioStore((s) => s.municipio)
  const [buscando, setBuscando] = useState(false)
  const [erroCep, setErroCep] = useState<string | null>(null)
  const [avisoCep, setAvisoCep] = useState<string | null>(null)

  async function handleBuscarCep() {
    setErroCep(null)
    setAvisoCep(null)
    setBuscando(true)
    try {
      const endereco = await buscarCep(form.cep)
      if (!endereco) {
        setErroCep('CEP não encontrado')
        return
      }
      set('log', endereco.logradouro || form.log)
      set('bai', endereco.bairro || form.bai)
      if (endereco.localidade && endereco.localidade !== municipio.nome) {
        setAvisoCep(`Este CEP pertence a ${endereco.localidade}/${endereco.uf}, fora de ${municipio.nome}/${municipio.uf}.`)
      }
    } catch {
      setErroCep('Erro ao buscar CEP')
    } finally {
      setBuscando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-700">CEP</label>
          <div className="flex gap-2">
            <input
              value={form.cep}
              onChange={(e) => set('cep', mascararCep(e.target.value))}
              placeholder="35400-000"
              className="flex-1 rounded border border-gray-300 px-3 py-2 font-mono focus:border-verde focus:outline-none"
            />
            <button
              type="button"
              onClick={handleBuscarCep}
              disabled={buscando || form.cep.replace(/\D/g, '').length !== 8}
              className="shrink-0 rounded border border-navy px-3 py-2 text-sm text-navy transition hover:bg-navy hover:text-white disabled:opacity-40"
            >
              {buscando ? 'Buscando…' : 'Buscar CEP'}
            </button>
          </div>
          {erroCep && <p className="mt-1 text-xs text-red-600">{erroCep}</p>}
          {avisoCep && <p className="mt-1 text-xs text-ambar">⚠️ {avisoCep}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Cidade / UF</label>
          <input
            value={`${municipio.nome} / ${municipio.uf}`}
            disabled
            className="w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-700">Logradouro *</label>
          <input
            value={form.log}
            onChange={(e) => set('log', e.target.value)}
            required
            className="w-full rounded border border-gray-300 px-3 py-2 focus:border-verde focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Número</label>
          <input
            value={form.nr}
            onChange={(e) => set('nr', e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 focus:border-verde focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">Bairro</label>
        <input
          value={form.bai}
          onChange={(e) => set('bai', e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 focus:border-verde focus:outline-none"
        />
      </div>
    </div>
  )
}
