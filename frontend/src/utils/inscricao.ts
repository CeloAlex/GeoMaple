// Inscrição cadastral: DI.SE.QU.LLLL-UUU (mesma regra do backend, src/utils/inscricao.ts)
export function montarInscricao(di: string, se: string, qu: string, lote: string, unidade: string) {
  return `${di}.${se}.${qu}.${lote}-${unidade}`
}

export function loteCompleto(di: string, se: string, qu: string, lote: string) {
  return di.length === 2 && se.length === 2 && qu.length === 3 && lote.length === 4
}

export function lotePrefixo(di: string, se: string, qu: string, lote: string) {
  return `${di}.${se}.${qu}.${lote}`
}

const INSC_REGEX = /^(\d{2})\.(\d{2})\.(\d{3})\.(\d{4})-(\d{3})$/

export function parseInscricao(insc: string) {
  const m = insc.match(INSC_REGEX)
  if (!m) return null
  const [, di, se, qu, lote, unidade] = m
  return { di, se, qu, lote, unidade, lotePrefixo: `${di}.${se}.${qu}.${lote}` }
}

// Verifica se um distrito/setor/quadra(/lote) está oculto pela árvore de camadas
// (Sidebar/ArvoreCadastros.tsx e ArvoreQuadras.tsx) — chaves no formato "di", "di.se",
// "di.se.qu" ou "di.se.qu.lote", ocultar um nível superior implicitamente oculta todos os
// seus filhos. `lote` é opcional pois a árvore de Quadras não tem esse nível.
export function ramoOculto(ramosOcultos: Set<string>, di: string, se: string, qu: string, lote?: string): boolean {
  return (
    ramosOcultos.has(di) ||
    ramosOcultos.has(`${di}.${se}`) ||
    ramosOcultos.has(`${di}.${se}.${qu}`) ||
    (lote != null && ramosOcultos.has(`${di}.${se}.${qu}.${lote}`))
  )
}

// Sugere a próxima unidade (UUU) livre dentro do mesmo lote, evitando colidir com o
// terreno pai e as UAs já cadastradas — mesma lógica do v10_newUA do protótipo.
export function sugerirProximaUnidade(inscPai: string, unidadesExistentes: string[]): string {
  const pai = parseInscricao(inscPai)
  if (!pai) return '001'

  const usados = new Set([pai.unidade, ...unidadesExistentes])
  let n = 1
  while (usados.has(String(n).padStart(3, '0'))) n++
  return String(n).padStart(3, '0')
}
