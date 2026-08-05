import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { ImovelRegistro, ImovelSelecionado, PolygonGeoJSON } from '../types/imovel'
import { useAuthStore } from '../store/authStore'
import { useMunicipioStore } from '../store/municipioStore'
import { centroidePoligono } from '../utils/geo'
import { USO_LABEL, STATUS_LABEL } from '../constants/imovel'
import { CADURB_TIPO_LABEL, TP_ARQ_LABEL, DEST_LABEL, PADRAO_LABEL } from './Wizard/types'
import { exportarImovelGeoJSON, exportarImovelKML, imprimirFichaCadastral } from '../utils/exportarImovel'
import { SinterModal } from './SinterModal'
import { UAModal } from './UA/UAModal'
import { EditarImovelPanel } from './EditarImovelPanel'
import { HistoricoImovel } from './Auditoria/HistoricoImovel'

function extrairErro(err: unknown, fallback: string) {
  return (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? fallback
}

function formatarArea(m2: number) {
  return `${m2.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m²`
}

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Mesma fórmula usada em Wizard/Step4Cadastrais.tsx para o alerta de área durante o
// cadastro — reaproveitada aqui para a ficha, que compara os dois valores já salvos.
function diferencaPercentual(cad: number | null, geo: number | null) {
  if (cad == null || geo == null || cad === 0) return null
  return ((geo - cad) / cad) * 100
}

const AVISO_INCONSISTENCIA =
  'Inconsistência de áreas: diferença superior a 10% entre a área cadastral e a área georreferenciada.'

type BlocoAreaProps = {
  titulo: string
  cad: number | null
  geo: number | null
  avisoOk: boolean
  onDispensar: () => void
}

function BlocoArea({ titulo, cad, geo, avisoOk, onDispensar }: BlocoAreaProps) {
  const diferenca = diferencaPercentual(cad, geo)
  const inconsistente = diferenca != null && Math.abs(diferenca) > 10 && !avisoOk
  return (
    <>
      {cad != null && (
        <div>
          <dt className="text-gray-500">{titulo} Cadastral</dt>
          <dd className="font-medium text-gray-900">{formatarArea(cad)}</dd>
        </div>
      )}
      {geo != null && (
        <div>
          <dt className="text-gray-500">{titulo} Georreferenciada</dt>
          <dd className="font-medium text-gray-900">{formatarArea(geo)}</dd>
        </div>
      )}
      {inconsistente && (
        <div className="rounded border border-ambar/60 bg-ambar/10 px-3 py-2 text-xs text-navy">
          <p>⚠️ {AVISO_INCONSISTENCIA}</p>
          <button onClick={onDispensar} className="mt-1.5 font-medium text-ambar underline hover:no-underline">
            Marcar como revisado
          </button>
        </div>
      )}
    </>
  )
}

// UAs não têm geometria própria — a ficha reaproveita o polígono do terreno pai.
function unidadeParaFeature(ua: ImovelRegistro, geometria: PolygonGeoJSON): ImovelSelecionado {
  return {
    type: 'Feature',
    geometry: geometria,
    properties: { ...ua, geom: geometria, geom_bld: null },
  }
}

type Props = {
  feature: ImovelSelecionado | null
  onClose: () => void
  onAlterado: () => void
}

export function DetailPanel({ feature, onClose, onAlterado }: Props) {
  const usuario = useAuthStore((s) => s.usuario)
  const municipio = useMunicipioStore((s) => s.municipio)
  const podeEditar = usuario?.perm === 'admin' || usuario?.perm === 'editor'
  const [sinterAberto, setSinterAberto] = useState(false)
  const [uaAberto, setUaAberto] = useState(false)
  const [editarAberto, setEditarAberto] = useState(false)
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExcluir, setErroExcluir] = useState<string | null>(null)
  const [carregandoFicha, setCarregandoFicha] = useState(false)
  const [unidadesParaEscolha, setUnidadesParaEscolha] = useState<ImovelRegistro[] | null>(null)
  const [avisoOverride, setAvisoOverride] = useState<{ at?: boolean; ac?: boolean }>({})

  // Reseta os overrides locais (usados para refletir "Marcar como revisado" na hora, sem
  // esperar recarregar o imóvel) sempre que a ficha exibida muda de imóvel.
  useEffect(() => {
    setAvisoOverride({})
  }, [feature?.properties.id])

  if (!feature) return null
  const imovel = feature.properties

  async function dispensarAviso(campo: 'at_aviso_ok' | 'ac_aviso_ok') {
    setAvisoOverride((o) => ({ ...o, [campo === 'at_aviso_ok' ? 'at' : 'ac']: true }))
    try {
      await api.put(`/api/imoveis/${imovel.id}`, { [campo]: true })
    } catch {
      setAvisoOverride((o) => ({ ...o, [campo === 'at_aviso_ok' ? 'at' : 'ac']: undefined }))
    }
  }

  // Se o terreno tiver mais de uma UA vinculada, pergunta qual imprimir em vez de abrir a
  // ficha do terreno direto; com 0 ou 1 UA, mantém o comportamento direto de sempre.
  async function abrirFicha() {
    if (!feature) return
    if (imovel.parentId != null) {
      imprimirFichaCadastral(feature, municipio.nome, municipio.uf)
      return
    }
    setCarregandoFicha(true)
    try {
      const { data: unidades } = await api.get<ImovelRegistro[]>(`/api/imoveis/${imovel.id}/unidades`)
      if (unidades.length > 1) {
        setUnidadesParaEscolha(unidades)
      } else if (unidades.length === 1) {
        imprimirFichaCadastral(unidadeParaFeature(unidades[0], feature.geometry), municipio.nome, municipio.uf)
      } else {
        imprimirFichaCadastral(feature, municipio.nome, municipio.uf)
      }
    } catch {
      imprimirFichaCadastral(feature, municipio.nome, municipio.uf)
    } finally {
      setCarregandoFicha(false)
    }
  }

  function abrirFichaDaUnidade(ua: ImovelRegistro) {
    if (!feature) return
    imprimirFichaCadastral(unidadeParaFeature(ua, feature.geometry), municipio.nome, municipio.uf)
    setUnidadesParaEscolha(null)
  }

  async function excluir() {
    setExcluindo(true)
    setErroExcluir(null)
    try {
      await api.delete(`/api/imoveis/${imovel.id}`)
      onAlterado()
      onClose()
    } catch (err) {
      setErroExcluir(extrairErro(err, 'Não foi possível excluir o imóvel'))
      setExcluindo(false)
    }
  }

  const c = centroidePoligono(feature.geometry)
  const avisoTerrenoOk = avisoOverride.at ?? imovel.at_aviso_ok
  const avisoConstruidaOk = avisoOverride.ac ?? imovel.ac_aviso_ok

  return (
    <aside className="absolute top-0 right-0 z-1000 h-full w-80 overflow-y-auto border-l border-gray-200 bg-white p-5 shadow-xl print:hidden">
      <div className="mb-4 flex items-start justify-between gap-2">
        <h2 className="font-mono text-lg font-semibold text-navy">{imovel.insc}</h2>
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="text-lg leading-none text-gray-400 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-gray-500">Proprietário</dt>
          <dd className="font-medium text-gray-900">{imovel.prop}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Uso</dt>
          <dd className="font-medium text-gray-900">{USO_LABEL[imovel.uso] ?? imovel.uso}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Status</dt>
          <dd className="font-medium text-gray-900">{STATUS_LABEL[imovel.st] ?? imovel.st}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Coordenadas do Centro</dt>
          <dd className="font-medium text-gray-900">
            {c.lat.toFixed(6)}, {c.lng.toFixed(6)}
          </dd>
        </div>
        <BlocoArea
          titulo="Área do Terreno"
          cad={imovel.at_cad}
          geo={imovel.at_geo}
          avisoOk={avisoTerrenoOk}
          onDispensar={() => dispensarAviso('at_aviso_ok')}
        />
        {imovel.parentId != null && (
          <div>
            <dt className="text-gray-500">Unidade Autônoma</dt>
            <dd className="font-medium text-ua">Vinculada ao imóvel #{imovel.parentId}</dd>
          </div>
        )}
        {(imovel.log || imovel.nr) && (
          <div>
            <dt className="text-gray-500">Endereço</dt>
            <dd className="font-medium text-gray-900">
              {imovel.log}
              {imovel.nr ? `, ${imovel.nr}` : ''}
            </dd>
          </div>
        )}
        {imovel.bai && (
          <div>
            <dt className="text-gray-500">Bairro</dt>
            <dd className="font-medium text-gray-900">{imovel.bai}</dd>
          </div>
        )}
        {imovel.cep && (
          <div>
            <dt className="text-gray-500">CEP</dt>
            <dd className="font-medium text-gray-900">{imovel.cep}</dd>
          </div>
        )}
        {imovel.tp && (
          <div>
            <dt className="text-gray-500">Tipo</dt>
            <dd className="font-medium text-gray-900">{imovel.tp}</dd>
          </div>
        )}
        {(imovel.ac_cad != null || imovel.ac_geo != null || feature.properties.geom_bld != null) && (
          <BlocoArea
            titulo="Área Construída"
            cad={imovel.ac_cad}
            geo={imovel.ac_geo}
            avisoOk={avisoConstruidaOk}
            onDispensar={() => dispensarAviso('ac_aviso_ok')}
          />
        )}
        {imovel.num_pav != null && (
          <div>
            <dt className="text-gray-500">Nº de pavimentos</dt>
            <dd className="font-medium text-gray-900">{imovel.num_pav}</dd>
          </div>
        )}
        {imovel.cib && (
          <div>
            <dt className="text-gray-500">CIB</dt>
            <dd className="font-medium text-gray-900">{imovel.cib}</dd>
          </div>
        )}
        {imovel.matricula && (
          <div>
            <dt className="text-gray-500">Matrícula</dt>
            <dd className="font-medium text-gray-900">{imovel.matricula}</dd>
          </div>
        )}
        {imovel.frac_ideal && (
          <div>
            <dt className="text-gray-500">Fração ideal</dt>
            <dd className="font-medium text-gray-900">{imovel.frac_ideal}</dd>
          </div>
        )}
        {imovel.cadurb_tipo != null && (
          <div>
            <dt className="text-gray-500">Tipo imóvel CADURB</dt>
            <dd className="font-medium text-gray-900">{CADURB_TIPO_LABEL[String(imovel.cadurb_tipo)] ?? imovel.cadurb_tipo}</dd>
          </div>
        )}
        {imovel.tp_arq != null && (
          <div>
            <dt className="text-gray-500">Tipo arquitetônico</dt>
            <dd className="font-medium text-gray-900">{TP_ARQ_LABEL[String(imovel.tp_arq)] ?? imovel.tp_arq}</dd>
          </div>
        )}
        {imovel.dest != null && (
          <div>
            <dt className="text-gray-500">Destinação</dt>
            <dd className="font-medium text-gray-900">{DEST_LABEL[String(imovel.dest)] ?? imovel.dest}</dd>
          </div>
        )}
        {imovel.padrao != null && (
          <div>
            <dt className="text-gray-500">Padrão construtivo</dt>
            <dd className="font-medium text-gray-900">{PADRAO_LABEL[String(imovel.padrao)] ?? imovel.padrao}</dd>
          </div>
        )}
        {imovel.ano_constr != null && (
          <div>
            <dt className="text-gray-500">Ano de construção</dt>
            <dd className="font-medium text-gray-900">{imovel.ano_constr}</dd>
          </div>
        )}
        {imovel.valor_venal != null && (
          <div>
            <dt className="text-gray-500">Valor venal</dt>
            <dd className="font-medium text-gray-900">{formatarMoeda(imovel.valor_venal)}</dd>
          </div>
        )}
        {imovel.obs && (
          <div>
            <dt className="text-gray-500">Observações</dt>
            <dd className="font-medium whitespace-pre-wrap text-gray-900">{imovel.obs}</dd>
          </div>
        )}
      </dl>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-200 pt-4">
        <a
          href={`https://www.google.com/maps/@${c.lat},${c.lng},19z/data=!3m1!1e3`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
        >
          🛰️ Google Maps
        </a>
        <a
          href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${c.lat},${c.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
        >
          🚶 Street View
        </a>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          onClick={() => exportarImovelGeoJSON(feature)}
          className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
        >
          ⬇️ GeoJSON
        </button>
        <button
          onClick={() => exportarImovelKML(feature)}
          className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
        >
          ⬇️ KML
        </button>
        <button
          onClick={abrirFicha}
          disabled={carregandoFicha}
          className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {carregandoFicha ? '⏳' : '🖨️'} Ficha
        </button>
      </div>

      {imovel.parentId == null && (
        <button
          onClick={() => setUaAberto(true)}
          className="mt-3 w-full rounded border border-ua py-2 text-sm font-medium text-ua hover:bg-ua/5"
        >
          🏢 Unidades Autônomas
        </button>
      )}

      {podeEditar && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setEditarAberto(true)}
            className="flex-1 rounded border border-navy py-2 text-sm font-medium text-navy hover:bg-navy/5"
          >
            ✏️ Editar
          </button>
          <button
            onClick={() => setConfirmandoExcluir(true)}
            className="flex-1 rounded border border-red-300 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            🗑️ Excluir
          </button>
        </div>
      )}

      {confirmandoExcluir && (
        <div className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm">
          <p className="text-red-800">
            Confirma a exclusão do imóvel <span className="font-mono">{imovel.insc}</span>? Esta ação não pode ser
            desfeita.
          </p>
          {erroExcluir && <p className="mt-2 text-xs text-red-700">{erroExcluir}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => {
                setConfirmandoExcluir(false)
                setErroExcluir(null)
              }}
              disabled={excluindo}
              className="rounded border border-gray-300 bg-white px-3 py-1 text-xs hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={excluir}
              disabled={excluindo}
              className="rounded bg-red-700 px-3 py-1 text-xs font-medium text-white hover:bg-red-800 disabled:opacity-60"
            >
              {excluindo ? 'Excluindo…' : 'Confirmar exclusão'}
            </button>
          </div>
        </div>
      )}

      {podeEditar && (
        <button
          onClick={() => setSinterAberto(true)}
          className="mt-3 w-full rounded bg-navy py-2 text-sm font-medium text-white hover:bg-navy/90"
        >
          {imovel.cib ? '🔄 Re-transmitir SINTER' : '📡 Transmitir para SINTER'}
        </button>
      )}

      {sinterAberto && (
        <SinterModal imovelId={imovel.id} insc={imovel.insc} onClose={() => setSinterAberto(false)} />
      )}

      {uaAberto && (
        <UAModal paiId={imovel.id} paiInsc={imovel.insc} paiProp={imovel.prop} onClose={() => setUaAberto(false)} />
      )}

      {editarAberto && (
        <EditarImovelPanel
          imovelId={imovel.id}
          onClose={() => setEditarAberto(false)}
          onSalvo={() => {
            onAlterado()
            onClose()
          }}
        />
      )}

      {unidadesParaEscolha && (
        <div className="fixed inset-0 z-2000 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <div>
                <h3 className="text-sm font-semibold text-navy">Escolha a unidade para imprimir</h3>
                <p className="font-mono text-xs text-gray-500">{imovel.insc} tem {unidadesParaEscolha.length} unidades vinculadas</p>
              </div>
              <button
                onClick={() => setUnidadesParaEscolha(null)}
                aria-label="Fechar"
                className="text-lg text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <ul className="divide-y divide-gray-100 overflow-y-auto">
              {unidadesParaEscolha.map((ua) => (
                <li key={ua.id}>
                  <button onClick={() => abrirFichaDaUnidade(ua)} className="block w-full px-5 py-3 text-left hover:bg-gray-50">
                    <p className="font-mono text-sm font-semibold text-navy">{ua.insc}</p>
                    <p className="text-xs text-gray-600">{ua.prop}</p>
                    <p className="text-xs text-gray-400">{USO_LABEL[ua.uso] ?? ua.uso}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <HistoricoImovel imovelId={imovel.id} />
    </aside>
  )
}
