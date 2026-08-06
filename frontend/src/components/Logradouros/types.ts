import type { Logradouro, LineStringGeoJSON } from '../../types/logradouro'

export type LogradouroFormData = {
  nome: string
  tipo: string
  bairros: string
  cep: string
  distrito: string
  leiNumero: string
  leiData: string
  leiLink: string
  situacao: string
  obs: string
  geom: LineStringGeoJSON | null
}

export const TIPO_LABEL: Record<string, string> = {
  rua: 'Rua',
  avenida: 'Avenida',
  travessa: 'Travessa',
  praca: 'Praça',
  rodovia: 'Rodovia',
  alameda: 'Alameda',
  outro: 'Outro',
}

export const SITUACAO_LABEL: Record<string, string> = {
  oficial: 'Oficial',
  provisorio: 'Provisório',
  sem_denominacao: 'Sem Denominação',
}

export function formVazio(): LogradouroFormData {
  return {
    nome: '',
    tipo: 'rua',
    bairros: '',
    cep: '',
    distrito: '',
    leiNumero: '',
    leiData: '',
    leiLink: '',
    situacao: 'sem_denominacao',
    obs: '',
    geom: null,
  }
}

export function logradouroParaForm(l: Logradouro): LogradouroFormData {
  return {
    nome: l.nome,
    tipo: l.tipo,
    bairros: l.bairros.join(', '),
    cep: l.cep ?? '',
    distrito: l.distrito ?? '',
    leiNumero: l.leiNumero ?? '',
    leiData: l.leiData ? l.leiData.slice(0, 10) : '',
    leiLink: l.leiLink ?? '',
    situacao: l.situacao,
    obs: l.obs ?? '',
    geom: l.geom,
  }
}
