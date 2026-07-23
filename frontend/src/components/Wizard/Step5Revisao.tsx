import type { WizardFormData } from './types'
import { USO_LABEL, STATUS_LABEL, CADURB_TIPO_LABEL, TP_ARQ_LABEL } from './types'
import { montarInscricao } from '../../utils/inscricao'

function fmtArea(m2: number | null) {
  if (m2 == null) return '—'
  return `${m2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m²`
}

export function Step5Revisao({ form }: { form: WizardFormData }) {
  const insc = montarInscricao(form.di, form.se, form.qu, form.lote, form.unidade)

  const itens: [string, string][] = [
    ['Inscrição', insc],
    ['Endereço', `${form.log}, ${form.nr || 's/n'} — ${form.bai || '—'}`],
    ['CEP', form.cep || '—'],
    ['Proprietário', form.prop],
    ['Uso / Status', `${USO_LABEL[form.uso]} · ${STATUS_LABEL[form.st]}`],
    ['Polígono do terreno', form.geom ? `✅ ${fmtArea(form.areaTerrenoCalc)}` : '❌ Não definido'],
    ['Edificação', form.geomBld ? `✅ ${fmtArea(form.areaEdifCalc)}` : '— não delimitada'],
    ['Área cadastral (terreno / construída)', `${form.at_cad || '—'} m² / ${form.ac_cad || '—'} m²`],
    [
      'CADURB',
      form.cadurb_tipo
        ? `${CADURB_TIPO_LABEL[form.cadurb_tipo]}${form.tp_arq ? ' · ' + TP_ARQ_LABEL[form.tp_arq] : ''}`
        : 'Não classificado',
    ],
  ]

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Confira os dados abaixo antes de confirmar o cadastro.</p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {itens.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt className="text-xs font-semibold text-gray-500">{rotulo.toUpperCase()}</dt>
            <dd className="text-navy">{valor}</dd>
          </div>
        ))}
      </dl>
      {form.obs && (
        <div>
          <p className="text-xs font-semibold text-gray-500">OBSERVAÇÕES</p>
          <p className="text-sm text-navy">{form.obs}</p>
        </div>
      )}
    </div>
  )
}
