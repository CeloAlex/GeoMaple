// Material institucional de divulgação do GeoMaple, para envio a possíveis compradores do
// sistema — gerado em memória (mesmo padrão de exportarLogradouro.ts/exportarImovel.ts:
// window.open('', '_blank') + document.write + impressão pelo navegador), NÃO servido como
// arquivo estático: uma tentativa anterior em frontend/public/divulgacao/index.html nunca
// carregava em produção porque o Railway serve o frontend com `serve -s dist` (modo
// single-page-app) — qualquer caminho aninhado que não bata exatamente com um arquivo cai
// no fallback e serve a SPA inteira. Gerar o HTML em memória contorna esse problema por
// completo. Cabeçalho usa marca em texto (sem <img> do logo) para não depender de carregar
// uma imagem local dentro de uma janela about:blank recém-aberta.
export function imprimirMaterialDivulgacao() {
  const janela = window.open('', '_blank', 'width=900,height=1000')
  if (!janela) return

  janela.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>GeoMaple — Material de Divulgação</title>
<style>
  :root { --navy:#1a3050; --verde:#4a9c2a; --azul:#2980b9; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, 'Segoe UI', Roboto, sans-serif; color:#1f2933; background:#eef1f5; }
  .pagina { max-width:820px; margin:0 auto; background:#fff; padding:44px 52px; }
  header { border-bottom:3px solid var(--navy); padding-bottom:18px; margin-bottom:26px; }
  header .marca { font-size:26px; font-weight:800; color:var(--navy); letter-spacing:.2px; }
  header .marca span { color:var(--verde); }
  header p { margin:4px 0 0; color:#52606d; font-size:13px; }
  .chamada { font-size:16px; line-height:1.55; color:#334155; margin-bottom:28px; }
  .chamada strong { color:var(--navy); }
  h2.secao { color:var(--navy); font-size:14px; text-transform:uppercase; letter-spacing:.06em; border-left:4px solid var(--verde); padding-left:10px; margin:28px 0 14px; }
  .grade { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .card { border:1px solid #dde3ea; border-radius:8px; padding:14px 16px; background:#fafbfc; }
  .card .icone { font-size:20px; }
  .card h3 { margin:6px 0 6px; font-size:13.5px; color:var(--navy); }
  .card p { margin:0; font-size:12.5px; color:#52606d; line-height:1.5; }
  .faixa { margin-top:30px; background:var(--navy); color:#fff; border-radius:10px; padding:20px 24px; }
  .faixa h3 { margin:0 0 4px; font-size:15px; }
  .faixa p { margin:0; font-size:12.5px; color:#cbd5e1; }
  .rodape { margin-top:28px; padding-top:14px; border-top:1px solid #dde3ea; font-size:11px; color:#97a3b0; display:flex; justify-content:space-between; }
  .imprimir { max-width:820px; margin:14px auto 0; text-align:right; }
  .imprimir button { background:var(--azul); color:#fff; border:none; padding:9px 18px; border-radius:6px; font-size:13px; cursor:pointer; }
  .imprimir button:hover { opacity:.9; }
  @media print { body{background:#fff} .pagina{padding:0;max-width:none} .imprimir{display:none} }
  @media (max-width:680px) { .grade{grid-template-columns:1fr} .pagina{padding:26px 18px} }
</style></head>
<body>
  <div class="imprimir"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
  <div class="pagina">
    <header>
      <div class="marca">Geo<span>Maple</span></div>
      <p>Sistema de Gestão Cadastral Imobiliária Municipal (SGCIM)</p>
    </header>

    <p class="chamada">
      O <strong>GeoMaple</strong> reúne, num só lugar, o cadastro imobiliário do município e sua
      representação geográfica: imóveis, quadras e logradouros passam a existir simultaneamente como
      registro administrativo e como geometria no mapa — sempre em sincronia, sempre auditável.
    </p>

    <h2 class="secao">Funcionalidades principais</h2>
    <div class="grade">
      <div class="card">
        <div class="icone">🏠</div>
        <h3>Cadastro definitivo e delimitação provisória</h3>
        <p>Assistente guiado para cadastrar imóveis com dados cadastrais, geometria e situação (regular, em fiscalização, para revisão).</p>
      </div>
      <div class="card">
        <div class="icone">🗂️</div>
        <h3>Quadras e logradouros georreferenciados</h3>
        <p>Organização hierárquica por distrito, bairro e logradouro, com visibilidade individual de cada camada no mapa.</p>
      </div>
      <div class="card">
        <div class="icone">🛰️</div>
        <h3>Mapa integrado com camadas externas</h3>
        <p>Base de satélite e ruas, com catálogo GeoNetwork para adicionar camadas WMS de outras fontes oficiais.</p>
      </div>
      <div class="card">
        <div class="icone">📜</div>
        <h3>Certidões oficiais com QR Code</h3>
        <p>Emissão de certidão de denominação de logradouro com validação automática de homônimos e sobreposições, numeração sequencial anual e QR Code de verificação.</p>
      </div>
      <div class="card">
        <div class="icone">📊</div>
        <h3>Relatórios gerenciais</h3>
        <p>Mapa de localização de todos os imóveis de um proprietário e relatório de inconsistências entre área cadastral e georreferenciada.</p>
      </div>
      <div class="card">
        <div class="icone">🧲</div>
        <h3>Ajuste topológico assistido</h3>
        <p>Snap automático a vértices e arestas de lotes vizinhos, movendo vértices compartilhados junto — sem sobreposições nem falhas de encaixe.</p>
      </div>
      <div class="card">
        <div class="icone">🔍</div>
        <h3>Auditoria completa</h3>
        <p>Toda criação, edição e exclusão fica registrada — quem, quando e o que mudou — com histórico consultável a qualquer momento.</p>
      </div>
      <div class="card">
        <div class="icone">🌐</div>
        <h3>Integração SINTER/CADURB</h3>
        <p>Transmissão dos dados cadastrais para os sistemas federais de integração de registros territoriais.</p>
      </div>
    </div>

    <div class="faixa">
      <h3>Um cadastro. Um mapa. Uma única fonte da verdade.</h3>
      <p>Menos retrabalho, mais confiabilidade na gestão territorial do município.</p>
    </div>

    <div class="rodape">
      <span>GeoMaple — Sistema de Gestão Cadastral Imobiliária Municipal</span>
      <span>Material institucional</span>
    </div>
  </div>
</body></html>`)
  janela.document.close()
}
