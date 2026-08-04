import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-draw'
import type { PolygonGeoJSON } from '../../types/imovel'
import { poligonoParaLatLngs, layerParaPoligono, calcularArea } from '../Map/geoDrawUtils'

export type TipoDesenho = 'terreno' | 'edificacao'

export type GeoDrawHandle = {
  iniciarDesenho: (tipo: TipoDesenho) => void
  finalizarDesenho: () => void
  criarDePontos: (tipo: TipoDesenho, pontos: L.LatLngExpression[]) => void
}

const ESTILO: Record<TipoDesenho, L.PathOptions> = {
  terreno: { color: '#2980b9', weight: 2, fillColor: '#2980b9', fillOpacity: 0.25 },
  edificacao: { color: '#c0392b', weight: 2, fillColor: '#c0392b', fillOpacity: 0.35 },
}

type LayerComTipo = L.Polygon & { sgcimTipo?: TipoDesenho }

type Props = {
  terrenoGeom: PolygonGeoJSON | null
  edificacaoGeom: PolygonGeoJSON | null
  onTerrenoChange: (geom: PolygonGeoJSON | null, areaM2: number | null) => void
  onEdificacaoChange: (geom: PolygonGeoJSON | null, areaM2: number | null) => void
}

// Integra leaflet-draw (biblioteca imperativa) ao mapa do react-leaflet.
// Um único FeatureGroup guarda no máximo 1 polígono de terreno + 1 de edificação,
// distinguidos pela propriedade sgcimTipo em cada layer.
export const GeoDrawLayer = forwardRef<GeoDrawHandle, Props>(function GeoDrawLayer(
  { terrenoGeom, edificacaoGeom, onTerrenoChange, onEdificacaoChange },
  ref,
) {
  const map = useMap()
  const grupoRef = useRef(new L.FeatureGroup())
  const camadasRef = useRef<{ terreno: L.Polygon | null; edificacao: L.Polygon | null }>({
    terreno: null,
    edificacao: null,
  })
  const tipoEmDesenhoRef = useRef<TipoDesenho>('terreno')
  const desenhoAtivoRef = useRef<L.Draw.Polygon | null>(null)
  const callbacksRef = useRef({ onTerrenoChange, onEdificacaoChange })
  callbacksRef.current = { onTerrenoChange, onEdificacaoChange }

  useImperativeHandle(ref, () => ({
    iniciarDesenho(tipo) {
      tipoEmDesenhoRef.current = tipo
      desenhoAtivoRef.current?.disable()
      const desenho = new L.Draw.Polygon(map as unknown as L.DrawMap, {
        shapeOptions: ESTILO[tipo],
        showArea: true,
        allowIntersection: false,
      })
      desenhoAtivoRef.current = desenho
      desenho.enable()
    },
    finalizarDesenho() {
      // Fecha o polígono em desenho explicitamente (>= 3 vértices) — complementa o
      // duplo-clique, já que o clique no 1º vértice não fecha mais sozinho (ver patch
      // do leaflet-draw: esse gatilho por proximidade causava fechamento acidental).
      desenhoAtivoRef.current?.completeShape()
    },
    criarDePontos(tipo, pontos) {
      const atual = camadasRef.current[tipo]
      if (atual) grupoRef.current.removeLayer(atual)
      const layer = L.polygon(pontos, ESTILO[tipo]) as LayerComTipo
      layer.sgcimTipo = tipo
      grupoRef.current.addLayer(layer)
      camadasRef.current[tipo] = layer
      map.fitBounds(layer.getBounds(), { maxZoom: 19 })
      const geom = layerParaPoligono(layer)
      const area = calcularArea(layer)
      if (tipo === 'terreno') callbacksRef.current.onTerrenoChange(geom, area)
      else callbacksRef.current.onEdificacaoChange(geom, area)
    },
  }))

  useEffect(() => {
    const grupo = grupoRef.current
    grupo.addTo(map)

    // topleft (não topright) para não empilhar com o LayersControl do mapa — caso
    // contrário os ícones de editar/excluir ficam espremidos no mesmo canto.
    const controle = new L.Control.Draw({
      position: 'topleft',
      draw: { polyline: false, polygon: false, rectangle: false, circle: false, marker: false, circlemarker: false },
      edit: { featureGroup: grupo, remove: true },
    })
    map.addControl(controle)

    function notificar(tipo: TipoDesenho) {
      const layer = camadasRef.current[tipo]
      const geom = layer ? layerParaPoligono(layer) : null
      const area = layer ? calcularArea(layer) : null
      if (tipo === 'terreno') callbacksRef.current.onTerrenoChange(geom, area)
      else callbacksRef.current.onEdificacaoChange(geom, area)
    }

    function substituirCamada(tipo: TipoDesenho, layer: L.Polygon) {
      const atual = camadasRef.current[tipo]
      if (atual) grupo.removeLayer(atual)
      ;(layer as LayerComTipo).sgcimTipo = tipo
      layer.setStyle(ESTILO[tipo])
      grupo.addLayer(layer)
      camadasRef.current[tipo] = layer
      notificar(tipo)
    }

    function aoCriar(e: L.LeafletEvent) {
      const evento = e as L.DrawEvents.Created
      substituirCamada(tipoEmDesenhoRef.current, evento.layer as L.Polygon)
    }

    function aoEditar(e: L.LeafletEvent) {
      const evento = e as L.DrawEvents.Edited
      evento.layers.eachLayer((layer) => {
        const tipo = (layer as LayerComTipo).sgcimTipo
        if (tipo) notificar(tipo)
      })
    }

    function aoExcluir(e: L.LeafletEvent) {
      const evento = e as L.DrawEvents.Deleted
      evento.layers.eachLayer((layer) => {
        const tipo = (layer as LayerComTipo).sgcimTipo
        if (!tipo) return
        camadasRef.current[tipo] = null
        if (tipo === 'terreno') callbacksRef.current.onTerrenoChange(null, null)
        else callbacksRef.current.onEdificacaoChange(null, null)
      })
    }

    map.on(L.Draw.Event.CREATED, aoCriar)
    map.on(L.Draw.Event.EDITED, aoEditar)
    map.on(L.Draw.Event.DELETED, aoExcluir)

    return () => {
      map.off(L.Draw.Event.CREATED, aoCriar)
      map.off(L.Draw.Event.EDITED, aoEditar)
      map.off(L.Draw.Event.DELETED, aoExcluir)
      map.removeControl(controle)
      map.removeLayer(grupo)
    }
  }, [map])

  // Pré-carrega geometria herdada/existente uma única vez — não reage a edições do usuário
  useEffect(() => {
    if (terrenoGeom && !camadasRef.current.terreno) {
      const layer = L.polygon(poligonoParaLatLngs(terrenoGeom), ESTILO.terreno)
      ;(layer as LayerComTipo).sgcimTipo = 'terreno'
      grupoRef.current.addLayer(layer)
      camadasRef.current.terreno = layer
      map.fitBounds(layer.getBounds(), { maxZoom: 19 })
      callbacksRef.current.onTerrenoChange(layerParaPoligono(layer), calcularArea(layer))
    }
  }, [terrenoGeom, map])

  useEffect(() => {
    if (edificacaoGeom && !camadasRef.current.edificacao) {
      const layer = L.polygon(poligonoParaLatLngs(edificacaoGeom), ESTILO.edificacao)
      ;(layer as LayerComTipo).sgcimTipo = 'edificacao'
      grupoRef.current.addLayer(layer)
      camadasRef.current.edificacao = layer
      callbacksRef.current.onEdificacaoChange(layerParaPoligono(layer), calcularArea(layer))
    }
  }, [edificacaoGeom])

  return null
})
