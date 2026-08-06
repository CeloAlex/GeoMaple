export type LineStringGeoJSON = {
  type: 'LineString'
  coordinates: number[][]
}

export type Logradouro = {
  id: number
  nome: string
  tipo: string
  bairros: string[]
  cep: string | null
  distrito: string | null
  leiNumero: string | null
  leiData: string | null
  leiLink: string | null
  situacao: string
  obs: string | null
  ativo: boolean
  geom: LineStringGeoJSON | null
}

export type TipoCertidao = 'existencia_denominacao' | 'identificacao_logradouro'

export type Certidao = {
  id: number
  tipo: TipoCertidao
  ano: number
  seq: number
  numero: string
  codigoVerificacao: string
  logradouroId: number | null
  nomeConsultado: string | null
  emitidoPorId: number
  emitidoEm: string
  logradouro: { id: number; nome: string; tipo: string; situacao: string } | null
}
