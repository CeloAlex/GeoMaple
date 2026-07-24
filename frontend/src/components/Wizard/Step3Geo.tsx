import { useRef } from 'react'
import { MapContainer, TileLayer, LayersControl } from 'react-leaflet'
import { GeoDrawLayer, type GeoDrawHandle } from './GeoDrawLayer'
import { ColarCoordenadas } from '../Map/ColarCoordenadas'
import { ESRI_WORLD_IMAGERY, ESRI_MAX_NATIVE_ZOOM, MAX_ZOOM, OSM_STREETS } from '../Map/constants'
import { useMunicipioStore } from '../../store/municipioStore'
import type { WizardFormData } from './types'

function fmtArea(m2: number) {
  return m2 >= 10000
    ? `${(m2 / 10000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha (${m2.toFixed(0)} m²)`
    : `${m2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m²`
}

type Props = {
  form: WizardFormData
  set: <K extends keyof WizardFormData>(campo: K, valor: WizardFormData[K]) => void
  herdadoInsc: string | null
}

export function Step3Geo({ form, set, herdadoInsc }: Props) {
  const geoRef = useRef<GeoDrawHandle>(null)
  const centro = useMunicipioStore((s) => s.municipio.centro)

  return (
    <div className="space-y-3">
      {herdadoInsc && (
        <p className="rounded bg-verde/5 px-3 py-2 text-xs text-navy">
          Polígono pré-carregado do terreno {herdadoInsc}. Ajuste os vértices se necessário.
        </p>
      )}
      <p className="text-sm text-gray-600">
        Clique nos vértices para delimitar o terreno; clique no primeiro ponto (ou dê duplo-clique) para fechar o
        polígono. A edificação é opcional.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => geoRef.current?.iniciarDesenho('terreno')}
          className="rounded bg-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-navy/90"
        >
          ✏️ Desenhar terreno
        </button>
        <button
          type="button"
          onClick={() => geoRef.current?.iniciarDesenho('edificacao')}
          className="rounded border border-red-500 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          ✏️ Desenhar edificação (opcional)
        </button>
        <ColarCoordenadas
          rotulo="📋 Colar coordenadas do terreno"
          onAplicar={(pontos) => geoRef.current?.criarDePontos('terreno', pontos)}
        />
        <ColarCoordenadas
          rotulo="📋 Colar coordenadas da edificação"
          onAplicar={(pontos) => geoRef.current?.criarDePontos('edificacao', pontos)}
        />
      </div>

      <div className="h-80 w-full overflow-hidden rounded border border-gray-300">
        <MapContainer center={[centro.lat, centro.lng]} zoom={18} maxZoom={MAX_ZOOM} className="h-full w-full">
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Satélite">
              <TileLayer
                url={ESRI_WORLD_IMAGERY}
                attribution="Tiles &copy; Esri"
                maxZoom={MAX_ZOOM}
                maxNativeZoom={ESRI_MAX_NATIVE_ZOOM}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Mapa">
              <TileLayer url={OSM_STREETS} attribution="&copy; OpenStreetMap" maxZoom={MAX_ZOOM} maxNativeZoom={19} />
            </LayersControl.BaseLayer>
          </LayersControl>
          <GeoDrawLayer
            terrenoGeom={form.geom}
            edificacaoGeom={form.geomBld}
            onTerrenoChange={(geom, area) => {
              set('geom', geom)
              set('areaTerrenoCalc', area)
            }}
            onEdificacaoChange={(geom, area) => {
              set('geomBld', geom)
              set('areaEdifCalc', area)
            }}
            ref={geoRef}
          />
        </MapContainer>
      </div>

      <div className="flex gap-4 text-sm">
        <span className={form.geom ? 'text-verde' : 'text-red-600'}>
          {form.geom
            ? `✅ Terreno: ${fmtArea(form.areaTerrenoCalc ?? 0)}`
            : '❌ Polígono do terreno obrigatório'}
        </span>
        {form.geomBld && <span className="text-red-600">🏠 Edificação: {fmtArea(form.areaEdifCalc ?? 0)}</span>}
      </div>
    </div>
  )
}
