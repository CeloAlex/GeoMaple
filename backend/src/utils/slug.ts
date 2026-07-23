const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g')

function slugify(texto: string): string {
  return texto.normalize('NFD').replace(DIACRITICOS, '').toLowerCase().trim()
}

export function gerarLoginSugerido(nome: string): string {
  const partes = slugify(nome)
    .split(/\s+/)
    .map((p) => p.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean)

  if (partes.length === 0) return 'operador'
  if (partes.length === 1) return partes[0]
  return `${partes[0]}.${partes[partes.length - 1]}`
}
