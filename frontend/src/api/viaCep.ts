export type EnderecoViaCep = {
  logradouro: string
  bairro: string
  localidade: string
  uf: string
}

// ViaCEP é um serviço público sem necessidade de autenticação (usado no protótipo SGCIM_v10.html)
export async function buscarCep(cep: string): Promise<EnderecoViaCep | null> {
  const digitos = cep.replace(/\D/g, '')
  if (digitos.length !== 8) throw new Error('CEP deve ter 8 dígitos')

  const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`)
  const dados = await resposta.json()
  if (dados.erro) return null

  return {
    logradouro: dados.logradouro ?? '',
    bairro: dados.bairro ?? '',
    localidade: dados.localidade ?? '',
    uf: dados.uf ?? '',
  }
}

export function mascararCep(valor: string) {
  const digitos = valor.replace(/\D/g, '').slice(0, 8)
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos
}
