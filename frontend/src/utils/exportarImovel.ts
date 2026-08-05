import type { ImovelFeature, ImovelSelecionado } from '../types/imovel'
import { USO_LABEL, STATUS_LABEL } from '../constants/imovel'
import { CADURB_TIPO_LABEL, TP_ARQ_LABEL, DEST_LABEL, PADRAO_LABEL } from '../components/Wizard/types'
import { baixarArquivo, poligonoParaKML } from './download'
import { mosaicoSatelite } from './fichaMapa'

export function exportarImovelGeoJSON(feature: ImovelFeature) {
  const conteudo = JSON.stringify({ type: 'FeatureCollection', features: [feature] }, null, 2)
  baixarArquivo(`${feature.properties.insc}.geojson`, conteudo, 'application/geo+json')
}

export function exportarImovelKML(feature: ImovelFeature) {
  const kml = poligonoParaKML(feature.geometry.coordinates[0], feature.properties.insc, feature.properties.prop)
  baixarArquivo(`${feature.properties.insc}.kml`, kml, 'application/vnd.google-earth.kml+xml')
}

const AVISO_INCONSISTENCIA_FICHA =
  'Inconsistência de áreas: diferença superior a 10% entre a área cadastral e a área georreferenciada.'

function formatarAreaM2(m2: number) {
  return m2.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' m²'
}

// Mesma fórmula usada em DetailPanel.tsx/Wizard/Step4Cadastrais.tsx.
function inconsistente(cad: number | null, geo: number | null, avisoOk: boolean) {
  if (cad == null || geo == null || cad === 0 || avisoOk) return false
  return Math.abs(((geo - cad) / cad) * 100) > 10
}

export function imprimirFichaCadastral(feature: ImovelSelecionado, municipioNome: string, municipioUf: string) {
  const im = feature.properties
  const mapa = mosaicoSatelite(feature.geometry.coordinates[0])

  const linhasArea: string[] = []
  if (im.at_cad != null) linhasArea.push(`<tr><td class="label">Área do Terreno Cadastral</td><td>${formatarAreaM2(im.at_cad)}</td></tr>`)
  if (im.at_geo != null) linhasArea.push(`<tr><td class="label">Área do Terreno Georreferenciada</td><td>${formatarAreaM2(im.at_geo)}</td></tr>`)
  if (inconsistente(im.at_cad, im.at_geo, im.at_aviso_ok)) {
    linhasArea.push(`<tr><td colspan="2" style="color:#b45309;font-size:12px">⚠️ ${AVISO_INCONSISTENCIA_FICHA}</td></tr>`)
  }
  const temEdificacao = im.ac_cad != null || im.ac_geo != null || feature.properties.geom_bld != null
  if (temEdificacao && im.ac_cad != null) linhasArea.push(`<tr><td class="label">Área Construída Cadastral</td><td>${formatarAreaM2(im.ac_cad)}</td></tr>`)
  if (temEdificacao && im.ac_geo != null) linhasArea.push(`<tr><td class="label">Área Construída Georreferenciada</td><td>${formatarAreaM2(im.ac_geo)}</td></tr>`)
  if (temEdificacao && inconsistente(im.ac_cad, im.ac_geo, im.ac_aviso_ok)) {
    linhasArea.push(`<tr><td colspan="2" style="color:#b45309;font-size:12px">⚠️ ${AVISO_INCONSISTENCIA_FICHA}</td></tr>`)
  }
  const linhasAreaHtml = linhasArea.join('\n')

  // Todos os campos cadastrados, além do resumo (proprietário/uso/status/área/CIB) já
  // exibido acima — mesmo conjunto de campos extras mostrado em DetailPanel.tsx.
  const linhasExtras: [string, string][] = []
  if (im.log || im.nr) linhasExtras.push(['Endereço', `${im.log ?? ''}${im.nr ? ', ' + im.nr : ''}`])
  if (im.bai) linhasExtras.push(['Bairro', im.bai])
  if (im.cep) linhasExtras.push(['CEP', im.cep])
  if (im.tp) linhasExtras.push(['Tipo', im.tp])
  if (im.num_pav != null) linhasExtras.push(['Nº de pavimentos', String(im.num_pav)])
  if (im.frac_ideal) linhasExtras.push(['Fração ideal', im.frac_ideal])
  if (im.cadurb_tipo != null) linhasExtras.push(['Tipo imóvel CADURB', CADURB_TIPO_LABEL[String(im.cadurb_tipo)] ?? String(im.cadurb_tipo)])
  if (im.tp_arq != null) linhasExtras.push(['Tipo arquitetônico', TP_ARQ_LABEL[String(im.tp_arq)] ?? String(im.tp_arq)])
  if (im.dest != null) linhasExtras.push(['Destinação', DEST_LABEL[String(im.dest)] ?? String(im.dest)])
  if (im.padrao != null) linhasExtras.push(['Padrão construtivo', PADRAO_LABEL[String(im.padrao)] ?? String(im.padrao)])
  if (im.ano_constr != null) linhasExtras.push(['Ano de construção', String(im.ano_constr)])
  if (im.valor_venal != null) linhasExtras.push(['Valor venal', im.valor_venal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })])
  if (im.obs) linhasExtras.push(['Observações', im.obs])
  const linhasExtrasHtml = linhasExtras
    .map(([label, valor]) => `<tr><td class="label">${label}</td><td>${valor}</td></tr>`)
    .join('\n')

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
  ${mapa}
  <table>
    <tr><td class="label">Proprietário</td><td>${im.prop}</td></tr>
    <tr><td class="label">Uso</td><td>${USO_LABEL[im.uso] ?? im.uso}</td></tr>
    <tr><td class="label">Status</td><td>${STATUS_LABEL[im.st] ?? im.st}</td></tr>
    ${linhasAreaHtml}
    ${im.cib ? `<tr><td class="label">CIB</td><td>${im.cib}</td></tr>` : ''}
    ${linhasExtrasHtml}
  </table>
  <p id="aviso-tiles" class="rodape" style="display:none;color:#b45309"></p>
  <p class="rodape">Documento gerado automaticamente pelo GeoMaple · SGCIM. Sem validade jurídica sem assinatura/carimbo oficial.</p>
  <script>
    window.onload = async () => {
      let jaImprimiu = false
      let falhas = 0

      function avisarSeHouveFalha() {
        if (falhas === 0) return
        console.warn('Ficha cadastral: ' + falhas + ' tile(s) de satélite não carregaram corretamente.')
        const aviso = document.getElementById('aviso-tiles')
        if (aviso) {
          aviso.textContent = '⚠ Algumas imagens de fundo (satélite) podem não ter carregado — verifique a conexão e reimprima se necessário.'
          aviso.style.display = 'block'
        }
      }

      // decode() garante que os pixels já foram decodificados (não só que os bytes
      // chegaram, como o evento 'load' garantiria) — depois disso, esperar dois frames de
      // requestAnimationFrame garante que o compositor já pintou pelo menos um frame
      // completo antes do print, evitando capturar um estado incompleto (o gargalo real
      // por trás da ficha às vezes imprimir sem a imagem de fundo).
      function prontoParaImprimir() {
        return new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(resolve))
        })
      }

      const imprimir = async () => {
        if (jaImprimiu) return
        jaImprimiu = true
        avisarSeHouveFalha()
        await prontoParaImprimir()
        window.print()
      }

      // Salvaguarda: imprime mesmo se algum tile nunca responder (Esri é um serviço
      // público, sem SLA — 12s dá margem para conexões mais lentas antes de desistir).
      const salvaguarda = setTimeout(imprimir, 12000)

      const imgs = Array.from(document.querySelectorAll('.mosaico img'))
      await Promise.all(
        imgs.map((img) =>
          img.decode
            ? img.decode().catch(() => { falhas++ })
            : new Promise((resolve) => {
                if (img.complete) return resolve()
                img.addEventListener('load', resolve)
                img.addEventListener('error', () => { falhas++; resolve() })
              })
        )
      )
      clearTimeout(salvaguarda)
      imprimir()
    }
  </script>
</body></html>`)
  janela.document.close()
}
