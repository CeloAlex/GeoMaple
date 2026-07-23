import { useState } from 'react'
import type { ImovelFeature } from '../types/imovel'
import { useAuthStore } from '../store/authStore'
import { useMunicipioStore } from '../store/municipioStore'
import { centroidePoligono } from '../utils/geo'
import { USO_LABEL, STATUS_LABEL } from '../constants/imovel'
import { exportarImovelGeoJSON, exportarImovelKML, imprimirFichaCadastral } from '../utils/exportarImovel'
import { SinterModal } from './SinterModal'
import { UAModal } from './UA/UAModal'
import { HistoricoImovel } from './Auditoria/HistoricoImovel'

function formatarArea(m2: number) {
  return `${m2.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m²`
}

type Props = {
  feature: ImovelFeature | null
  onClose: () => void
}

export function DetailPanel({ feature, onClose }: Props) {
  const usuario = useAuthStore((s) => s.usuario)
  const municipio = useMunicipioStore((s) => s.municipio)
  const podeEditar = usuario?.perm === 'admin' || usuario?.perm === 'editor'
  const [sinterAberto, setSinterAberto] = useState(false)
  const [uaAberto, setUaAberto] = useState(false)

  if (!feature) return null
  const imovel = feature.properties

  const area = imovel.at_geo ?? imovel.at_cad
  const c = centroidePoligono(feature.geometry)

  return (
    <aside className="absolute top-0 right-0 z-1000 h-full w-80 overflow-y-auto border-l border-gray-200 bg-white p-5 shadow-xl">
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
          <dt className="text-gray-500">
            Área {imovel.at_geo != null ? 'georreferenciada' : 'cadastral'}
          </dt>
          <dd className="font-medium text-gray-900">{area != null ? formatarArea(area) : '—'}</dd>
        </div>
        {imovel.parentId != null && (
          <div>
            <dt className="text-gray-500">Unidade Autônoma</dt>
            <dd className="font-medium text-ua">Vinculada ao imóvel #{imovel.parentId}</dd>
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
          onClick={() => imprimirFichaCadastral(feature, municipio.nome, municipio.uf)}
          className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
        >
          🖨️ Ficha
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

      <HistoricoImovel imovelId={imovel.id} />
    </aside>
  )
}
