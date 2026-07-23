import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import type { ImovelGeometria, ImovelRegistro } from '../../types/imovel'
import { sugerirProximaUnidade } from '../../utils/inscricao'
import { UAForm } from './UAForm'
import { uaParaFormData, type UAFormData } from './types'

const USO_LABEL: Record<string, string> = {
  terreno: 'Terreno',
  construido: 'Construído',
  em_construcao: 'Em construção',
}

const STATUS_ESTILO: Record<string, string> = {
  regular: 'bg-verde/10 text-verde',
  em_fiscalizacao: 'bg-red-50 text-red-700',
  para_revisao: 'bg-ambar/10 text-ambar',
}

const STATUS_LABEL: Record<string, string> = {
  regular: 'Regular',
  em_fiscalizacao: 'Fiscalização',
  para_revisao: 'Para revisão',
}

type Props = {
  paiId: number
  paiInsc: string
  paiProp: string
  onClose: () => void
}

function payload(form: UAFormData) {
  const num = (v: string) => (v.trim() === '' ? undefined : Number(v))
  return {
    insc: form.insc.trim(),
    prop: form.prop.trim(),
    uso: form.uso,
    st: form.st,
    at_cad: num(form.at_cad),
    ac_cad: num(form.ac_cad),
    frac_ideal: form.frac_ideal || undefined,
    num_pav: num(form.num_pav),
    obs: form.obs || undefined,
  }
}

export function UAModal({ paiId, paiInsc, paiProp, onClose }: Props) {
  const usuario = useAuthStore((s) => s.usuario)
  const podeEditar = usuario?.perm === 'admin' || usuario?.perm === 'editor'

  const [unidades, setUnidades] = useState<ImovelRegistro[]>([])
  const [geomPai, setGeomPai] = useState<ImovelGeometria | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [modo, setModo] = useState<'lista' | 'nova' | number>('lista')
  const [confirmando, setConfirmando] = useState<ImovelRegistro | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const [{ data: lista }, { data: geometria }] = await Promise.all([
        api.get<ImovelRegistro[]>(`/api/imoveis/${paiId}/unidades`),
        api.get<ImovelGeometria>(`/api/imoveis/${paiId}/geometria`),
      ])
      setUnidades(lista)
      setGeomPai(geometria)
    } catch (err) {
      setErro((err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? 'Falha ao carregar unidades')
    } finally {
      setCarregando(false)
    }
  }, [paiId])

  useEffect(() => {
    carregar()
  }, [carregar])

  const paiInfo = {
    insc: paiInsc,
    // -1 porque o anel GeoJSON é fechado (primeiro ponto = último ponto)
    vertices: geomPai?.geom ? geomPai.geom.coordinates[0].length - 1 : null,
    areaTerreno: geomPai?.at_geo ?? null,
  }

  async function criar(dados: UAFormData) {
    await api.post(`/api/imoveis/${paiId}/unidades`, payload(dados))
    setModo('lista')
    await carregar()
  }

  async function editar(uaId: number, dados: UAFormData) {
    await api.put(`/api/imoveis/${paiId}/unidades/${uaId}`, payload(dados))
    setModo('lista')
    await carregar()
  }

  async function confirmarExclusao() {
    if (!confirmando) return
    try {
      await api.delete(`/api/imoveis/${paiId}/unidades/${confirmando.id}`)
      setConfirmando(null)
      await carregar()
    } catch (err) {
      setErro((err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? 'Falha ao excluir')
      setConfirmando(null)
    }
  }

  function abrirNova() {
    setModo('nova')
  }

  const uaEditando = typeof modo === 'number' ? unidades.find((u) => u.id === modo) : undefined

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <div>
            <h2 className="text-base font-semibold text-navy">🏢 Unidades Autônomas</h2>
            <p className="font-mono text-xs text-gray-500">
              {paiInsc} — {paiProp}
            </p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="text-lg text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {erro && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
          {carregando && <p className="text-sm text-gray-500">Carregando…</p>}

          {confirmando && (
            <div className="mb-3 flex items-center justify-between rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              <span>
                Excluir a unidade <span className="font-mono">{confirmando.insc}</span>?
              </span>
              <div className="flex gap-2">
                <button onClick={() => setConfirmando(null)} className="rounded border border-red-300 px-2 py-1 text-xs hover:bg-red-100">
                  Cancelar
                </button>
                <button onClick={confirmarExclusao} className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">
                  Excluir
                </button>
              </div>
            </div>
          )}

          {!carregando && modo === 'lista' && (
            <>
              {unidades.length === 0 ? (
                <p className="rounded bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
                  Nenhuma Unidade Autônoma cadastrada para este terreno.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded border border-gray-100">
                  {unidades.map((ua) => (
                    <li key={ua.id} className="flex items-center gap-3 p-3">
                      <div className="flex-1">
                        <p className="font-mono text-sm font-semibold text-navy">{ua.insc}</p>
                        <p className="text-xs text-gray-600">{ua.prop}</p>
                        <p className="text-xs text-gray-400">
                          {USO_LABEL[ua.uso] ?? ua.uso}
                          {ua.ac_cad ? ` · Área privativa: ${ua.ac_cad.toLocaleString('pt-BR')} m²` : ''}
                          {ua.frac_ideal ? ` · Fração ideal: ${ua.frac_ideal}` : ''}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_ESTILO[ua.st] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[ua.st] ?? ua.st}
                      </span>
                      {podeEditar && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => setModo(ua.id)}
                            className="rounded bg-navy px-2 py-1 text-xs text-white hover:bg-navy/90"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => setConfirmando(ua)}
                            className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {podeEditar && (
                <button
                  onClick={abrirNova}
                  className="mt-4 w-full rounded border border-dashed border-navy py-2 text-sm text-navy hover:bg-navy/5"
                >
                  + Nova Unidade
                </button>
              )}
            </>
          )}

          {!carregando && modo === 'nova' && (
            <UAForm
              titulo="Nova Unidade Autônoma"
              inicial={{
                insc: `${paiInfo.insc.split('-')[0]}-${sugerirProximaUnidade(
                  paiInsc,
                  unidades.map((u) => u.insc.split('-')[1] ?? ''),
                )}`,
                prop: paiProp,
                uso: 'construido',
                st: 'regular',
                at_cad: geomPai?.at_geo != null ? String(geomPai.at_geo) : '',
                ac_cad: '',
                frac_ideal: '',
                num_pav: '',
                obs: '',
              }}
              paiInfo={paiInfo}
              onSalvar={criar}
              onCancelar={() => setModo('lista')}
            />
          )}

          {!carregando && uaEditando && (
            <UAForm
              titulo={`Editar Unidade ${uaEditando.insc}`}
              inicial={uaParaFormData(uaEditando)}
              paiInfo={paiInfo}
              onSalvar={(dados) => editar(uaEditando.id, dados)}
              onCancelar={() => setModo('lista')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
