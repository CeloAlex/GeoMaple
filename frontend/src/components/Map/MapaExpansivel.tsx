import { useEffect, type ReactNode } from 'react'
import { useMap } from 'react-leaflet'

type Props = {
  expandido: boolean
  onToggle: () => void
  children: ReactNode
  alturaNormal?: string
}

// Envolve um <MapContainer> com um botão que alterna entre o tamanho embutido normal e
// tela cheia (fixed inset-0, acima de todos os modais) — para dar uma experiência de
// edição de polígono mais parecida com Google Earth/QGIS nas telas pequenas do sistema
// (Wizard/Step3Geo.tsx, Quadras/QuadraForm.tsx, Provisorios/ProvisorioForm.tsx).
export function MapaExpansivel({ expandido, onToggle, children, alturaNormal = 'h-80' }: Props) {
  return (
    <div className={expandido ? 'fixed inset-0 z-3000 bg-white p-3' : `relative ${alturaNormal} w-full`}>
      <div className="relative h-full w-full overflow-hidden rounded border border-gray-300">
        {children}
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 bottom-2 z-1000 rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow hover:bg-gray-50"
          title={expandido ? 'Recolher mapa' : 'Expandir mapa em tela cheia para editar com mais precisão'}
        >
          {expandido ? '✕ Recolher mapa' : '⛶ Expandir mapa'}
        </button>
      </div>
    </div>
  )
}

// Chama map.invalidateSize() sempre que `watch` mudar — o Leaflet cacheia as dimensões do
// container internamente e não percebe sozinho quando o CSS do wrapper muda (ex.: alternar
// para tela cheia), o que deixaria o mapa cortado/mal desenhado até o próximo resize da
// janela. Precisa ser renderizado como filho do próprio <MapContainer> (usa useMap()).
export function InvalidateSizeAoMudar({ watch }: { watch: unknown }) {
  const map = useMap()
  useEffect(() => {
    const id = requestAnimationFrame(() => map.invalidateSize())
    return () => cancelAnimationFrame(id)
  }, [watch, map])
  return null
}
