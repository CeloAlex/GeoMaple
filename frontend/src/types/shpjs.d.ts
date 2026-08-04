// shpjs não publica tipos — declaração mínima cobrindo só o que usamos (utils/importarGeo.ts).
declare module 'shpjs' {
  import type { FeatureCollection } from 'geojson'

  function shp(buffer: ArrayBuffer): Promise<FeatureCollection | FeatureCollection[]>
  export default shp
}
