import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-draw'
import type { LineStringGeoJSON } from '../../types/logradouro'
import { linhaParaLatLngs, layerParaLinha, calcularComprimento } from './geoDrawUtils'

export type SingleLineHandle = {
  iniciarDesenho: () => void
  finalizarDesenho: () => void
}

type Props = {
  geom: LineStringGeoJSON | null
  cor: string
  onChange: (geom: LineStringGeoJSON | null, comprimentoM: number | null) => void
}

// Paralelo a SinglePolygonDraw.tsx, mas para o eixo de um logradouro: L.Draw.Polyline em
// vez de Polygon, sem fechamento de anel, comprimento em vez de área.
export const SingleLineDraw = forwardRef<SingleLineHandle, Props>(function SingleLineDraw({ geom, cor, onChange }, ref) {
  const map = useMap()
  const grupoRef = useRef(new L.FeatureGroup())
  const camadaRef = useRef<L.Polyline | null>(null)
  const desenhoAtivoRef = useRef<L.Draw.Polyline | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const estiloRef = useRef<L.PathOptions>({ color: cor, weight: 4 })
  estiloRef.current = { color: cor, weight: 4 }

  useImperativeHandle(ref, () => ({
    iniciarDesenho() {
      desenhoAtivoRef.current?.disable()
      const desenho = new L.Draw.Polyline(map as unknown as L.DrawMap, {
        shapeOptions: estiloRef.current,
        showLength: true,
        metric: true,
      })
      desenhoAtivoRef.current = desenho
      desenho.enable()
    },
    finalizarDesenho() {
      desenhoAtivoRef.current?.completeShape?.()
    },
  }))

  useEffect(() => {
    const grupo = grupoRef.current
    grupo.addTo(map)

    const controle = new L.Control.Draw({
      position: 'topleft',
      draw: { polyline: false, polygon: false, rectangle: false, circle: false, marker: false, circlemarker: false },
      edit: { featureGroup: grupo, remove: true },
    })
    map.addControl(controle)

    function substituir(layer: L.Polyline) {
      if (camadaRef.current) grupo.removeLayer(camadaRef.current)
      layer.setStyle(estiloRef.current)
      grupo.addLayer(layer)
      camadaRef.current = layer
      onChangeRef.current(layerParaLinha(layer), calcularComprimento(layer, map))
    }

    function aoCriar(e: L.LeafletEvent) {
      const evento = e as L.DrawEvents.Created
      if (evento.layerType !== 'polyline') return
      substituir(evento.layer as L.Polyline)
    }

    function aoEditar(e: L.LeafletEvent) {
      const evento = e as L.DrawEvents.Edited
      evento.layers.eachLayer((layer) => {
        onChangeRef.current(layerParaLinha(layer as L.Polyline), calcularComprimento(layer as L.Polyline, map))
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

  // Pré-carrega geometria existente uma única vez — não reage a edições do usuário.
  useEffect(() => {
    if (geom && !camadaRef.current) {
      const layer = L.polyline(linhaParaLatLngs(geom), estiloRef.current)
      grupoRef.current.addLayer(layer)
      camadaRef.current = layer
      map.fitBounds(layer.getBounds(), { maxZoom: 19 })
      onChangeRef.current(layerParaLinha(layer), calcularComprimento(layer, map))
    }
  }, [geom, map])

  return null
})
