export const ESRI_WORLD_IMAGERY =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

export const OSM_STREETS = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

// Resolução nativa real do World Imagery gratuito da Esri PARA ESTE MUNICÍPIO. Além deste
// zoom o servidor não tem tiles de alta resolução (mostra o placeholder cinza "Map data
// not yet available"); maxNativeZoom faz o Leaflet ampliar o último tile disponível em vez
// de pedir um tile inexistente, garantindo que o fundo de satélite nunca desapareça — só
// perde nitidez gradualmente.
//
// Valor verificado empiricamente em 2026-08 para o centro do município configurado
// (MUNICIPIO_CENTRO_LAT/LNG, Ouro Preto/MG): zoom 18 já retorna imagem real, zoom 19 e além
// retornam o placeholder cinza (mesmo tamanho de resposta em bytes — 2521 — no centro e em
// 15 tiles vizinhos). Se este código for reaproveitado para outro município, revalidar
// baixando um tile de "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/
// MapServer/tile/{z}/{y}/{x}" no centro configurado, subindo o zoom até o tamanho do
// arquivo parar de crescer/variar — esse é o maxNativeZoom real daquele ponto.
export const ESRI_MAX_NATIVE_ZOOM = 18
export const MAX_ZOOM = 21
