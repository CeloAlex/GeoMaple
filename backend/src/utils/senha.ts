import { randomInt } from 'crypto'

// Sem caracteres ambíguos (0/O, 1/l/I)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

export function gerarSenhaTemporaria(tamanho = 12): string {
  let senha = ''
  for (let i = 0; i < tamanho; i++) {
    senha += CHARS[randomInt(CHARS.length)]
  }
  return senha
}
