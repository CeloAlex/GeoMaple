import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { ImovelGeometria, ImovelRegistro } from '../types/imovel'
import { FORM_INICIAL, type WizardFormData } from './Wizard/types'
import { Step2Localizacao } from './Wizard/Step2Localizacao'
import { Step3Geo } from './Wizard/Step3Geo'
import { Step4Cadastrais } from './Wizard/Step4Cadastrais'

type Props = {
  imovelId: number
  onClose: () => void
  onSalvo: () => void
}

function registroParaForm(r: ImovelRegistro, geometria: ImovelGeometria): WizardFormData {
  return {
    ...FORM_INICIAL,
    log: r.log ?? '',
    nr: r.nr ?? '',
    bai: r.bai ?? '',
    cep: r.cep ?? '',
    geom: geometria.geom,
    geomBld: geometria.geom_bld,
    prop: r.prop,
    uso: (r.uso as WizardFormData['uso']) ?? 'terreno',
    tp: r.tp ?? '',
    st: (r.st as WizardFormData['st']) ?? 'regular',
    at_cad: r.at_cad != null ? String(r.at_cad) : '',
    ac_cad: r.ac_cad != null ? String(r.ac_cad) : '',
    num_pav: r.num_pav != null ? String(r.num_pav) : '',
    frac_ideal: r.frac_ideal ?? '',
    obs: r.obs ?? '',
    cadurb_tipo: r.cadurb_tipo != null ? String(r.cadurb_tipo) : '',
    tp_arq: r.tp_arq != null ? String(r.tp_arq) : '',
    dest: r.dest != null ? String(r.dest) : '1',
    padrao: r.padrao != null ? String(r.padrao) : '',
    ano_constr: r.ano_constr != null ? String(r.ano_constr) : '',
    valor_venal: r.valor_venal != null ? String(r.valor_venal) : '',
  }
}

function montarPayload(form: WizardFormData) {
  const num = (v: string) => (v.trim() === '' ? undefined : Number(v))
  const cadurbTipo = form.cadurb_tipo ? Number(form.cadurb_tipo) : undefined
  const territorial = cadurbTipo === 1

  return {
    prop: form.prop,
    log: form.log || undefined,
    nr: form.nr || undefined,
    bai: form.bai || undefined,
    cep: form.cep || undefined,
    uso: form.uso,
    tp: form.tp || undefined,
    st: form.st,
    at_cad: num(form.at_cad),
    ac_cad: num(form.ac_cad),
    num_pav: num(form.num_pav),
    frac_ideal: form.frac_ideal || undefined,
    obs: form.obs || undefined,
    cadurb_tipo: cadurbTipo,
    tp_arq: territorial ? undefined : num(form.tp_arq),
    dest: form.dest ? Number(form.dest) : undefined,
    padrao: num(form.padrao),
    ano_constr: territorial ? undefined : num(form.ano_constr),
    valor_venal: num(form.valor_venal),
  }
}

function extrairErro(err: unknown, fallback: string) {
  return (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? fallback
}

export function EditarImovelPanel({ imovelId, onClose, onSalvo }: Props) {
  const [insc, setInsc] = useState('')
  const [form, setForm] = useState<WizardFormData | null>(null)
  const [geomOriginal, setGeomOriginal] = useState<ImovelGeometria | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    async function carregar() {
      try {
        const [{ data: registro }, { data: geometria }] = await Promise.all([
          api.get<ImovelRegistro>(`/api/imoveis/${imovelId}`),
          api.get<ImovelGeometria>(`/api/imoveis/${imovelId}/geometria`),
        ])
        if (cancelado) return
        setInsc(registro.insc)
        setForm(registroParaForm(registro, geometria))
        setGeomOriginal(geometria)
      } catch (err) {
        if (!cancelado) setErro(extrairErro(err, 'Não foi possível carregar o imóvel'))
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }
    carregar()
    return () => {
      cancelado = true
    }
  }, [imovelId])

  function set<K extends keyof WizardFormData>(campo: K, valor: WizardFormData[K]) {
    setForm((f) => (f ? { ...f, [campo]: valor } : f))
  }

  async function salvar() {
    if (!form) return
    if (!form.prop.trim()) {
      setErro('Informe o proprietário')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await api.put(`/api/imoveis/${imovelId}`, montarPayload(form))

      const geomMudou = JSON.stringify(form.geom) !== JSON.stringify(geomOriginal?.geom ?? null)
      const geomBldMudou = JSON.stringify(form.geomBld) !== JSON.stringify(geomOriginal?.geom_bld ?? null)
      if (geomMudou || geomBldMudou) {
        const geometria: Record<string, unknown> = {}
        if (geomMudou && form.geom) geometria.geom = form.geom
        if (geomBldMudou && form.geomBld) geometria.geom_bld = form.geomBld
        if (Object.keys(geometria).length > 0) {
          await api.put(`/api/imoveis/${imovelId}/geometria`, geometria)
        }
      }

      onSalvo()
      onClose()
    } catch (err) {
      setErro(extrairErro(err, 'Não foi possível salvar as alterações'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-navy">
            ✏️ Editar imóvel <span className="font-mono">{insc}</span>
          </h2>
          <button onClick={onClose} aria-label="Fechar" className="text-xl text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {carregando && <p className="text-sm text-gray-500">Carregando…</p>}

          {!carregando && form && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">Localização</h3>
                <Step2Localizacao form={form} set={set} />
              </div>
              <div>
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">Georreferenciamento</h3>
                <Step3Geo form={form} set={set} herdadoInsc={null} />
              </div>
              <div>
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">Dados cadastrais</h3>
                <Step4Cadastrais form={form} set={set} />
              </div>
            </div>
          )}

          {erro && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button onClick={onClose} className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando || carregando}
            className="rounded bg-verde px-4 py-2 text-sm font-medium text-white hover:bg-verde/90 disabled:opacity-60"
          >
            {salvando ? 'Salvando…' : '💾 Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}
