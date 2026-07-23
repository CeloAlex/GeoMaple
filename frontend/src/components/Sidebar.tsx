import { useAuthStore } from '../store/authStore'
import { useMunicipioStore } from '../store/municipioStore'
import { Busca } from './Sidebar/Busca'
import { ArvoreHierarquica } from './Sidebar/ArvoreHierarquica'
import { Ferramentas } from './Sidebar/Ferramentas'
import type { ImovelFeatureCollection, ImovelRegistro } from '../types/imovel'
import type { CamadaImportada } from '../utils/importarGeo'

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
  recarregarArvoreEm?: number
  imoveisVisiveis: ImovelFeatureCollection
  camadasImportadas: CamadaImportada[]
  onImportar: (camada: CamadaImportada) => void
  onLimparImportadas: () => void
}

export function Sidebar({
  onNovoCadastro,
  onQuadras,
  onProvisorios,
  onOperadores,
  onAuditoria,
  onMinhaAtividade,
  onSelecionarImovel,
  recarregarArvoreEm,
  imoveisVisiveis,
  camadasImportadas,
  onImportar,
  onLimparImportadas,
}: Props) {
  const usuario = useAuthStore((s) => s.usuario)
  const logout = useAuthStore((s) => s.logout)
  const municipio = useMunicipioStore((s) => s.municipio)
  const podeEditar = usuario?.perm === 'admin' || usuario?.perm === 'editor'
  const ehAdmin = usuario?.perm === 'admin'

  return (
    <aside className="flex w-72 shrink-0 flex-col bg-navy text-white">
      <div className="border-b border-white/10 p-4">
        <h1 className="text-lg font-semibold">GeoMaple</h1>
        <p className="text-xs text-white/60">
          SGCIM · {municipio.nome}/{municipio.uf}
        </p>
      </div>

      <div className="border-b border-white/10 p-4">
        <Busca onSelecionar={onSelecionarImovel} />
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto p-4 text-sm text-white/70">
        {podeEditar && (
          <button
            onClick={onNovoCadastro}
            className="mb-2 w-full rounded bg-verde py-2 text-sm font-medium text-white transition hover:bg-verde/90"
          >
            + Novo Cadastro
          </button>
        )}
        <button
          onClick={onQuadras}
          className="mb-2 w-full rounded border border-ambar/60 py-2 text-sm font-medium text-ambar transition hover:bg-ambar/10"
        >
          🗺️ Quadras
        </button>
        <button
          onClick={onProvisorios}
          className="mb-4 w-full rounded border border-orange-500/60 py-2 text-sm font-medium text-orange-400 transition hover:bg-orange-500/10"
        >
          🚧 Provisórios
        </button>

        {ehAdmin && (
          <div className="mb-4 space-y-2 border-t border-white/10 pt-4">
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

        <div className="mb-4 border-t border-white/10 pt-4">
          <Ferramentas
            imoveisVisiveis={imoveisVisiveis}
            camadasImportadas={camadasImportadas}
            onImportar={onImportar}
            onLimparImportadas={onLimparImportadas}
          />
        </div>

        <p className="mb-2 text-xs font-semibold tracking-wide text-white/50 uppercase">Árvore hierárquica</p>
        <ArvoreHierarquica onSelecionar={onSelecionarImovel} recarregarEm={recarregarArvoreEm} />
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
