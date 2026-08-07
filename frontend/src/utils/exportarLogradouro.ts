import QRCode from 'qrcode'
import type { Certidao } from '../types/logradouro'
import { mosaicoSatelite } from './fichaMapa'
import { api } from '../api/client'
import { TIPO_LABEL, SITUACAO_LABEL } from '../components/Logradouros/types'

export type LogradouroResumo = {
  nome: string
  tipo: string
  situacao: string
  cep?: string | null
  leiNumero?: string | null
}

export type ResultadoValidacaoDenominacao = {
  homonimos: LogradouroResumo[]
  sobrepostos: LogradouroResumo[]
}

function paragrafoExistencia(nomeProposto: string, homonimos: LogradouroResumo[]) {
  if (homonimos.length === 0) {
    return `Certifico que não existe, no Cadastro Municipal de Logradouros, logradouro com a denominação “<strong>${nomeProposto}</strong>”, até a data de emissão desta certidão.`
  }
  const lista = homonimos.map((h) => `${TIPO_LABEL[h.tipo] ?? h.tipo} ${h.nome} (${SITUACAO_LABEL[h.situacao] ?? h.situacao})`).join('; ')
  return `Certifico que <strong>existe</strong>, no Cadastro Municipal de Logradouros, logradouro com denominação igual ou semelhante a “<strong>${nomeProposto}</strong>”: ${lista}.`
}

function paragrafoIdentificacao(sobrepostos: LogradouroResumo[]) {
  if (sobrepostos.length === 0) {
    return 'Certifico, ainda, que o logradouro indicado no croqui de localização não possui denominação conhecida.'
  }
  const oficiais = sobrepostos.filter((s) => s.situacao === 'oficial')
  if (oficiais.length > 0) {
    const lista = oficiais
      .map((o) => {
        const dados = [o.leiNumero ? `Lei nº ${o.leiNumero}` : null, o.cep ? `CEP ${o.cep}` : null].filter(Boolean)
        return dados.length > 0 ? `${o.nome} (${dados.join(', ')})` : o.nome
      })
      .join(', ')
    return `Certifico, ainda, que o logradouro indicado no croqui de localização <strong>possui denominação oficial conhecida</strong>: ${lista}.`
  }
  const lista = sobrepostos.map((s) => `${s.nome} (${SITUACAO_LABEL[s.situacao] ?? s.situacao})`).join(', ')
  return `Certifico, ainda, que o logradouro indicado no croqui de localização possui denominação <strong>não oficial</strong> conhecida: ${lista}.`
}

// Certidão de Denominação de Logradouro — unifica as antigas "Certidão de Existência de
// Denominação" e "Certidão de Identificação do Logradouro" num único documento, seguindo o
// modelo em test/certidão.jpeg: tabela de cabeçalho (brasão / prefeitura+secretaria+setor /
// número+emissão), título, dois parágrafos de certificação, croqui de localização, rodapé
// com responsável pela pesquisa + QR Code de verificação. Mesma convenção de impressão do
// resto do sistema (window.print()/"Salvar como PDF" do navegador, sem lib de PDF).
export async function imprimirCertidaoDenominacao(params: {
  certidao: Certidao
  nomeProposto: string
  geom: { coordinates: number[][] } | null
  resultado: ResultadoValidacaoDenominacao
  emitidoPorNome: string
  municipioNome: string
  municipioUf: string
}) {
  const { certidao, nomeProposto, geom, resultado, emitidoPorNome, municipioNome, municipioUf } = params

  const urlVerificacao = `${api.defaults.baseURL ?? ''}/api/certidoes/verificar/${certidao.codigoVerificacao}`
  const qrDataUrl = await QRCode.toDataURL(urlVerificacao, { width: 168, margin: 1 }).catch(() => null)

  const croqui = geom
    ? mosaicoSatelite(geom.coordinates)
    : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:12px">Eixo não desenhado</div>'

  const emissao = new Date(certidao.emitidoEm)

  const janela = window.open('', '_blank', 'width=850,height=1000')
  if (!janela) return

  janela.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>Certidão de Denominação de Logradouro ${certidao.numero}</title>
<style>
  body{font-family:system-ui,sans-serif;padding:28px;color:#1a3050;max-width:720px;margin:0 auto}
  table.cabecalho{width:100%;border-collapse:collapse;border:2px solid #1a3050;margin-bottom:20px}
  table.cabecalho td{border:1px solid #1a3050;padding:10px;vertical-align:middle}
  .brasao{width:110px;text-align:center;font-size:10px;color:#666;font-weight:600}
  .prefeitura{text-align:center}
  .prefeitura h2{font-size:16px;margin:0 0 4px;letter-spacing:.3px}
  .prefeitura p{font-size:11px;margin:1px 0;color:#444}
  .numero{width:150px;text-align:center;font-size:11px}
  .numero strong{display:block;font-size:13px;margin-bottom:6px}
  h1{font-size:19px;text-align:center;margin:18px 0 20px;letter-spacing:.3px}
  p.certifico{font-size:13px;line-height:1.6;margin:0 0 14px;text-align:justify}
  h3.croqui-titulo{font-size:12px;font-weight:700;letter-spacing:.3px;margin:18px 0 6px}
  .croqui-caixa{border:1px solid #1a3050;border-radius:4px;padding:6px;background:#eef1f4}
  table.rodape{width:100%;border-collapse:collapse;border:1px solid #1a3050;margin-top:22px}
  table.rodape td{border:1px solid #1a3050;padding:12px;vertical-align:top;font-size:11px}
  table.rodape td.resp{width:60%}
  table.rodape td.qr{width:40%;text-align:center}
  table.rodape .resp-titulo, table.rodape .qr-titulo{font-weight:700;letter-spacing:.3px;font-size:10.5px;margin-bottom:6px}
  table.rodape .resp-nome{font-weight:700;margin:4px 0 2px}
  table.rodape img{margin:4px 0}
  table.rodape .codigo{font-family:monospace;font-size:11px;font-weight:700;letter-spacing:.5px}
  @media print { body{padding:0} }
</style></head>
<body>
  <table class="cabecalho">
    <tr>
      <td class="brasao">ESPAÇO<br/>PARA<br/>BRASÃO</td>
      <td class="prefeitura">
        <h2>PREFEITURA MUNICIPAL DE ${municipioNome.toUpperCase()}/${municipioUf.toUpperCase()}</h2>
        <p>Secretaria Municipal / Órgão responsável</p>
        <p>Setor de Cadastro Territorial</p>
      </td>
      <td class="numero">
        <strong>CERTIDÃO Nº ${certidao.numero}</strong>
        Emissão: ${emissao.toLocaleDateString('pt-BR')}
      </td>
    </tr>
  </table>

  <h1>CERTIDÃO DE DENOMINAÇÃO DE LOGRADOURO</h1>

  <p class="certifico">${paragrafoExistencia(nomeProposto, resultado.homonimos)}</p>
  <p class="certifico">${paragrafoIdentificacao(resultado.sobrepostos)}</p>

  <h3 class="croqui-titulo">CROQUI DE LOCALIZAÇÃO</h3>
  <div class="croqui-caixa">${croqui}</div>

  <table class="rodape">
    <tr>
      <td class="resp">
        <div class="resp-titulo">RESPONSÁVEL PELA PESQUISA</div>
        <div class="resp-nome">${emitidoPorNome}</div>
        <div>Assinatura eletrônica: ${emissao.toLocaleString('pt-BR')}</div>
      </td>
      <td class="qr">
        <div class="qr-titulo">VERIFICAÇÃO DE AUTENTICIDADE</div>
        ${qrDataUrl ? `<img src="${qrDataUrl}" width="120" height="120" alt="QR Code de verificação" />` : ''}
        <div class="codigo">${certidao.codigoVerificacao}</div>
      </td>
    </tr>
  </table>

  <script>
    window.onload = async () => {
      let jaImprimiu = false
      function prontoParaImprimir() {
        return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      }
      const imprimir = async () => {
        if (jaImprimiu) return
        jaImprimiu = true
        await prontoParaImprimir()
        window.print()
      }
      const salvaguarda = setTimeout(imprimir, 12000)
      const imgs = Array.from(document.querySelectorAll('img'))
      await Promise.all(
        imgs.map((img) =>
          img.decode
            ? img.decode().catch(() => {})
            : new Promise((resolve) => {
                if (img.complete) return resolve()
                img.addEventListener('load', resolve)
                img.addEventListener('error', resolve)
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
