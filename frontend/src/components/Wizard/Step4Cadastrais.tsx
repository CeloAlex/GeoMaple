import type { WizardFormData } from './types'
import { USO_LABEL, STATUS_LABEL, CADURB_TIPO_LABEL, TP_ARQ_LABEL, DEST_LABEL, PADRAO_LABEL } from './types'

type Props = {
  form: WizardFormData
  set: <K extends keyof WizardFormData>(campo: K, valor: WizardFormData[K]) => void
}

export function Step4Cadastrais({ form, set }: Props) {
  const predial = form.cadurb_tipo === '2'

  function alterarCadurbTipo(valor: string) {
    set('cadurb_tipo', valor)
    if (valor === '1') {
      set('tp_arq', '')
      set('ano_constr', '')
    }
  }

  const atCadNum = parseFloat(form.at_cad)
  const diferencaArea =
    !Number.isNaN(atCadNum) && atCadNum > 0 && form.areaTerrenoCalc
      ? ((form.areaTerrenoCalc - atCadNum) / atCadNum) * 100
      : null

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">Proprietário *</label>
        <input
          value={form.prop}
          onChange={(e) => set('prop', e.target.value)}
          required
          className="w-full rounded border border-gray-300 px-3 py-2 focus:border-verde focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Select
          label="Uso"
          value={form.uso}
          onChange={(v) => set('uso', v as WizardFormData['uso'])}
          opcoes={USO_LABEL}
        />
        <Select
          label="Status"
          value={form.st}
          onChange={(v) => set('st', v as WizardFormData['st'])}
          opcoes={STATUS_LABEL}
        />
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Tipo (livre)</label>
          <input
            value={form.tp}
            onChange={(e) => set('tp', e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 focus:border-verde focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Numero label="Área terreno cadastral (m²)" value={form.at_cad} onChange={(v) => set('at_cad', v)} />
        <Numero label="Área construída cadastral (m²)" value={form.ac_cad} onChange={(v) => set('ac_cad', v)} />
        <Numero label="Nº pavimentos" value={form.num_pav} onChange={(v) => set('num_pav', v)} />
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Fração ideal</label>
          <input
            value={form.frac_ideal}
            onChange={(e) => set('frac_ideal', e.target.value)}
            placeholder="Ex: 1/4"
            className="w-full rounded border border-gray-300 px-3 py-2 focus:border-verde focus:outline-none"
          />
        </div>
      </div>

      {diferencaArea !== null && Math.abs(diferencaArea) > 10 && (
        <div className="rounded border border-ambar bg-ambar/10 px-3 py-2 text-xs text-navy">
          ⚠️ A área georreferenciada difere {Math.abs(diferencaArea).toFixed(1)}% da área cadastral informada.
          Confira os dados.
        </div>
      )}

      <div className="rounded-lg border border-gray-200 p-4">
        <p className="mb-3 text-xs font-semibold text-navy">Campos SINTER / CADURB</p>
        <p className="mb-3 text-xs text-gray-500">
          O CIB é atribuído automaticamente pela integração com o SINTER após a transmissão.
        </p>

        <div className="grid grid-cols-3 gap-3">
          <Select
            label="Tipo Imóvel CADURB"
            value={form.cadurb_tipo}
            onChange={alterarCadurbTipo}
            opcoes={CADURB_TIPO_LABEL}
            placeholder="Selecione…"
          />
          <Select
            label={`Tipo Arquitetônico${predial ? ' *' : ''}`}
            value={form.tp_arq}
            onChange={(v) => set('tp_arq', v)}
            opcoes={TP_ARQ_LABEL}
            placeholder="N/A ou selecione…"
          />
          <Select label="Destinação" value={form.dest} onChange={(v) => set('dest', v)} opcoes={DEST_LABEL} />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <Select
            label="Padrão construtivo"
            value={form.padrao}
            onChange={(v) => set('padrao', v)}
            opcoes={PADRAO_LABEL}
            placeholder="Não informado"
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Ano de construção{predial ? ' *' : ''}
            </label>
            <input
              type="number"
              min={1800}
              max={2099}
              value={form.ano_constr}
              onChange={(e) => set('ano_constr', e.target.value)}
              disabled={form.cadurb_tipo === '1'}
              className="w-full rounded border border-gray-300 px-3 py-2 font-mono focus:border-verde focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
          <Numero label="Valor venal (R$)" value={form.valor_venal} onChange={(v) => set('valor_venal', v)} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">Observações</label>
        <textarea
          value={form.obs}
          onChange={(e) => set('obs', e.target.value)}
          rows={2}
          className="w-full rounded border border-gray-300 px-3 py-2 focus:border-verde focus:outline-none"
        />
      </div>
    </div>
  )
}

function Numero({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-gray-300 px-3 py-2 focus:border-verde focus:outline-none"
      />
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  opcoes,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  opcoes: Record<string, string>
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-gray-300 bg-white px-3 py-2 focus:border-verde focus:outline-none"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {Object.entries(opcoes).map(([v, nome]) => (
          <option key={v} value={v}>
            {nome}
          </option>
        ))}
      </select>
    </div>
  )
}
