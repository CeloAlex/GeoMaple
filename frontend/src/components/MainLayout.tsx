import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { MapView, type Destino } from './Map/MapView'
import { DetailPanel } from './DetailPanel'
import { CadastroWizard } from './Wizard/CadastroWizard'
import { QuadrasPanel } from './Quadras/QuadrasPanel'
import { ProvisoriosPanel } from './Provisorios/ProvisoriosPanel'
import { OperadoresPanel } from './Operadores/OperadoresPanel'
import { AuditoriaPanel } from './Auditoria/AuditoriaPanel'
import { MinhaAtividade } from './Auditoria/MinhaAtividade'
import { api } from '../api/client'
import { centroidePoligono } from '../utils/geo'
import type { ImovelFeature, ImovelFeatureCollection, ImovelGeometria, ImovelRegistro } from '../types/imovel'
import type { CamadaImportada } from '../utils/importarGeo'

const SEM_IMOVEIS: ImovelFeatureCollection = { type: 'FeatureCollection', features: [] }

export function MainLayout() {
  const [selecionado, setSelecionado] = useState<ImovelFeature | null>(null)
  const [wizardAberto, setWizardAberto] = useState(false)
  const [quadrasAberto, setQuadrasAberto] = useState(false)
  const [provisoriosAberto, setProvisoriosAberto] = useState(false)
  const [operadoresAberto, setOperadoresAberto] = useState(false)
  const [auditoriaAberto, setAuditoriaAberto] = useState(false)
  const [minhaAtividadeAberto, setMinhaAtividadeAberto] = useState(false)
  const [recarregarEm, setRecarregarEm] = useState(0)
  const [voarPara, setVoarPara] = useState<Destino | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [imoveisVisiveis, setImoveisVisiveis] = useState<ImovelFeatureCollection>(SEM_IMOVEIS)
  const [camadasImportadas, setCamadasImportadas] = useState<CamadaImportada[]>([])

  async function selecionarImovel(imovel: ImovelRegistro) {
    try {
      const { data: geometria } = await api.get<ImovelGeometria>(`/api/imoveis/${imovel.id}/geometria`)
      if (!geometria.geom) {
        setAviso(`${imovel.insc} ainda não tem polígono georreferenciado.`)
        setTimeout(() => setAviso(null), 4000)
        return
      }

      const feature: ImovelFeature = {
        type: 'Feature',
        geometry: geometria.geom,
        properties: {
          id: imovel.id,
          insc: imovel.insc,
          prop: imovel.prop,
          uso: imovel.uso,
          st: imovel.st,
          at_cad: imovel.at_cad,
          at_geo: geometria.at_geo,
          parentId: imovel.parentId,
          cib: imovel.cib,
        },
      }
      setSelecionado(feature)
      setVoarPara(centroidePoligono(geometria.geom))
    } catch {
      setAviso('Não foi possível carregar este imóvel.')
      setTimeout(() => setAviso(null), 4000)
    }
  }

  return (
    <div className="flex h-full">
      <Sidebar
        onNovoCadastro={() => setWizardAberto(true)}
        onQuadras={() => setQuadrasAberto(true)}
        onProvisorios={() => setProvisoriosAberto(true)}
        onOperadores={() => setOperadoresAberto(true)}
        onAuditoria={() => setAuditoriaAberto(true)}
        onMinhaAtividade={() => setMinhaAtividadeAberto(true)}
        onSelecionarImovel={selecionarImovel}
        recarregarArvoreEm={recarregarEm}
        imoveisVisiveis={imoveisVisiveis}
        camadasImportadas={camadasImportadas}
        onImportar={(camada) => setCamadasImportadas((cs) => [...cs, camada])}
        onLimparImportadas={() => setCamadasImportadas([])}
      />
      <main className="relative flex-1">
        <MapView
          selecionadoId={selecionado?.properties.id ?? null}
          onSelect={(feature: ImovelFeature) => setSelecionado(feature)}
          recarregarEm={recarregarEm}
          voarPara={voarPara}
          onDadosCarregados={setImoveisVisiveis}
          camadasImportadas={camadasImportadas}
        />
        <DetailPanel feature={selecionado} onClose={() => setSelecionado(null)} />
        {aviso && (
          <div className="absolute top-4 left-1/2 z-1001 -translate-x-1/2 rounded bg-navy px-4 py-2 text-sm text-white shadow-lg">
            {aviso}
          </div>
        )}
      </main>
      <CadastroWizard
        aberto={wizardAberto}
        onClose={() => setWizardAberto(false)}
        onSalvo={() => setRecarregarEm((n) => n + 1)}
      />
      {quadrasAberto && (
        <QuadrasPanel onClose={() => setQuadrasAberto(false)} onAlterado={() => setRecarregarEm((n) => n + 1)} />
      )}
      {provisoriosAberto && (
        <ProvisoriosPanel onClose={() => setProvisoriosAberto(false)} onAlterado={() => setRecarregarEm((n) => n + 1)} />
      )}
      {operadoresAberto && <OperadoresPanel onClose={() => setOperadoresAberto(false)} />}
      {auditoriaAberto && <AuditoriaPanel onClose={() => setAuditoriaAberto(false)} />}
      {minhaAtividadeAberto && <MinhaAtividade onClose={() => setMinhaAtividadeAberto(false)} />}
    </div>
  )
}
