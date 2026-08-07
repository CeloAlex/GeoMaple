import { criarGrupos } from '../Toolbar'
import type { AcoesShell } from '../shell/AcoesShell'

type Props = {
  onClose: () => void
}

// Stub de AcoesShell só para extrair ícone/nome/descrição de criarGrupos() — nenhuma
// dessas funções é chamada de fato, o Manual apenas lista os botões, não os aciona.
// Assim, qualquer botão novo adicionado à Toolbar aparece aqui automaticamente, bastando
// preencher o campo `descricao`.
const acoesStub: AcoesShell = new Proxy({} as AcoesShell, { get: () => () => {} })

// Seções de prosa abaixo (visão geral, padronização) devem ser revisadas a cada mudança
// relevante no sistema — não são geradas automaticamente como a lista de ícones.
export function ManualSistema({ onClose }: Props) {
  const grupos = criarGrupos(acoesStub)
  const botoes = grupos.flat()

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-base font-semibold text-navy">📖 Manual do Sistema</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-lg text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <section className="mb-6">
            <h3 className="mb-2 text-sm font-semibold text-navy">Visão geral</h3>
            <p className="text-sm text-gray-700">
              O GeoMaple (SGCIM) é o sistema de gestão do Cadastro Imobiliário Municipal: permite cadastrar imóveis
              (definitivos e delimitações provisórias), quadras e logradouros georreferenciados, emitir certidões,
              gerar relatórios e manter o histórico de alterações via auditoria. O painel lateral concentra a busca e
              as árvores de cadastros/quadras/logradouros; o mapa central concentra o desenho e a visualização das
              geometrias; a barra de ferramentas e o menu superior concentram as ações disponíveis.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 text-sm font-semibold text-navy">Ícones da barra de ferramentas</h3>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                  <th className="w-10 py-1.5">Ícone</th>
                  <th className="w-56 py-1.5">Nome</th>
                  <th className="py-1.5">Função</th>
                </tr>
              </thead>
              <tbody>
                {botoes.map((b) => (
                  <tr key={b.dica} className="border-b border-gray-100">
                    <td className="py-1.5 text-base">{b.icone}</td>
                    <td className="py-1.5 font-medium text-gray-800">{b.dica}</td>
                    <td className="py-1.5 text-gray-600">{b.descricao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 text-sm font-semibold text-navy">Padronização de informações</h3>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-gray-700">
              <li>
                <span className="font-medium">Inscrição imobiliária:</span> formato <code>UA.QUADRA.LOTE-FRAÇÃO</code>{' '}
                (ex.: <code>03.01.050.0010-001</code>), onde UA é a Unidade Administrativa (distrito/setor fiscal).
              </li>
              <li>
                <span className="font-medium">Endereço:</span> logradouro cadastrado previamente em Logradouros,
                seguido de número e complemento; ao vincular um imóvel a um logradouro sem denominação oficial, o
                sistema alerta na certidão de denominação.
              </li>
              <li>
                <span className="font-medium">Quadras/Delimitações Provisórias:</span> situação pode ser Regular, Em
                fiscalização ou Para revisão — controla a cor de exibição no mapa e os filtros da barra lateral.
              </li>
              <li>
                <span className="font-medium">Logradouros:</span> organizados na árvore lateral por Distrito &gt;
                Bairro &gt; Logradouro; um logradouro que abrange mais de um bairro aparece uma vez em cada bairro.
              </li>
              <li>
                <span className="font-medium">Inconsistência de área:</span> um imóvel é sinalizado quando a
                diferença entre área georreferenciada e área cadastral ultrapassa 10%, salvo dispensa expressa
                registrada na ficha do imóvel.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
