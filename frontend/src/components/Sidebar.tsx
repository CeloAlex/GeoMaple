import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useMunicipioStore } from '../store/municipioStore'
import { Busca } from './Sidebar/Busca'
import { ArvoreCadastros } from './Sidebar/ArvoreCadastros'
import { ArvoreQuadras } from './Sidebar/ArvoreQuadras'
import { Ferramentas, type DestinoImportacao } from './Sidebar/Ferramentas'
import type { ImovelFeatureCollection, ImovelRegistro } from '../types/imovel'
import type { Quadra } from '../types/quadra'
import type { CamadaImportada } from '../utils/importarGeo'
import type { CamadaWms, Destino } from './Map/MapView'

const PERFIL_LABEL: Record<string, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Leitor',
}

type Props = {
  onNovoCadastro: () => void
  onQuadras: () => void
  onProvisorios: () => void
  onOperadores: () => void
  onAuditoria: () => void
  onMinhaAtividade: () => void
  onSelecionarImovel: (imovel: ImovelRegistro) => void
  onSelecionarQuadra: (quadra: Quadra) => void
  onBuscarEndereco: (destino: Destino, rotulo: string) => void
  recarregarArvoreEm?: number
  imoveisVisiveis: ImovelFeatureCollection
  camadasImportadas: CamadaImportada[]
  onImportar: (camada: CamadaImportada) => void
  onLimparImportadas: () => void
  camadasWms: CamadaWms[]
  onAdicionarWms: (camada: CamadaWms) => void
  onRemoverWms: (id: string) => void
  abrirFormularioWmsEm?: number
  onErro?: (msg: string) => void
  ramosOcultosCadastros: Set<string>
  onAlternarRamoCadastros: (chave: string) => void
  ramosOcultosQuadras: Set<string>
  onAlternarRamoQuadras: (chave: string) => void
  onEscolherDestinoImportacao?: (camada: CamadaImportada, destino: DestinoImportacao) => void
}

export function Sidebar({
  onNovoCadastro,
  onQuadras,
  onProvisorios,
  onOperadores,
  onAuditoria,
  onMinhaAtividade,
  onSelecionarImovel,
  onSelecionarQuadra,
  onBuscarEndereco,
  recarregarArvoreEm,
  imoveisVisiveis,
  camadasImportadas,
  onImportar,
  onLimparImportadas,
  camadasWms,
  onAdicionarWms,
  onRemoverWms,
  abrirFormularioWmsEm,
  onErro,
  ramosOcultosCadastros,
  onAlternarRamoCadastros,
  ramosOcultosQuadras,
  onAlternarRamoQuadras,
  onEscolherDestinoImportacao,
}: Props) {
  const usuario = useAuthStore((s) => s.usuario)
  const logout = useAuthStore((s) => s.logout)
  const municipio = useMunicipioStore((s) => s.municipio)
  const podeEditar = usuario?.perm === 'admin' || usuario?.perm === 'editor'
  const ehAdmin = usuario?.perm === 'admin'
  const [acoesAbertas, setAcoesAbertas] = useState(false)

  return (
    <aside className="flex w-72 shrink-0 flex-col bg-navy text-white print:hidden">
      <div className="border-b border-white/10 p-4">
        <h1 className="text-lg font-semibold">GeoMaple</h1>
        <p className="text-xs text-white/60">
          SGCIM · {municipio.nome}/{municipio.uf}
        </p>
      </div>

      <div className="border-b border-white/10 p-4">
        <Busca onSelecionar={onSelecionarImovel} onBuscarEndereco={onBuscarEndereco} />
      </div>

      {/* Duas árvores de camadas independentes (Cadastros Definitivos e Quadras) são o
          elemento principal da barra lateral, ocupando a maior parte do espaço — estilo
          Google Earth. Os botões de ação ficam recolhidos por padrão em "Ações", uma área
          secundária que não compete visualmente com as árvores. */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col overflow-y-auto px-4 pt-3 pb-2 text-sm text-white/70">
          <p className="mb-2 text-xs font-semibold tracking-wide text-white/50 uppercase">Cadastros Definitivos</p>
          <ArvoreCadastros
            onSelecionarImovel={onSelecionarImovel}
            recarregarEm={recarregarArvoreEm}
            ramosOcultos={ramosOcultosCadastros}
            onAlternarRamo={onAlternarRamoCadastros}
          />
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto border-t border-white/10 px-4 pt-3 pb-2 text-sm text-white/70">
          <p className="mb-2 text-xs font-semibold tracking-wide text-white/50 uppercase">Quadras</p>
          <ArvoreQuadras
            onSelecionarQuadra={onSelecionarQuadra}
            recarregarEm={recarregarArvoreEm}
            ramosOcultos={ramosOcultosQuadras}
            onAlternarRamo={onAlternarRamoQuadras}
          />
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10">
        <button
          onClick={() => setAcoesAbertas((a) => !a)}
          className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold tracking-wide text-white/60 uppercase hover:bg-white/5"
        >
          <span>☰ Ações</span>
          <span>{acoesAbertas ? '▲' : '▼'}</span>
        </button>

        {acoesAbertas && (
          <div className="max-h-[50vh] space-y-4 overflow-y-auto px-4 pb-4 text-sm text-white/70">
            <div className="space-y-2">
              {podeEditar && (
                <button
                  onClick={onNovoCadastro}
                  className="w-full rounded bg-verde py-2 text-sm font-medium text-white transition hover:bg-verde/90"
                >
                  + Novo Cadastro
                </button>
              )}
              <button
                onClick={onQuadras}
                className="w-full rounded border border-ambar/60 py-2 text-sm font-medium text-ambar transition hover:bg-ambar/10"
              >
                🗺️ Quadras
              </button>
              <button
                onClick={onProvisorios}
                className="w-full rounded border border-orange-500/60 py-2 text-sm font-medium text-orange-400 transition hover:bg-orange-500/10"
              >
                🚧 Provisórios
              </button>
            </div>

            <Ferramentas
              imoveisVisiveis={imoveisVisiveis}
              camadasImportadas={camadasImportadas}
              onImportar={onImportar}
              onLimparImportadas={onLimparImportadas}
              camadasWms={camadasWms}
              onAdicionarWms={onAdicionarWms}
              onRemoverWms={onRemoverWms}
              abrirFormularioEm={abrirFormularioWmsEm}
              onErro={onErro}
              onEscolherDestinoImportacao={onEscolherDestinoImportacao}
            />

            {ehAdmin && (
              <div className="space-y-2 border-t border-white/10 pt-4">
                <p className="text-xs font-semibold tracking-wide text-white/50 uppercase">Administração</p>
                <button
                  onClick={onOperadores}
                  className="w-full rounded border border-white/20 py-1.5 text-xs text-white/80 hover:bg-white/10"
                >
                  👤 Operadores
                </button>
                <button
                  onClick={onAuditoria}
                  className="w-full rounded border border-white/20 py-1.5 text-xs text-white/80 hover:bg-white/10"
                >
                  📜 Auditoria
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-white/10 p-4 text-sm">
        <p className="font-medium">{usuario?.nome}</p>
        <p className="text-xs text-white/60">{usuario ? (PERFIL_LABEL[usuario.perm] ?? usuario.perm) : ''}</p>
        <button
          onClick={onMinhaAtividade}
          className="mt-3 w-full rounded border border-white/20 py-1.5 text-xs transition hover:bg-white/10"
        >
          🕒 Minha atividade
        </button>
        <button
          onClick={logout}
          className="mt-2 w-full rounded border border-white/20 py-1.5 text-xs transition hover:bg-white/10"
        >
          Sair
        </button>
      </div>
    </aside>
  )
}
