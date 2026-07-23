// Inscrição cadastral: DD.SS.QQQ.LLLL-UUU (seção 8.1 do PROMPT_GEOMAPLE_MVP.md)
const INSC_REGEX = /^(\d{2})\.(\d{2})\.(\d{3})\.(\d{4})-(\d{3})$/

export function validarInscricao(insc: string): boolean {
  return INSC_REGEX.test(insc)
}

export function parseInscricao(insc: string) {
  const match = insc.match(INSC_REGEX)
  if (!match) return null
  const [, di, se, qu, lote, unidade] = match
  return { di, se, qu, lote, unidade, lotePrefixo: `${di}.${se}.${qu}.${lote}` }
}

// Prefixo DD.SS.QQQ.LLLL (sem unidade) — identifica o lote físico/terreno
export function loteFisico(insc: string): string | null {
  const parsed = parseInscricao(insc)
  return parsed ? parsed.lotePrefixo : null
}

// Constrói o prefixo de busca a partir de filtros parciais (di, se, qu)
export function prefixoBusca(filtros: { di?: string; se?: string; qu?: string }): string | null {
  const { di, se, qu } = filtros
  if (qu) return di && se ? `${di}.${se}.${qu}.` : null
  if (se) return di ? `${di}.${se}.` : null
  if (di) return `${di}.`
  return null
}
