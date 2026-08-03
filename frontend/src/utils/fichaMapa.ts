import { ESRI_WORLD_IMAGERY, ESRI_MAX_NATIVE_ZOOM } from '../components/Map/constants'

const TILE = 256

// Projeção Web Mercator (mesma usada pelos tiles slippy-map/ArcGIS) — converte lat/lng
// para pixel absoluto no "mundo" naquele zoom, para localizar tiles e sobrepor o
// contorno do polígono com precisão de pixel sobre o mosaico.
function pixelMundo(lat: number, lng: number, zoom: number) {
  const escala = TILE * 2 ** zoom
  const x = ((lng + 180) / 360) * escala
  const sinLat = Math.sin((lat * Math.PI) / 180)
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * escala
  return { x, y }
}

// Monta um mosaico de tiles de satélite (Esri World Imagery) cobrindo o polígono, com o
// contorno do lote sobreposto em SVG — usado na ficha cadastral impressa (item que antes
// só tinha um esboço vetorial, sem imagem de satélite real). Evita rasterizar em canvas
// (que exigiria CORS/crossOrigin do servidor Esri) montando os tiles como <img> comuns em
// posição absoluta: é só exibição de imagem, não leitura de pixels.
export function mosaicoSatelite(anel: number[][], largura = 640, altura = 400): string {
  const lngs = anel.map((c) => c[0])
  const lats = anel.map((c) => c[1])
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)

  const margLng = (maxLng - minLng || 1e-6) * 0.15
  const margLat = (maxLat - minLat || 1e-6) * 0.15
  const bMinLng = minLng - margLng
  const bMaxLng = maxLng + margLng
  const bMinLat = minLat - margLat
  const bMaxLat = maxLat + margLat

  // Maior zoom (mais detalhe) cujo bbox com margem ainda caiba no canvas.
  let zoom = ESRI_MAX_NATIVE_ZOOM
  for (; zoom > 0; zoom--) {
    const p1 = pixelMundo(bMaxLat, bMinLng, zoom)
    const p2 = pixelMundo(bMinLat, bMaxLng, zoom)
    if (Math.abs(p2.x - p1.x) <= largura && Math.abs(p2.y - p1.y) <= altura) break
  }

  const topoEsquerda = pixelMundo(bMaxLat, bMinLng, zoom)
  const baixoDireita = pixelMundo(bMinLat, bMaxLng, zoom)
  const bboxW = baixoDireita.x - topoEsquerda.x
  const bboxH = baixoDireita.y - topoEsquerda.y
  const origemX = topoEsquerda.x - (largura - bboxW) / 2
  const origemY = topoEsquerda.y - (altura - bboxH) / 2

  const maxTile = 2 ** zoom - 1
  const tileMinX = Math.floor(origemX / TILE)
  const tileMaxX = Math.floor((origemX + largura) / TILE)
  const tileMinY = Math.max(0, Math.floor(origemY / TILE))
  const tileMaxY = Math.min(maxTile, Math.floor((origemY + altura) / TILE))

  const imgs: string[] = []
  for (let ty = tileMinY; ty <= tileMaxY; ty++) {
    for (let tx = tileMinX; tx <= tileMaxX; tx++) {
      const txWrapped = ((tx % (maxTile + 1)) + (maxTile + 1)) % (maxTile + 1)
      const left = (tx * TILE - origemX).toFixed(1)
      const top = (ty * TILE - origemY).toFixed(1)
      const url = ESRI_WORLD_IMAGERY.replace('{z}', String(zoom)).replace('{y}', String(ty)).replace('{x}', String(txWrapped))
      imgs.push(`<img src="${url}" style="position:absolute;left:${left}px;top:${top}px;width:${TILE}px;height:${TILE}px" />`)
    }
  }

  const poligonoPontos = anel
    .map(([lng, lat]) => {
      const p = pixelMundo(lat, lng, zoom)
      return `${(p.x - origemX).toFixed(1)},${(p.y - origemY).toFixed(1)}`
    })
    .join(' ')

  return `<div class="mosaico" style="position:relative;width:${largura}px;height:${altura}px;overflow:hidden;border:1px solid #ccc;border-radius:4px;background:#eef1f4">
    ${imgs.join('\n    ')}
    <svg viewBox="0 0 ${largura} ${altura}" width="${largura}" height="${altura}" style="position:absolute;left:0;top:0">
      <polygon points="${poligonoPontos}" fill="#2980b9" fill-opacity="0.2" stroke="#ffd23f" stroke-width="2.5"/>
      <text x="${largura - 34}" y="22" font-size="13" font-weight="bold" fill="#fff" style="paint-order:stroke;stroke:#1a3050;stroke-width:3px">N ↑</text>
    </svg>
  </div>`
}
