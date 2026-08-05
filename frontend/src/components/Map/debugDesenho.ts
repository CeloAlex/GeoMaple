import L from 'leaflet'

// Instrumentação TEMPORÁRIA para diagnosticar o fechamento prematuro de polígonos
// relatado em produção. Loga no console (prefixo [GEOMAPLE-DEBUG]) cada evento de
// mouse/pointer/touch que chega no mapa durante o desenho, e cada chamada interna do
// leaflet-draw que pode levar ao fechamento da forma — com timestamp de alta precisão
// (para flagrar eventos duplicados/near-simultâneos) e o alvo DOM exato.
// Remover depois que a causa raiz real for identificada.

type DesenhoInstrumentavel = L.Draw.Polygon & {
  _markers?: unknown[]
  addVertex?: (...args: unknown[]) => unknown
  _finishShape?: (...args: unknown[]) => unknown
  completeShape?: (...args: unknown[]) => unknown
  _endPoint?: (...args: unknown[]) => unknown
  _onMouseDown?: (...args: unknown[]) => unknown
  _onMouseUp?: (...args: unknown[]) => unknown
  _updateFinishHandler?: (...args: unknown[]) => unknown
}

function ts() {
  return performance.now().toFixed(1).padStart(8, ' ')
}

function alvoInfo(e: Event) {
  const el = e.target as HTMLElement | null
  if (!el) return 'sem-alvo'
  const cls = (el.className || '').toString().slice(0, 60)
  return `<${el.tagName.toLowerCase()} class="${cls}">`
}

export function instrumentarDesenhoDebug(desenho: L.Draw.Polygon, map: L.Map, label: string) {
  const d = desenho as DesenhoInstrumentavel
  const prefixo = `[GEOMAPLE-DEBUG:${label}]`

  function wrap(nome: keyof DesenhoInstrumentavel) {
    const orig = d[nome] as ((...args: unknown[]) => unknown) | undefined
    if (typeof orig !== 'function') return
    ;(d[nome] as unknown) = function (this: DesenhoInstrumentavel, ...args: unknown[]) {
      console.log(`${prefixo} ${ts()}ms  ${String(nome)}() chamado — markers=${this._markers?.length ?? '?'}`)
      if (nome === '_finishShape' || nome === 'completeShape') {
        console.log(`${prefixo}   ^ FECHOU O POLÍGONO — stack:`, new Error().stack)
      }
      return orig.apply(this, args)
    }
  }
  ;(['addVertex', '_finishShape', 'completeShape', '_endPoint', '_onMouseDown', '_onMouseUp', '_updateFinishHandler'] as const).forEach(
    wrap,
  )

  const container = map.getContainer()
  const tipos = ['mousedown', 'mouseup', 'click', 'dblclick', 'pointerdown', 'pointerup', 'touchstart', 'touchend'] as const
  const ouvintes = tipos.map((tipo) => {
    const fn = (e: Event) => {
      console.log(`${prefixo} ${ts()}ms  DOM:${tipo} em ${alvoInfo(e)}`)
    }
    container.addEventListener(tipo, fn, true)
    return { tipo, fn }
  })

  function aoCriar(e: L.LeafletEvent) {
    const evento = e as L.DrawEvents.Created
    const coords = (evento.layer as L.Polygon).getLatLngs()
    const n = Array.isArray(coords[0]) ? (coords[0] as L.LatLng[]).length : 0
    console.log(`${prefixo} ${ts()}ms  === L.Draw.Event.CREATED disparado com ${n} vértices ===`)
    limpar()
  }
  map.on(L.Draw.Event.CREATED, aoCriar)

  function limpar() {
    ouvintes.forEach(({ tipo, fn }) => container.removeEventListener(tipo, fn, true))
    map.off(L.Draw.Event.CREATED, aoCriar)
  }

  console.log(`${prefixo} ${ts()}ms  instrumentação ativa — desenhe o polígono e observe o console`)
  return limpar
}
