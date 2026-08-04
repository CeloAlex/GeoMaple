import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-draw'
import type { PolygonGeoJSON } from '../../types/imovel'
import { poligonoParaLatLngs, layerParaPoligono, calcularArea } from './geoDrawUtils'

export type SinglePolygonHandle = {
  iniciarDesenho: () => void
  finalizarDesenho: () => void
  criarDePontos: (pontos: L.LatLngExpression[]) => void
}

type Props = {
  geom: PolygonGeoJSON | null
  cor: string
  onChange: (geom: PolygonGeoJSON | null, areaM2: number | null) => void
}

// Versão simplificada do GeoDrawLayer do wizard de cadastro (Wizard/GeoDrawLayer.tsx) para
// telas que só precisam de UM polígono por vez — Quadras georreferenciadas e Delimitações
// Provisórias. Mesma integração com leaflet-draw, sem a distinção terreno/edificação.
export const SinglePolygonDraw = forwardRef<SinglePolygonHandle, Props>(function SinglePolygonDraw(
  { geom, cor, onChange },
  ref,
) {
  const map = useMap()
  const grupoRef = useRef(new L.FeatureGroup())
  const camadaRef = useRef<L.Polygon | null>(null)
  const desenhoAtivoRef = useRef<L.Draw.Polygon | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const estiloRef = useRef<L.PathOptions>({ color: cor, weight: 2, fillColor: cor, fillOpacity: 0.15, dashArray: '6,4' })
  estiloRef.current = { color: cor, weight: 2, fillColor: cor, fillOpacity: 0.15, dashArray: '6,4' }

  useImperativeHandle(ref, () => ({
    iniciarDesenho() {
      desenhoAtivoRef.current?.disable()
      const desenho = new L.Draw.Polygon(map as unknown as L.DrawMap, {
        shapeOptions: estiloRef.current,
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
    criarDePontos(pontos) {
      if (camadaRef.current) grupoRef.current.removeLayer(camadaRef.current)
      const layer = L.polygon(pontos, estiloRef.current)
      grupoRef.current.addLayer(layer)
      camadaRef.current = layer
      map.fitBounds(layer.getBounds(), { maxZoom: 19 })
      onChangeRef.current(layerParaPoligono(layer), calcularArea(layer))
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

    function substituir(layer: L.Polygon) {
      if (camadaRef.current) grupo.removeLayer(camadaRef.current)
      layer.setStyle(estiloRef.current)
      grupo.addLayer(layer)
      camadaRef.current = layer
      onChangeRef.current(layerParaPoligono(layer), calcularArea(layer))
    }

    function aoCriar(e: L.LeafletEvent) {
      substituir((e as L.DrawEvents.Created).layer as L.Polygon)
    }

    function aoEditar(e: L.LeafletEvent) {
      const evento = e as L.DrawEvents.Edited
      evento.layers.eachLayer((layer) => {
        onChangeRef.current(layerParaPoligono(layer as L.Polygon), calcularArea(layer as L.Polygon))
      })
    }

    function aoExcluir() {
      camadaRef.current = null
      onChangeRef.current(null, null)
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

  // Pré-carrega geometria existente uma única vez — não reage a edições do usuário
  useEffect(() => {
    if (geom && !camadaRef.current) {
      const layer = L.polygon(poligonoParaLatLngs(geom), estiloRef.current)
      grupoRef.current.addLayer(layer)
      camadaRef.current = layer
      map.fitBounds(layer.getBounds(), { maxZoom: 19 })
    }
  }, [geom, map])

  return null
})
