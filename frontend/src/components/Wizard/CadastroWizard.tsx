import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { ImovelGeometria, ImovelRegistro } from '../../types/imovel'
import { loteCompleto, lotePrefixo, montarInscricao } from '../../utils/inscricao'
import { FORM_INICIAL, type ImovelHerdado, type WizardFormData } from './types'
import { StepIndicator } from './StepIndicator'
import { Step1Inscricao } from './Step1Inscricao'
import { Step2Localizacao } from './Step2Localizacao'
import { Step3Geo } from './Step3Geo'
import { Step4Cadastrais } from './Step4Cadastrais'
import { Step5Revisao } from './Step5Revisao'

type Props = {
  aberto: boolean
  onClose: () => void
  onSalvo: () => void
}

function extrairErroApi(err: unknown, fallback: string) {
  return (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? fallback
}

function montarPayload(form: WizardFormData) {
  const num = (v: string) => (v.trim() === '' ? undefined : Number(v))
  const cadurbTipo = form.cadurb_tipo ? Number(form.cadurb_tipo) : undefined
  const territorial = cadurbTipo === 1

  return {
    insc: montarInscricao(form.di, form.se, form.qu, form.lote, form.unidade),
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

export function CadastroWizard({ aberto, onClose, onSalvo }: Props) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<WizardFormData>(FORM_INICIAL)
  const [herdado, setHerdado] = useState<ImovelHerdado | null>(null)
  const [buscandoHerdado, setBuscandoHerdado] = useState(false)
  const [duplicado, setDuplicado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (aberto) {
      setStep(1)
      setForm(FORM_INICIAL)
      setHerdado(null)
      setDuplicado(null)
      setErro(null)
    }
  }, [aberto])

  // Ao completar Distrito.Setor.Quadra.Lote, verifica se já existe terreno cadastrado
  // com esse lote (para herdar polígono/endereço) e se a inscrição completa é duplicada.
  useEffect(() => {
    if (!aberto || !loteCompleto(form.di, form.se, form.qu, form.lote)) {
      setHerdado(null)
      setDuplicado(null)
      return
    }

    let cancelado = false
    setBuscandoHerdado(true)

    async function verificar() {
      try {
        const { data } = await api.get<ImovelRegistro[]>('/api/imoveis', {
          params: { di: form.di, se: form.se, qu: form.qu },
        })
        if (cancelado) return

        const fullInsc = montarInscricao(form.di, form.se, form.qu, form.lote, form.unidade)
        const exato = data.find((c) => c.insc === fullInsc)
        setDuplicado(exato ? `${exato.insc} — ${exato.prop}` : null)

        const prefixo = lotePrefixo(form.di, form.se, form.qu, form.lote)
        const mae = data.find((c) => c.insc.split('-')[0] === prefixo && c.parentId === null)

        if (!mae) {
          setHerdado(null)
          return
        }

        const { data: geometria } = await api.get<ImovelGeometria>(`/api/imoveis/${mae.id}/geometria`)
        if (cancelado) return

        setHerdado({
          id: mae.id,
          insc: mae.insc,
          prop: mae.prop,
          log: mae.log,
          nr: mae.nr,
          bai: mae.bai,
          cep: mae.cep,
          at_geo: mae.at_geo,
          at_cad: mae.at_cad,
          geom: geometria.geom,
        })
      } catch {
        // Falha na verificação não deve impedir o cadastro manual
      } finally {
        if (!cancelado) setBuscandoHerdado(false)
      }
    }

    verificar()
    return () => {
      cancelado = true
    }
  }, [aberto, form.di, form.se, form.qu, form.lote, form.unidade])

  const set = useCallback(<K extends keyof WizardFormData>(campo: K, valor: WizardFormData[K]) => {
    setForm((f) => ({ ...f, [campo]: valor }))
  }, [])

  if (!aberto) return null

  function erroDaEtapa(): string | null {
    switch (step) {
      case 1:
        if (!loteCompleto(form.di, form.se, form.qu, form.lote) || form.unidade.length !== 3) {
          return 'Preencha distrito, setor, quadra, lote e unidade completos.'
        }
        return duplicado ? 'Já existe um imóvel cadastrado com esta inscrição completa.' : null
      case 2:
        return form.log ? null : 'Informe o logradouro.'
      case 3:
        return form.geom ? null : 'Delimite o polígono do terreno no mapa.'
      case 4:
        if (!form.prop) return 'Informe o proprietário.'
        if (form.cadurb_tipo === '2' && (!form.tp_arq || !form.ano_constr)) {
          return 'Para imóvel predial, informe o tipo arquitetônico e o ano de construção.'
        }
        return null
      default:
        return null
    }
  }

  function avancar() {
    const msg = erroDaEtapa()
    if (msg) {
      setErro(msg)
      return
    }
    setErro(null)

    if (step === 1 && herdado) {
      setForm((f) => ({
        ...f,
        log: f.log || herdado.log || '',
        nr: f.nr || herdado.nr || '',
        bai: f.bai || herdado.bai || '',
        cep: f.cep || herdado.cep || '',
        geom: f.geom || herdado.geom,
        at_cad: f.at_cad || (herdado.at_cad != null ? String(herdado.at_cad) : ''),
      }))
    }
    setStep((s) => Math.min(5, s + 1))
  }

  function voltar() {
    setErro(null)
    setStep((s) => Math.max(1, s - 1))
  }

  async function salvar() {
    const msg = erroDaEtapa()
    if (msg) {
      setErro(msg)
      return
    }
    setSalvando(true)
    setErro(null)

    try {
      const { data: imovel } = await api.post<ImovelRegistro>('/api/imoveis', montarPayload(form))

      if (form.geom) {
        const geometria: Record<string, unknown> = { geom: form.geom }
        if (form.geomBld) geometria.geom_bld = form.geomBld
        await api.put(`/api/imoveis/${imovel.id}/geometria`, geometria)
      }

      onSalvo()
      onClose()
    } catch (err) {
      setErro(extrairErroApi(err, 'Não foi possível salvar o cadastro. Tente novamente.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-navy">🏠 Novo Cadastro Definitivo</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-xl text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <StepIndicator step={step} />

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <Step1Inscricao form={form} set={set} herdado={herdado} buscandoHerdado={buscandoHerdado} duplicado={duplicado} />
          )}
          {step === 2 && <Step2Localizacao form={form} set={set} />}
          {step === 3 && <Step3Geo form={form} set={set} herdadoInsc={herdado?.insc ?? null} />}
          {step === 4 && <Step4Cadastrais form={form} set={set} />}
          {step === 5 && <Step5Revisao form={form} />}

          {erro && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          <button onClick={onClose} className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <div className="flex gap-2">
            {step > 1 && (
              <button onClick={voltar} className="rounded border border-navy px-4 py-2 text-sm text-navy hover:bg-navy/5">
                ← Anterior
              </button>
            )}
            {step < 5 && (
              <button onClick={avancar} className="rounded bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90">
                Próximo →
              </button>
            )}
            {step === 5 && (
              <button
                onClick={salvar}
                disabled={salvando}
                className="rounded bg-verde px-4 py-2 text-sm font-medium text-white hover:bg-verde/90 disabled:opacity-60"
              >
                {salvando ? 'Salvando…' : '💾 Salvar cadastro'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
