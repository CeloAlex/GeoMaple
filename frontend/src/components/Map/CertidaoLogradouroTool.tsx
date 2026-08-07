import { useEffect, useRef, useState } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-draw'
import { api } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { useMunicipioStore } from '../../store/municipioStore'
import type { Certidao } from '../../types/logradouro'
import { layerParaLinha } from './geoDrawUtils'
import { imprimirCertidaoDenominacao, type ResultadoValidacaoDenominacao } from '../../utils/exportarLogradouro'

function extrairErro(err: unknown, fallback: string) {
  return (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? fallback
}

type Fase = 'inativo' | 'desenhando' | 'nomeando' | 'emitindo'

type Props = {
  // Contador incrementado externamente (Relatórios → Certidões → Certidão de Denominação
  // de Logradouro) — mesmo padrão de ponte de AjusteTopologicoTool.tsx.
  iniciarEm?: number
  onErro?: (msg: string) => void
}

// Ferramenta independente do mapa principal (TESTE 7, item 4): desenha um eixo AVULSO
// (não salvo como Logradouro), pede o nome proposto no Projeto de Lei, roda as validações
// automáticas no backend e emite a Certidão de Denominação de Logradouro já impressa.
export function CertidaoLogradouroTool({ iniciarEm, onErro }: Props) {
  const map = useMap()
  const usuario = useAuthStore((s) => s.usuario)
  const municipio = useMunicipioStore((s) => s.municipio)
  const [fase, setFase] = useState<Fase>('inativo')
  const [nome, setNome] = useState('')

  const grupoRef = useRef(new L.FeatureGroup())
  const desenhoAtivoRef = useRef<L.Draw.Polyline | null>(null)
  const linhaRef = useRef<L.Polyline | null>(null)

  useEffect(() => {
    const grupo = grupoRef.current
    grupo.addTo(map)
    return () => {
      map.removeLayer(grupo)
    }
  }, [map])

  function limpar() {
    desenhoAtivoRef.current?.disable()
    desenhoAtivoRef.current = null
    grupoRef.current.clearLayers()
    linhaRef.current = null
    map.doubleClickZoom.enable()
  }

  function encerrar() {
    limpar()
    setFase('inativo')
    setNome('')
  }

  function iniciarDesenho() {
    limpar()
    // Desabilita o zoom por duplo-clique nativo do Leaflet — senão colide com o gesto de
    // "duplo-clique no último ponto" que o leaflet-draw usa para finalizar a linha (mesmo
    // cuidado já tomado em Regua.tsx).
    map.doubleClickZoom.disable()
    const desenho = new L.Draw.Polyline(map as unknown as L.DrawMap, {
      shapeOptions: { color: '#8e44ad', weight: 4 },
      showLength: true,
      metric: true,
    })
    desenhoAtivoRef.current = desenho
    desenho.enable()
    setFase('desenhando')
  }

  useEffect(() => {
    function aoCriar(e: L.LeafletEvent) {
      const evento = e as L.DrawEvents.Created
      if (evento.layerType !== 'polyline') return
      const layer = evento.layer as L.Polyline
      layer.setStyle({ color: '#8e44ad', weight: 4 })
      grupoRef.current.addLayer(layer)
      linhaRef.current = layer
      setFase('nomeando')
    }
    map.on(L.Draw.Event.CREATED, aoCriar)
    return () => {
      map.off(L.Draw.Event.CREATED, aoCriar)
    }
  }, [map])

  useEffect(() => {
    if (!iniciarEm) return
    iniciarDesenho()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iniciarEm])

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape' && fase !== 'inativo') encerrar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase])

  async function emitir() {
    const layer = linhaRef.current
    if (!layer || !nome.trim() || !usuario) return
    setFase('emitindo')
    try {
      const geom = layerParaLinha(layer)
      const { data: resultado } = await api.post<ResultadoValidacaoDenominacao>('/api/logradouros/verificar-denominacao', {
        nome: nome.trim(),
        geom,
      })
      const { data: certidao } = await api.post<Certidao>('/api/certidoes', {
        tipo: 'denominacao_logradouro',
        nomeConsultado: nome.trim(),
        resultadoValidacao: resultado,
      })
      await imprimirCertidaoDenominacao({
        certidao,
        nomeProposto: nome.trim(),
        geom,
        resultado,
        emitidoPorNome: usuario.nome,
        municipioNome: municipio.nome,
        municipioUf: municipio.uf,
      })
      encerrar()
    } catch (err) {
      onErro?.(extrairErro(err, 'Não foi possível emitir a certidão.'))
      setFase('nomeando')
    }
  }

  if (fase === 'inativo') return null

  return (
    <div className="absolute top-4 left-1/2 z-1001 flex -translate-x-1/2 items-center gap-2 rounded bg-white px-3 py-2 text-sm shadow-lg print:hidden">
      {fase === 'desenhando' && (
        <span className="text-navy">
          🖊️ Certidão de Denominação — desenhe o eixo da via (duplo-clique no último ponto para concluir; Esc cancela)
        </span>
      )}
      {(fase === 'nomeando' || fase === 'emitindo') && (
        <>
          <span className="text-navy">Nome proposto (Projeto de Lei):</span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Rua das Acácias"
            autoFocus
            className="w-56 rounded border border-gray-300 px-2 py-1 text-xs focus:border-navy focus:outline-none"
          />
          <button
            onClick={emitir}
            disabled={!nome.trim() || fase === 'emitindo'}
            className="shrink-0 rounded bg-verde px-3 py-1 text-xs font-medium text-white hover:bg-verde/90 disabled:opacity-60"
          >
            {fase === 'emitindo' ? 'Emitindo…' : '📄 Validar e emitir certidão'}
          </button>
          <button onClick={encerrar} className="shrink-0 rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50">
            Cancelar
          </button>
        </>
      )}
    </div>
  )
}
