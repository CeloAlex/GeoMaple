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
import type { DestinoImportacao } from './Sidebar/Ferramentas'
import { api } from '../api/client'
import { centroidePoligono } from '../utils/geo'
import { exportarImovelGeoJSON, exportarImovelKML } from '../utils/exportarImovel'
import { useMunicipioStore } from '../store/municipioStore'
import type {
  ImovelFeature,
  ImovelFeatureCollection,
  ImovelGeometria,
  ImovelRegistro,
  ImovelSelecionado,
  PolygonGeoJSON,
} from '../types/imovel'
import type { CamadaImportada } from '../utils/importarGeo'
import type { Quadra } from '../types/quadra'
import type { Provisorio } from '../types/provisorio'

const SEM_IMOVEIS: ImovelFeatureCollection = { type: 'FeatureCollection', features: [] }

export function MainLayout() {
  const municipio = useMunicipioStore((s) => s.municipio)
  const [selecionado, setSelecionado] = useState<ImovelSelecionado | null>(null)
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
  const [quadraSelecionadaId, setQuadraSelecionadaId] = useState<number | null>(null)
  const [provisorioSelecionadoId, setProvisorioSelecionadoId] = useState<number | null>(null)
  const [medirDistanciaEm, setMedirDistanciaEm] = useState(0)
  const [medirAreaEm, setMedirAreaEm] = useState(0)
  // Árvores independentes (Cadastros e Quadras) — cada uma controla sua própria camada no
  // mapa, sem afetar a outra.
  const [ramosOcultosCadastros, setRamosOcultosCadastros] = useState<Set<string>>(new Set())
  const [ramosOcultosQuadras, setRamosOcultosQuadras] = useState<Set<string>>(new Set())
  const [geomInicialQuadra, setGeomInicialQuadra] = useState<PolygonGeoJSON | null>(null)
  const [geomInicialProvisorio, setGeomInicialProvisorio] = useState<PolygonGeoJSON | null>(null)
  // Provisório sendo convertido em Cadastro Definitivo — só é excluído quando o wizard
  // salva com sucesso (ver onSalvo do CadastroWizard); cancelar o wizard não deve excluí-lo.
  const [provisorioEmConversaoId, setProvisorioEmConversaoId] = useState<number | null>(null)

  function alternarRamo(setRamos: (atualizar: (atual: Set<string>) => Set<string>) => void, chave: string) {
    setRamos((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(chave)) proximo.delete(chave)
      else proximo.add(chave)
      return proximo
    })
  }

  function mostrarAviso(msg: string) {
    setAviso(msg)
    setTimeout(() => setAviso(null), 4000)
  }

  function buscarEndereco(destino: Destino, rotulo: string) {
    setSelecionado(null)
    setVoarPara(destino)
    mostrarAviso(`📍 ${rotulo}`)
  }

  // Único caminho de seleção (clique no polígono do mapa ou na árvore/busca) — sempre
  // busca o registro completo, para que DetailPanel/ficha mostrem todos os campos
  // cadastrados, não só o subconjunto reduzido que a camada do mapa usa para estilizar.
  async function selecionarImovelPorId(id: number) {
    try {
      const { data: geometria } = await api.get<ImovelGeometria>(`/api/imoveis/${id}/geometria`)
      if (!geometria.geom) {
        mostrarAviso(`${geometria.insc} ainda não tem polígono georreferenciado.`)
        return
      }
      setSelecionado({ type: 'Feature', geometry: geometria.geom, properties: geometria })
      setVoarPara(centroidePoligono(geometria.geom))
    } catch {
      mostrarAviso('Não foi possível carregar este imóvel.')
    }
  }

  function selecionarImovel(imovel: ImovelRegistro) {
    selecionarImovelPorId(imovel.id)
  }

  function selecionarQuadra(quadra: Quadra) {
    if (!quadra.geom) return
    setQuadraSelecionadaId(quadra.id)
    setVoarPara(centroidePoligono(quadra.geom))
    setQuadrasAberto(false)
  }

  function selecionarProvisorio(provisorio: Provisorio) {
    if (!provisorio.geom) return
    setProvisorioSelecionadoId(provisorio.id)
    setVoarPara(centroidePoligono(provisorio.geom))
    setProvisoriosAberto(false)
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
    setProvisorioEmConversaoId(null)
    setWizardAberto(true)
  }

  function converterParaDefinitivo(geom: PolygonGeoJSON) {
    setGeomParaConversao(geom)
    setWizardAberto(true)
  }

  // Converte um Provisório já salvo em Cadastro Definitivo: fecha o painel de Provisórios e
  // pré-carrega o polígono no wizard (mesmo caminho de converterParaDefinitivo, usado hoje
  // também para importações). O provisório original só é excluído quando o cadastro
  // definitivo é efetivamente salvo (ver onSalvo do CadastroWizard, abaixo) — cancelar o
  // wizard no meio do caminho deve deixar o provisório intacto.
  function converterProvisorioParaDefinitivo(provisorio: Provisorio) {
    if (!provisorio.geom) return
    setProvisoriosAberto(false)
    setGeomInicialProvisorio(null)
    setProvisorioEmConversaoId(provisorio.id)
    converterParaDefinitivo(provisorio.geom)
  }

  function aoSalvarWizard() {
    if (provisorioEmConversaoId != null) {
      api.delete(`/api/provisorios/${provisorioEmConversaoId}`).finally(() => setRecarregarEm((n) => n + 1))
      setProvisorioEmConversaoId(null)
    } else {
      setRecarregarEm((n) => n + 1)
    }
  }

  // Importação (KML/KMZ/GeoJSON/Shapefile) → escolha de destino (Sidebar/Ferramentas.tsx):
  // substitui a etapa de desenho manual do polígono na tela correspondente.
  function escolherDestinoImportacao(camada: CamadaImportada, destino: DestinoImportacao) {
    const feature = camada.geojson.features.find((f) => f.geometry?.type === 'Polygon')
    if (!feature) {
      mostrarAviso('Nenhum polígono encontrado no arquivo importado.')
      return
    }
    const geom = feature.geometry as PolygonGeoJSON
    if (destino === 'cadastro') {
      converterParaDefinitivo(geom)
    } else if (destino === 'provisorio') {
      setGeomInicialProvisorio(geom)
      setProvisoriosAberto(true)
    } else {
      setGeomInicialQuadra(geom)
      setQuadrasAberto(true)
    }
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
    onMedirDistancia: () => setMedirDistanciaEm((n) => n + 1),
    onMedirArea: () => setMedirAreaEm((n) => n + 1),
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
            onSelecionarQuadra={selecionarQuadra}
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
            onErro={mostrarAviso}
            ramosOcultosCadastros={ramosOcultosCadastros}
            onAlternarRamoCadastros={(chave) => alternarRamo(setRamosOcultosCadastros, chave)}
            ramosOcultosQuadras={ramosOcultosQuadras}
            onAlternarRamoQuadras={(chave) => alternarRamo(setRamosOcultosQuadras, chave)}
            onEscolherDestinoImportacao={escolherDestinoImportacao}
          />
        )}
        <main className="relative flex-1">
          <MapView
            selecionadoId={selecionado?.properties.id ?? null}
            onSelect={(feature: ImovelFeature) => selecionarImovelPorId(feature.properties.id)}
            recarregarEm={recarregarEm}
            voarPara={voarPara}
            onDadosCarregados={setImoveisVisiveis}
            camadasImportadas={camadasImportadas}
            camadasWms={camadasWms}
            fitTodosEm={fitTodosEm}
            quadraSelecionadaId={quadraSelecionadaId}
            provisorioSelecionadoId={provisorioSelecionadoId}
            onWmsErro={(nome) => mostrarAviso(`⚠️ Camada WMS "${nome}" não retornou imagem — verifique nome técnico/URL/versão do serviço.`)}
            medirDistanciaEm={medirDistanciaEm}
            medirAreaEm={medirAreaEm}
            ramosOcultosCadastros={ramosOcultosCadastros}
            ramosOcultosQuadras={ramosOcultosQuadras}
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
          setProvisorioEmConversaoId(null)
        }}
        onSalvo={aoSalvarWizard}
        geomInicial={geomParaConversao}
      />
      {quadrasAberto && (
        <QuadrasPanel
          onClose={() => {
            setQuadrasAberto(false)
            setGeomInicialQuadra(null)
          }}
          onAlterado={() => setRecarregarEm((n) => n + 1)}
          onSelecionar={selecionarQuadra}
          geomInicial={geomInicialQuadra}
        />
      )}
      {provisoriosAberto && (
        <ProvisoriosPanel
          onClose={() => {
            setProvisoriosAberto(false)
            setGeomInicialProvisorio(null)
          }}
          onAlterado={() => setRecarregarEm((n) => n + 1)}
          onSelecionar={selecionarProvisorio}
          geomInicial={geomInicialProvisorio}
          onConverterParaDefinitivo={converterProvisorioParaDefinitivo}
        />
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
