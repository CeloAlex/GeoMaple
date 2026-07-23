export const ESRI_WORLD_IMAGERY =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

export const OSM_STREETS = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

// Resolução nativa real do World Imagery gratuito da Esri. Além deste zoom o servidor
// não tem tiles de alta resolução para a maioria dos municípios (mostra o placeholder
// cinza "Map data not yet available"); maxNativeZoom faz o Leaflet ampliar o último tile
// disponível em vez de pedir um tile inexistente, e o seletor de camada (OSM) dá uma
// alternativa quando a imagem de satélite simplesmente não existe naquele ponto.
export const ESRI_MAX_NATIVE_ZOOM = 19
export const MAX_ZOOM = 21
