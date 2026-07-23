import type { WizardFormData, ImovelHerdado } from './types'
import { montarInscricao } from '../../utils/inscricao'

function soDigitos(valor: string, max: number) {
  return valor.replace(/\D/g, '').slice(0, max)
}

type Props = {
  form: WizardFormData
  set: <K extends keyof WizardFormData>(campo: K, valor: WizardFormData[K]) => void
  herdado: ImovelHerdado | null
  buscandoHerdado: boolean
  duplicado: string | null
}

export function Step1Inscricao({ form, set, herdado, buscandoHerdado, duplicado }: Props) {
  const insc = montarInscricao(
    form.di || '__',
    (form.se || '__').padStart(2, '0'),
    (form.qu || '___').padStart(3, '0'),
    (form.lote || '____').padStart(4, '0'),
    (form.unidade || '___').padStart(3, '0'),
  )

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-3 text-sm text-gray-600">
          Informe a inscrição cadastral no formato Distrito.Setor.Quadra.Lote-Unidade.
        </p>
        <div className="grid grid-cols-5 gap-3">
          <Campo label="Distrito" placeholder="03" value={form.di} onChange={(v) => set('di', soDigitos(v, 2))} />
          <Campo label="Setor" placeholder="01" value={form.se} onChange={(v) => set('se', soDigitos(v, 2))} />
          <Campo label="Quadra" placeholder="042" value={form.qu} onChange={(v) => set('qu', soDigitos(v, 3))} />
          <Campo label="Lote" placeholder="0036" value={form.lote} onChange={(v) => set('lote', soDigitos(v, 4))} />
          <Campo
            label="Unidade"
            placeholder="000"
            value={form.unidade}
            onChange={(v) => set('unidade', soDigitos(v, 3))}
          />
        </div>
        <p className="mt-3 rounded bg-gray-50 px-3 py-2 text-center font-mono text-lg text-navy">{insc}</p>
      </div>

      {buscandoHerdado && <p className="text-sm text-gray-500">Verificando lote existente…</p>}

      {herdado && (
        <div className="rounded-lg border border-verde/40 bg-verde/5 p-3 text-sm text-navy">
          <p className="font-medium">🔗 Terreno já cadastrado encontrado: {herdado.insc} — {herdado.prop}</p>
          <p className="mt-1 text-xs text-gray-600">
            O polígono do terreno e os dados de endereço serão pré-carregados nas próximas etapas. Você poderá
            ajustar o que for necessário.
          </p>
        </div>
      )}

      {duplicado && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          ⚠️ Já existe um imóvel cadastrado com esta inscrição completa: {duplicado}
        </div>
      )}
    </div>
  )
}

function Campo({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  placeholder: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        inputMode="numeric"
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-gray-300 px-2 py-2 text-center font-mono focus:border-verde focus:outline-none"
      />
    </div>
  )
}
