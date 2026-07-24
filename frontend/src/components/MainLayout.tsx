import { useEffect, useState } from 'react'
import { Sidebar } from './Sidebar'
import { MapView, type CamadaWms, type Destino } from './Map/MapView'
import { DetailPanel } from './DetailPanel'
import { CadastroWizard } from './Wizard/CadastroWizard'
import { QuadrasPanel } from './Quadras/QuadrasPanel'
import { ProvisoriosPanel } from './Provisorios/ProvisoriosPanel'
import { OperadoresPanel } from './Operadores/OperadoresPanel'
import { AuditoriaPanel } from './Auditoria/AuditoriaPanel'
import { MinhaAtividade } from './Auditoria/MinhaAtividade'
import { MenuBar } from './MenuBar'
import { Toolbar } from './Toolbar'
import { GeoNetworkCatalogo } from './GeoNetworkCatalogo'
import { ConversaoImportadosPanel } from './ConversaoImportadosPanel'
import { api } from '../api/client'
import { centroidePoligono } from '../utils/geo'
import { exportarImovelGeoJSON, exportarImovelKML } from '../utils/exportarImovel'
import { useMunicipioStore } from '../store/municipioStore'
import type { ImovelFeature, ImovelFeatureCollection, ImovelGeometria, ImovelRegistro, PolygonGeoJSON } from '../types/imovel'
import type { CamadaImportada } from '../utils/importarGeo'

const SEM_IMOVEIS: ImovelFeatureCollection = { type: 'FeatureCollection', features: [] }

export function MainLayout() {
  const municipio = useMunicipioStore((s) => s.municipio)
  const [selecionado, setSelecionado] = useState<ImovelFeature | null>(null)
  const [wizardAberto, setWizardAberto] = useState(false)
  const [quadrasAberto, setQuadrasAberto] = useState(false)
  const [provisoriosAberto, setProvisoriosAberto] = useState(false)
  const [operadoresAberto, setOperadoresAberto] = useState(false)
  const [auditoriaAberto, setAuditoriaAberto] = useState(false)
  const [minhaAtividadeAberto, setMinhaAtividadeAberto] = useState(false)
  const [sobreAberto, setSobreAberto] = useState(false)
  const [sidebarColapsada, setSidebarColapsada] = useState(false)
  const [recarregarEm, setRecarregarEm] = useState(0)
  const [voarPara, setVoarPara] = useState<Destino | null>(null)
  const [fitTodosEm, setFitTodosEm] = useState(0)
  const [wmsFormEm, setWmsFormEm] = useState(0)
  const [catalogoAberto, setCatalogoAberto] = useState(false)
  const [conversaoAberta, setConversaoAberta] = useState(false)
  const [geomParaConversao, setGeomParaConversao] = useState<PolygonGeoJSON | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [imoveisVisiveis, setImoveisVisiveis] = useState<ImovelFeatureCollection>(SEM_IMOVEIS)
  const [camadasImportadas, setCamadasImportadas] = useState<CamadaImportada[]>([])
  const [camadasWms, setCamadasWms] = useState<CamadaWms[]>([])

  function mostrarAviso(msg: string) {
    setAviso(msg)
    setTimeout(() => setAviso(null), 4000)
  }

  function buscarEndereco(destino: Destino, rotulo: string) {
    setSelecionado(null)
    setVoarPara(destino)
    mostrarAviso(`📍 ${rotulo}`)
  }

  async function selecionarImovel(imovel: ImovelRegistro) {
    try {
      const { data: geometria } = await api.get<ImovelGeometria>(`/api/imoveis/${imovel.id}/geometria`)
      if (!geometria.geom) {
        mostrarAviso(`${imovel.insc} ainda não tem polígono georreferenciado.`)
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
      mostrarAviso('Não foi possível carregar este imóvel.')
    }
  }

  function exportarKmlSelecionado() {
    if (!selecionado) {
      mostrarAviso('Selecione um imóvel no mapa ou na busca primeiro.')
      return
    }
    exportarImovelKML(selecionado)
  }

  function exportarGeoJsonSelecionado() {
    if (!selecionado) {
      mostrarAviso('Selecione um imóvel no mapa ou na busca primeiro.')
      return
    }
    exportarImovelGeoJSON(selecionado)
  }

  function abrirWizardNovo() {
    setGeomParaConversao(null)
    setWizardAberto(true)
  }

  function converterParaDefinitivo(geom: PolygonGeoJSON) {
    setGeomParaConversao(geom)
    setWizardAberto(true)
  }

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        abrirWizardNovo()
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        setProvisoriosAberto(true)
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        window.print()
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  const acoesShell = {
    onToggleSidebar: () => setSidebarColapsada((c) => !c),
    onNovoCadastro: abrirWizardNovo,
    onNovaProvisoria: () => setProvisoriosAberto(true),
    onQuadras: () => setQuadrasAberto(true),
    onOperadores: () => setOperadoresAberto(true),
    onExportarKmlSelecionado: exportarKmlSelecionado,
    onExportarGeoJsonSelecionado: exportarGeoJsonSelecionado,
    onVerTodos: () => setFitTodosEm((n) => n + 1),
    onAdicionarWms: () => {
      setSidebarColapsada(false)
      setWmsFormEm((n) => n + 1)
    },
    onAbrirCatalogoGeoNetwork: () => setCatalogoAberto(true),
    onConverterImportados: () => setConversaoAberta(true),
    onImprimirMapa: () => window.print(),
    onSobre: () => setSobreAberto(true),
    onIndisponivel: mostrarAviso,
  }

  return (
    <div className="flex h-full flex-col">
      <MenuBar {...acoesShell} />
      <Toolbar {...acoesShell} />
      <div className="flex min-h-0 flex-1">
        {!sidebarColapsada && (
          <Sidebar
            onNovoCadastro={() => setWizardAberto(true)}
            onQuadras={() => setQuadrasAberto(true)}
            onProvisorios={() => setProvisoriosAberto(true)}
            onOperadores={() => setOperadoresAberto(true)}
            onAuditoria={() => setAuditoriaAberto(true)}
            onMinhaAtividade={() => setMinhaAtividadeAberto(true)}
            onSelecionarImovel={selecionarImovel}
            onBuscarEndereco={buscarEndereco}
            recarregarArvoreEm={recarregarEm}
            imoveisVisiveis={imoveisVisiveis}
            camadasImportadas={camadasImportadas}
            onImportar={(camada) => setCamadasImportadas((cs) => [...cs, camada])}
            onLimparImportadas={() => setCamadasImportadas([])}
            camadasWms={camadasWms}
            onAdicionarWms={(camada) => setCamadasWms((cs) => [...cs, camada])}
            onRemoverWms={(id) => setCamadasWms((cs) => cs.filter((c) => c.id !== id))}
            abrirFormularioWmsEm={wmsFormEm}
          />
        )}
        <main className="relative flex-1">
          <MapView
            selecionadoId={selecionado?.properties.id ?? null}
            onSelect={(feature: ImovelFeature) => setSelecionado(feature)}
            recarregarEm={recarregarEm}
            voarPara={voarPara}
            onDadosCarregados={setImoveisVisiveis}
            camadasImportadas={camadasImportadas}
            camadasWms={camadasWms}
            fitTodosEm={fitTodosEm}
          />
          <DetailPanel
            feature={selecionado}
            onClose={() => setSelecionado(null)}
            onAlterado={() => setRecarregarEm((n) => n + 1)}
          />
          {aviso && (
            <div className="absolute top-4 left-1/2 z-1001 -translate-x-1/2 rounded bg-navy px-4 py-2 text-sm text-white shadow-lg print:hidden">
              {aviso}
            </div>
          )}
          <div className="absolute top-2 left-1/2 z-1000 hidden -translate-x-1/2 rounded bg-white/90 px-4 py-1.5 text-center shadow print:block">
            <p className="text-sm font-semibold text-navy">Mapa Cadastral — {municipio.nome}/{municipio.uf}</p>
            <p className="text-[10px] text-gray-500">
              Impresso em {new Date().toLocaleString('pt-BR')} · SIRGAS2000/WGS84 · Imóveis visíveis:{' '}
              {imoveisVisiveis.features.length}
            </p>
          </div>
        </main>
      </div>
      <CadastroWizard
        aberto={wizardAberto}
        onClose={() => {
          setWizardAberto(false)
          setGeomParaConversao(null)
        }}
        onSalvo={() => setRecarregarEm((n) => n + 1)}
        geomInicial={geomParaConversao}
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
      {catalogoAberto && (
        <GeoNetworkCatalogo
          onClose={() => setCatalogoAberto(false)}
          camadasWms={camadasWms}
          onAdicionarWms={(camada) => setCamadasWms((cs) => [...cs, camada])}
          onRemoverWms={(id) => setCamadasWms((cs) => cs.filter((c) => c.id !== id))}
        />
      )}
      {conversaoAberta && (
        <ConversaoImportadosPanel
          onClose={() => setConversaoAberta(false)}
          camadasImportadas={camadasImportadas}
          onConvertidoProvisorio={() => {
            setConversaoAberta(false)
            setRecarregarEm((n) => n + 1)
          }}
          onConverterParaDefinitivo={converterParaDefinitivo}
        />
      )}
      {sobreAberto && (
        <div className="fixed inset-0 z-2000 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-navy">GeoMaple · SGCIM</h2>
            <p className="mt-2 text-sm text-gray-600">
              Sistema de Gestão Cadastral Imobiliária Municipal — {municipio.nome}/{municipio.uf}.
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Cadastro, georreferenciamento e gestão de imóveis urbanos, quadras, delimitações
              provisórias, unidades autônomas e integração SINTER/CADURB.
            </p>
            <button
              onClick={() => setSobreAberto(false)}
              className="mt-5 w-full rounded bg-navy py-2 text-sm font-medium text-white hover:bg-navy/90"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
