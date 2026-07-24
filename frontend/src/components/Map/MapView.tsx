import { useCallback, useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, LayersControl, ScaleControl, WMSTileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { Layer, PathOptions } from 'leaflet'
import { api } from '../../api/client'
import type { ImovelFeature, ImovelFeatureCollection } from '../../types/imovel'
import type { Quadra } from '../../types/quadra'
import type { Provisorio } from '../../types/provisorio'
import type { CamadaImportada } from '../../utils/importarGeo'
import { useMunicipioStore } from '../../store/municipioStore'
import { ESRI_WORLD_IMAGERY, ESRI_MAX_NATIVE_ZOOM, MAX_ZOOM, OSM_STREETS } from './constants'
import { Regua } from './Regua'
import { Legend } from './Legend'
import { StatusBar } from './StatusBar'
import L from 'leaflet'

export type Destino = { lat: number; lng: number; zoom?: number }
export type CamadaWms = { id: string; nome: string; url: string; layers: string }

const VAZIO: ImovelFeatureCollection = { type: 'FeatureCollection', features: [] }

function CamadaQuadras({ recarregarEm }: { recarregarEm?: number }) {
  const [quadras, setQuadras] = useState<Quadra[]>([])

  useEffect(() => {
    api
      .get<Quadra[]>('/api/quadras')
      .then(({ data }) => setQuadras(data))
      .catch(() => {
        // Falha ao carregar quadras não deve travar o mapa
      })
  }, [recarregarEm])

  const fc = {
    type: 'FeatureCollection' as const,
    features: quadras
      .filter((q) => q.geom)
      .map((q) => ({
        type: 'Feature' as const,
        geometry: q.geom!,
        properties: { id: q.id, label: `${q.di}.${q.se}.${q.qu}${q.cod ? ' — ' + q.cod : ''}` },
      })),
  }

  return (
    <GeoJSON
      key={quadras.map((q) => q.id).join(',')}
      data={fc as never}
      style={{ color: '#c9a227', weight: 2, fillColor: '#c9a227', fillOpacity: 0.08, dashArray: '6,4' } as never}
      onEachFeature={(feature, layer: Layer) => {
        layer.bindTooltip(feature.properties.label)
      }}
    />
  )
}

function CamadaProvisorios({ recarregarEm }: { recarregarEm?: number }) {
  const [lista, setLista] = useState<Provisorio[]>([])

  useEffect(() => {
    api
      .get<Provisorio[]>('/api/provisorios')
      .then(({ data }) => setLista(data))
      .catch(() => {
        // Falha ao carregar provisórios não deve travar o mapa
      })
  }, [recarregarEm])

  const fc = {
    type: 'FeatureCollection' as const,
    features: lista
      .filter((p) => p.geom)
      .map((p) => ({
        type: 'Feature' as const,
        geometry: p.geom!,
        properties: { id: p.id, label: p.nome },
      })),
  }

  return (
    <GeoJSON
      key={lista.map((p) => p.id).join(',')}
      data={fc as never}
      style={{ color: '#e67e22', weight: 2, fillColor: '#e67e22', fillOpacity: 0.15, dashArray: '4,4' } as never}
      onEachFeature={(feature, layer: Layer) => {
        layer.bindTooltip(feature.properties.label)
      }}
    />
  )
}

// Camadas de referência importadas pelo operador (KML/GeoJSON) — roxo, só visual, não
// persiste no backend. Centraliza o mapa na camada recém-importada.
function CamadasImportadas({ camadas }: { camadas: CamadaImportada[] }) {
  const map = useMap()
  const [ultimaId, setUltimaId] = useState<string | null>(null)

  useEffect(() => {
    const ultima = camadas[camadas.length - 1]
    if (!ultima || ultima.id === ultimaId) return
    setUltimaId(ultima.id)
    try {
      const layer = L.geoJSON(ultima.geojson as never)
      const bounds = layer.getBounds()
      if (bounds.isValid()) map.fitBounds(bounds, { maxZoom: 18 })
    } catch {
      // Geometria sem bounds válidos (ex.: camada vazia) — ignora
    }
  }, [camadas, map, ultimaId, setUltimaId])

  return (
    <>
      {camadas.map((c) => (
        <GeoJSON
          key={c.id}
          data={c.geojson as never}
          style={{ color: '#9b59b6', weight: 2, fillOpacity: 0.12 } as never}
          onEachFeature={(feature, layer: Layer) => {
            const nome = (feature.properties as Record<string, unknown> | undefined)?.nome
            if (typeof nome === 'string' && nome) layer.bindTooltip(nome)
          }}
        />
      ))}
    </>
  )
}

function BuscadorDeImoveis({
  onData,
  recarregarEm,
}: {
  onData: (fc: ImovelFeatureCollection) => void
  recarregarEm?: number
}) {
  const map = useMap()

  const carregar = useCallback(async () => {
    const b = map.getBounds()
    const bbox = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`
    try {
      const { data } = await api.get<ImovelFeatureCollection>('/api/geo/bbox', { params: { bbox } })
      onData(data)
    } catch {
      // Falha ao carregar imóveis não deve travar a navegação no mapa
    }
  }, [map, onData])

  useEffect(() => {
    carregar()
  }, [carregar, recarregarEm])

  useMapEvents({ moveend: carregar })

  return null
}

// Botões "Google Maps"/"Street View" reais (mesmo link público que o protótipo usava em
// v10 openGM/openSV) centrados na posição atual do mapa — sem chave de API, sem custo.
function BotoesGoogle() {
  const map = useMap()

  function abrirGoogleMaps() {
    const c = map.getCenter()
    window.open(`https://www.google.com/maps/@${c.lat},${c.lng},${map.getZoom()}z/data=!3m1!1e3`, '_blank')
  }

  function abrirStreetView() {
    const c = map.getCenter()
    window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${c.lat},${c.lng}`, '_blank')
  }

  return (
    <div className="absolute top-[170px] left-2.5 z-1000 flex flex-col overflow-hidden rounded border border-gray-300 bg-white text-sm shadow">
      <button onClick={abrirGoogleMaps} className="px-2 py-1.5 hover:bg-gray-100" title="Abrir no Google Maps">
        🛰️
      </button>
      <button onClick={abrirStreetView} className="px-2 py-1.5 hover:bg-gray-100" title="Abrir no Street View">
        🚶
      </button>
    </div>
  )
}

// Centraliza o mapa em um ponto (resultado de busca ou clique na árvore hierárquica).
function Voador({ destino }: { destino: Destino | null }) {
  const map = useMap()

  useEffect(() => {
    if (destino) map.flyTo([destino.lat, destino.lng], destino.zoom ?? 19)
  }, [destino, map])

  return null
}

// Ajusta o zoom/centro para enquadrar todos os imóveis carregados (comando "Ver todos").
function FitTodos({ comandoEm, dados }: { comandoEm?: number; dados: ImovelFeatureCollection }) {
  const map = useMap()
  const dadosRef = useRef(dados)
  dadosRef.current = dados

  useEffect(() => {
    if (!comandoEm) return
    try {
      const layer = L.geoJSON(dadosRef.current as never)
      const bounds = layer.getBounds()
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 20 })
    } catch {
      // Sem imóveis carregados — nada para enquadrar
    }
  }, [comandoEm, map])

  return null
}

// Seta de norte fixa sobre o mapa — o mapa não gira, então sempre aponta para cima.
function SetaNorte() {
  return (
    <div
      className="absolute right-3.5 bottom-[130px] z-700 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[13px] font-black text-gray-800 shadow-lg"
      title="Norte"
    >
      N↑
    </div>
  )
}

type Props = {
  selecionadoId: number | null
  onSelect: (feature: ImovelFeature) => void
  recarregarEm?: number
  voarPara?: Destino | null
  onDadosCarregados?: (fc: ImovelFeatureCollection) => void
  camadasImportadas?: CamadaImportada[]
  camadasWms?: CamadaWms[]
  fitTodosEm?: number
}

export function MapView({
  selecionadoId,
  onSelect,
  recarregarEm,
  voarPara,
  onDadosCarregados,
  camadasImportadas,
  camadasWms,
  fitTodosEm,
}: Props) {
  const [dados, setDados] = useState<ImovelFeatureCollection>(VAZIO)
  const centro = useMunicipioStore((s) => s.municipio.centro)
  const onDadosCarregadosRef = useRef(onDadosCarregados)
  onDadosCarregadosRef.current = onDadosCarregados

  useEffect(() => {
    onDadosCarregadosRef.current?.(dados)
  }, [dados])

  function estiloFeature(feature?: ImovelFeature): PathOptions {
    const selecionado = feature?.properties.id === selecionadoId
    if (selecionado) {
      return { color: '#f1c40f', weight: 3, fillColor: '#f1c40f', fillOpacity: 0.35 }
    }
    return { color: '#2980b9', weight: 2, fillColor: '#2980b9', fillOpacity: 0.25 }
  }

  return (
    <MapContainer center={[centro.lat, centro.lng]} zoom={centro.zoom} maxZoom={MAX_ZOOM} className="h-full w-full">
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Satélite (Esri)">
          <TileLayer
            url={ESRI_WORLD_IMAGERY}
            attribution="Tiles &copy; Esri"
            maxZoom={MAX_ZOOM}
            maxNativeZoom={ESRI_MAX_NATIVE_ZOOM}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Mapa (OpenStreetMap)">
          <TileLayer url={OSM_STREETS} attribution="&copy; OpenStreetMap contributors" maxZoom={MAX_ZOOM} maxNativeZoom={19} />
        </LayersControl.BaseLayer>
        <LayersControl.Overlay checked name="Quadras georreferenciadas">
          <CamadaQuadras recarregarEm={recarregarEm} />
        </LayersControl.Overlay>
        <LayersControl.Overlay checked name="Delimitações provisórias">
          <CamadaProvisorios recarregarEm={recarregarEm} />
        </LayersControl.Overlay>
        <LayersControl.Overlay checked name="Imóveis">
          <GeoJSON
            key={dados.features.map((f) => f.properties.id).join(',')}
            data={dados as never}
            style={estiloFeature as never}
            onEachFeature={(feature, layer: Layer) => {
              layer.on('click', () => onSelect(feature as unknown as ImovelFeature))
            }}
          />
        </LayersControl.Overlay>
        {camadasImportadas && camadasImportadas.length > 0 && (
          <LayersControl.Overlay checked name="Camadas importadas">
            <CamadasImportadas camadas={camadasImportadas} />
          </LayersControl.Overlay>
        )}
        {camadasWms?.map((c) => (
          <LayersControl.Overlay key={c.id} checked name={c.nome}>
            <WMSTileLayer url={c.url} layers={c.layers} format="image/png" transparent />
          </LayersControl.Overlay>
        ))}
      </LayersControl>
      <BotoesGoogle />
      <Regua />
      <Voador destino={voarPara ?? null} />
      <FitTodos comandoEm={fitTodosEm} dados={dados} />
      <BuscadorDeImoveis onData={setDados} recarregarEm={recarregarEm} />
      <Legend />
      <SetaNorte />
      <ScaleControl position="bottomleft" imperial={false} />
      <StatusBar totalVisiveis={dados.features.length} />
    </MapContainer>
  )
}
