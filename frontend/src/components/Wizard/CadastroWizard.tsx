import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../api/client'
import type { ConflitoGeometria, DuplicataCandidata, ImovelGeometria, ImovelRegistro, PolygonGeoJSON } from '../../types/imovel'
import { loteCompleto, lotePrefixo, montarInscricao } from '../../utils/inscricao'
import { centroidePoligono } from '../../utils/geo'
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
  onSalvo: (imovel: ImovelRegistro) => void
  geomInicial?: PolygonGeoJSON | null
  // Destaca no mapa principal os imóveis apontados pelo backend como sobrepostos (409 em
  // PUT .../geometria) — ver MainLayout.tsx `conflitosGeometriaIds`.
  onConflitoGeometria?: (conflitos: ConflitoGeometria[]) => void
}

function extrairErroApi(err: unknown, fallback: string) {
  return (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? fallback
}

function extrairConflitos(err: unknown): ConflitoGeometria[] | null {
  const detalhes = (err as { response?: { status?: number; data?: { detalhes?: unknown } } })?.response
  if (detalhes?.status !== 409 || !Array.isArray(detalhes.data?.detalhes)) return null
  return detalhes.data.detalhes as ConflitoGeometria[]
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
    cib: form.cib || undefined,
    matricula: form.matricula || undefined,
    obs: form.obs || undefined,
    cadurb_tipo: cadurbTipo,
    tp_arq: territorial ? undefined : num(form.tp_arq),
    dest: form.dest ? Number(form.dest) : undefined,
    padrao: num(form.padrao),
    ano_constr: territorial ? undefined : num(form.ano_constr),
    valor_venal: num(form.valor_venal),
  }
}

export function CadastroWizard({ aberto, onClose, onSalvo, geomInicial, onConflitoGeometria }: Props) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<WizardFormData>(FORM_INICIAL)
  const [herdado, setHerdado] = useState<ImovelHerdado | null>(null)
  const [buscandoHerdado, setBuscandoHerdado] = useState(false)
  const [duplicado, setDuplicado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [duplicatasCadastro, setDuplicatasCadastro] = useState<DuplicataCandidata[]>([])
  const [verificandoDuplicidade, setVerificandoDuplicidade] = useState(false)
  const [duplicidadeRevisada, setDuplicidadeRevisada] = useState(false)
  const [justificativaDuplicidade, setJustificativaDuplicidade] = useState('')

  const geomInicialRef = useRef(geomInicial)
  geomInicialRef.current = geomInicial

  useEffect(() => {
    if (aberto) {
      setStep(1)
      setForm({ ...FORM_INICIAL, geom: geomInicialRef.current ?? null })
      setHerdado(null)
      setDuplicado(null)
      setErro(null)
    }
    onConflitoGeometria?.([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Duplicidade de Cadastro: ao chegar na Revisão, compara endereço e localização
  // geográfica com os terrenos já cadastrados — reexecuta se o operador voltar e mudar o
  // endereço/polígono e chegar de novo na Revisão.
  useEffect(() => {
    if (!aberto || step !== 5) return
    let cancelado = false
    setVerificandoDuplicidade(true)
    setDuplicidadeRevisada(false)
    setJustificativaDuplicidade('')

    async function verificarDuplicidade() {
      try {
        const centro = form.geom ? centroidePoligono(form.geom) : null
        const { data } = await api.get<DuplicataCandidata[]>('/api/imoveis/verificar-duplicidade', {
          params: { log: form.log || undefined, nr: form.nr || undefined, lat: centro?.lat, lng: centro?.lng },
        })
        if (!cancelado) setDuplicatasCadastro(data)
      } catch {
        if (!cancelado) setDuplicatasCadastro([])
      } finally {
        if (!cancelado) setVerificandoDuplicidade(false)
      }
    }

    verificarDuplicidade()
    return () => {
      cancelado = true
    }
  }, [aberto, step, form.log, form.nr, form.geom])

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

  const bloqueadoPorDuplicidade =
    duplicatasCadastro.length > 0 && (!duplicidadeRevisada || !justificativaDuplicidade.trim())

  async function salvar() {
    const msg = erroDaEtapa()
    if (msg) {
      setErro(msg)
      return
    }
    if (bloqueadoPorDuplicidade) {
      setErro('Revise as possíveis duplicidades e justifique antes de salvar.')
      return
    }
    setSalvando(true)
    setErro(null)

    try {
      const payload =
        duplicatasCadastro.length > 0
          ? { ...montarPayload(form), duplicidadeJustificativa: justificativaDuplicidade.trim() }
          : montarPayload(form)
      const { data: imovel } = await api.post<ImovelRegistro>('/api/imoveis', payload)

      if (form.geom) {
        const geometria: Record<string, unknown> = { geom: form.geom }
        if (form.geomBld) geometria.geom_bld = form.geomBld
        await api.put(`/api/imoveis/${imovel.id}/geometria`, geometria)
      }

      onSalvo(imovel)
      onClose()
    } catch (err) {
      const conflitos = extrairConflitos(err)
      if (conflitos) onConflitoGeometria?.(conflitos)
      setErro(extrairErroApi(err, 'Não foi possível salvar o cadastro. Tente novamente.'))
      if (conflitos) setStep(3)
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
          {step === 5 && (
            <>
              <Step5Revisao form={form} />
              {verificandoDuplicidade && (
                <p className="mt-4 text-xs text-gray-400">Verificando possíveis duplicidades de cadastro…</p>
              )}
              {!verificandoDuplicidade && duplicatasCadastro.length > 0 && (
                <div className="mt-4 space-y-2 rounded border border-ambar/60 bg-ambar/10 p-3">
                  <p className="text-sm font-medium text-navy">
                    ⚠️ Possível duplicidade de cadastro — {duplicatasCadastro.length} imóvel(is) conflitante(s)
                  </p>
                  <ul className="space-y-1 text-xs text-navy">
                    {duplicatasCadastro.map((d) => (
                      <li key={d.id}>
                        <span className="font-mono">{d.insc}</span> — {d.prop}
                        {d.log && (
                          <>
                            {' '}
                            · {d.log}, {d.nr || 's/n'}
                          </>
                        )}{' '}
                        <span className="text-navy/60">
                          ({d.motivos.map((m) => (m === 'endereco' ? 'mesmo endereço' : 'localização próxima')).join(', ')})
                        </span>
                      </li>
                    ))}
                  </ul>
                  <label className="flex items-center gap-2 text-xs font-medium text-navy">
                    <input
                      type="checkbox"
                      checked={duplicidadeRevisada}
                      onChange={(e) => setDuplicidadeRevisada(e.target.checked)}
                    />
                    Revisado — não é duplicata
                  </label>
                  {duplicidadeRevisada && (
                    <textarea
                      value={justificativaDuplicidade}
                      onChange={(e) => setJustificativaDuplicidade(e.target.value)}
                      placeholder="Justifique brevemente por que não é duplicata…"
                      rows={2}
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs text-navy placeholder:text-gray-400 focus:border-navy focus:outline-none"
                    />
                  )}
                </div>
              )}
            </>
          )}

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
                disabled={salvando || verificandoDuplicidade || bloqueadoPorDuplicidade}
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
