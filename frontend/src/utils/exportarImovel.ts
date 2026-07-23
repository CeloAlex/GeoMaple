import type { ImovelFeature } from '../types/imovel'
import { USO_LABEL, STATUS_LABEL } from '../constants/imovel'
import { baixarArquivo, poligonoParaKML } from './download'

export function exportarImovelGeoJSON(feature: ImovelFeature) {
  const conteudo = JSON.stringify({ type: 'FeatureCollection', features: [feature] }, null, 2)
  baixarArquivo(`${feature.properties.insc}.geojson`, conteudo, 'application/geo+json')
}

export function exportarImovelKML(feature: ImovelFeature) {
  const kml = poligonoParaKML(feature.geometry.coordinates[0], feature.properties.insc, feature.properties.prop)
  baixarArquivo(`${feature.properties.insc}.kml`, kml, 'application/vnd.google-earth.kml+xml')
}

// Projeta o anel do polígono (lng/lat) em um SVG simples — não é uma imagem de satélite,
// só um esboço proporcional do formato do lote para a ficha impressa.
function svgPoligono(anel: number[][]): string {
  const lats = anel.map((c) => c[1])
  const lngs = anel.map((c) => c[0])
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const w = 320
  const h = 200
  const pad = 24
  const spanLng = maxLng - minLng || 1e-9
  const spanLat = maxLat - minLat || 1e-9
  const escala = Math.min((w - 2 * pad) / spanLng, (h - 2 * pad) / spanLat)

  const pontos = anel
    .map(([lng, lat]) => {
      const x = pad + (lng - minLng) * escala
      const y = h - pad - (lat - minLat) * escala
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="200" style="background:#eef1f4;border:1px solid #ccc;border-radius:4px">
    <polygon points="${pontos}" fill="#2980b9" fill-opacity="0.3" stroke="#2980b9" stroke-width="2"/>
    <text x="${w - 34}" y="22" font-size="13" font-weight="bold" fill="#1a3050">N ↑</text>
    <line x1="${w - 20}" y1="30" x2="${w - 20}" y2="15" stroke="#1a3050" stroke-width="1.5"/>
  </svg>`
}

export function imprimirFichaCadastral(feature: ImovelFeature, municipioNome: string, municipioUf: string) {
  const im = feature.properties
  const area = im.at_geo ?? im.at_cad
  const svg = svgPoligono(feature.geometry.coordinates[0])
  const janela = window.open('', '_blank', 'width=800,height=900')
  if (!janela) return

  janela.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>Ficha ${im.insc}</title>
<style>
  body{font-family:system-ui,sans-serif;padding:28px;color:#1a3050;max-width:640px;margin:0 auto}
  h1{font-size:19px;border-bottom:2px solid #1a3050;padding-bottom:8px;margin-bottom:2px}
  .sub{font-size:12px;color:#666;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  td{padding:7px 4px;border-bottom:1px solid #e5e5e5;font-size:13px}
  td.label{color:#666;width:44%}
  .rodape{margin-top:28px;font-size:11px;color:#888;border-top:1px solid #e5e5e5;padding-top:10px}
  @media print { body{padding:0} }
</style></head>
<body>
  <h1>Ficha Cadastral — ${im.insc}</h1>
  <p class="sub">${municipioNome}/${municipioUf} · SGCIM · Emitido em ${new Date().toLocaleString('pt-BR')}</p>
  ${svg}
  <table>
    <tr><td class="label">Proprietário</td><td>${im.prop}</td></tr>
    <tr><td class="label">Uso</td><td>${USO_LABEL[im.uso] ?? im.uso}</td></tr>
    <tr><td class="label">Status</td><td>${STATUS_LABEL[im.st] ?? im.st}</td></tr>
    <tr><td class="label">Área ${im.at_geo != null ? 'georreferenciada' : 'cadastral'}</td>
        <td>${area != null ? area.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' m²' : '—'}</td></tr>
    ${im.cib ? `<tr><td class="label">CIB</td><td>${im.cib}</td></tr>` : ''}
  </table>
  <p class="rodape">Documento gerado automaticamente pelo GeoMaple · SGCIM. Sem validade jurídica sem assinatura/carimbo oficial.</p>
  <script>window.onload = () => setTimeout(() => window.print(), 300)</script>
</body></html>`)
  janela.document.close()
}
