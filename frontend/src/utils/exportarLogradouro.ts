import type { Certidao } from '../types/logradouro'
import { mosaicoSatelite } from './fichaMapa'
import { TIPO_LABEL, SITUACAO_LABEL } from '../components/Logradouros/types'

const TITULO_CERTIDAO: Record<Certidao['tipo'], string> = {
  existencia_denominacao: 'Certidão de Existência de Denominação',
  identificacao_logradouro: 'Certidão de Identificação do Logradouro',
}

// Molde de utils/exportarImovel.ts's imprimirFichaCadastral — mesma convenção de
// impressão via window.print()/"Salvar como PDF" do navegador (sem biblioteca de PDF no
// servidor), agora com numeração sequencial e código de verificação emitidos pelo backend.
function imprimirCertidao(params: {
  certidao: Certidao
  nomeExibido: string
  linhasExtras: [string, string][]
  croqui: string
  municipioNome: string
  municipioUf: string
}) {
  const { certidao, nomeExibido, linhasExtras, croqui, municipioNome, municipioUf } = params
  const titulo = TITULO_CERTIDAO[certidao.tipo]

  const linhasHtml = linhasExtras.map(([label, valor]) => `<tr><td class="label">${label}</td><td>${valor}</td></tr>`).join('\n')

  const janela = window.open('', '_blank', 'width=800,height=900')
  if (!janela) return

  janela.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>${titulo} ${certidao.numero}</title>
<style>
  body{font-family:system-ui,sans-serif;padding:28px;color:#1a3050;max-width:640px;margin:0 auto}
  h1{font-size:18px;border-bottom:2px solid #1a3050;padding-bottom:8px;margin-bottom:2px}
  .sub{font-size:12px;color:#666;margin-bottom:16px}
  .numero{font-size:13px;font-weight:600;color:#1a3050}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  td{padding:7px 4px;border-bottom:1px solid #e5e5e5;font-size:13px}
  td.label{color:#666;width:44%}
  .codigo{margin-top:20px;padding:10px;background:#f4f6f8;border-radius:6px;font-size:12px;text-align:center}
  .codigo .valor{font-family:monospace;font-size:15px;font-weight:700;letter-spacing:1px;color:#1a3050}
  .rodape{margin-top:20px;font-size:11px;color:#888;border-top:1px solid #e5e5e5;padding-top:10px}
  @media print { body{padding:0} }
</style></head>
<body>
  <h1>${titulo}</h1>
  <p class="sub">${municipioNome}/${municipioUf} · SGCIM · Emitida em ${new Date(certidao.emitidoEm).toLocaleString('pt-BR')}</p>
  <p class="numero">Certidão nº ${certidao.numero}</p>
  ${croqui}
  <table>
    <tr><td class="label">Nome consultado</td><td>${nomeExibido}</td></tr>
    ${linhasHtml}
  </table>
  <div class="codigo">
    Código de verificação<br/>
    <span class="valor">${certidao.codigoVerificacao}</span><br/>
    Consulte a autenticidade deste documento em GeoMaple &gt; Verificar Certidão, informando o código acima.
  </div>
  <p class="rodape">Documento gerado automaticamente pelo GeoMaple · SGCIM. Sem validade jurídica sem assinatura/carimbo oficial.</p>
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
      const imgs = Array.from(document.querySelectorAll('.mosaico img'))
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

// Certidão de Existência de Denominação: verifica se já existe logradouro cadastrado com
// o nome sugerido — sem geometria própria (não parte de um lote no mapa), o croqui mostra
// a localização de qualquer homônimo encontrado, se houver.
export function imprimirCertidaoExistencia(
  certidao: Certidao,
  nomeConsultado: string,
  homonimos: { insc?: string; nome: string; tipo: string; situacao: string }[],
  municipioNome: string,
  municipioUf: string,
) {
  const linhasExtras: [string, string][] = [
    [
      'Resultado',
      homonimos.length > 0
        ? `⚠️ Encontrado(s) ${homonimos.length} logradouro(s) com nome igual ou semelhante`
        : '✅ Nenhum logradouro cadastrado com este nome',
    ],
  ]
  homonimos.forEach((h, i) => {
    linhasExtras.push([`Homônimo ${i + 1}`, `${TIPO_LABEL[h.tipo] ?? h.tipo} ${h.nome} — ${SITUACAO_LABEL[h.situacao] ?? h.situacao}`])
  })

  imprimirCertidao({
    certidao,
    nomeExibido: nomeConsultado,
    linhasExtras,
    croqui: '',
    municipioNome,
    municipioUf,
  })
}

// Certidão de Identificação do Logradouro: confirma se a via selecionada no mapa já possui
// denominação oficial ou reconhecida pela comunidade — inclui o croqui de localização do
// eixo desenhado.
export function imprimirCertidaoIdentificacao(
  certidao: Certidao,
  logradouro: { nome: string; tipo: string; situacao: string; geom: { coordinates: number[][] } | null },
  municipioNome: string,
  municipioUf: string,
) {
  const croqui = logradouro.geom ? mosaicoSatelite(logradouro.geom.coordinates) : ''
  const linhasExtras: [string, string][] = [
    ['Tipo', TIPO_LABEL[logradouro.tipo] ?? logradouro.tipo],
    ['Situação', SITUACAO_LABEL[logradouro.situacao] ?? logradouro.situacao],
  ]

  imprimirCertidao({
    certidao,
    nomeExibido: logradouro.nome,
    linhasExtras,
    croqui,
    municipioNome,
    municipioUf,
  })
}
