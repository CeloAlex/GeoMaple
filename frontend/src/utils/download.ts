export function baixarBlob(nome: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function baixarArquivo(nome: string, conteudo: string, tipo: string) {
  baixarBlob(nome, new Blob([conteudo], { type: tipo }))
}

function escaparXml(texto: string) {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function poligonoParaKML(coordenadas: number[][], nome: string, descricao: string) {
  const anel = coordenadas.map(([lng, lat]) => `${lng},${lat},0`).join(' ')
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark>
<name>${escaparXml(nome)}</name>
<description>${escaparXml(descricao)}</description>
<Polygon><outerBoundaryIs><LinearRing><coordinates>${anel}</coordinates></LinearRing></outerBoundaryIs></Polygon>
</Placemark></Document></kml>`
}

function csvEscape(valor: string | number | null | undefined) {
  const s = valor == null ? '' : String(valor)
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function linhasParaCSV(cabecalho: string[], linhas: (string | number | null | undefined)[][]) {
  return [cabecalho.join(';'), ...linhas.map((l) => l.map(csvEscape).join(';'))].join('\r\n')
}
