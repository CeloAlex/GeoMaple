// Integração com a API de Unidades Imobiliárias (UI) do Módulo Urbano do SINTER (SERPRO/RFB).
// CONFIDENCIAL — não logar payload completo, CPF/CNPJ de titular ou credenciais.
// Consulte a seção 13 do PROMPT_GEOMAPLE_MVP.md (uso interno) para as regras completas.
import type { Imovel } from '@prisma/client'
import { prisma } from '../db'
import { AppError } from '../utils/errors'
import { registrarAuditoria } from './auditService'
import { municipio } from '../config/municipio'

const CLIENT_ID = process.env.SINTER_CLIENT_ID
const CLIENT_SECRET = process.env.SINTER_CLIENT_SECRET
const BASE_URL = process.env.SINTER_BASE_URL

export function sinterConfigurado(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET && BASE_URL)
}

// ── Token OAuth (client_credentials), com cache e renovação automática ──
let tokenCache: { token: string; expiraEm: number } | null = null

async function obterToken(forcarRenovacao = false): Promise<string> {
  if (!sinterConfigurado()) {
    throw new AppError(503, 'Integração SINTER não configurada nesta implantação (SINTER_CLIENT_ID/SECRET/BASE_URL)')
  }

  const agora = Date.now()
  if (!forcarRenovacao && tokenCache && agora < tokenCache.expiraEm - 5000) {
    return tokenCache.token
  }

  const resp = await fetch(`${BASE_URL}/v1/keycloak/oidc/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
    }),
  })

  if (!resp.ok) {
    throw new AppError(502, `Falha ao autenticar com o SINTER (HTTP ${resp.status})`)
  }

  const data = (await resp.json()) as { access_token: string; expires_in: number }
  tokenCache = { token: data.access_token, expiraEm: agora + data.expires_in * 1000 }
  return tokenCache.token
}

// ── Tabelas de domínio CADURB (seção 13.10/13.11) ──
const TIPO_LOGRADOURO_PREFIXOS: [RegExp, number][] = [
  [/^(av\.?|avenida)\s/i, 26],
  [/^(al\.?|alameda)\s/i, 10],
  [/^(trav|tv\.?)\s/i, 273],
  [/^(est\.?|estrada)\s/i, 117],
  [/^(pra[cç]a|pç\.?)\s/i, 215],
  [/^(rod\.?|rodovia)\s/i, 247],
  [/^(viela|vl\.?)\s/i, 297],
]
const TIPO_LOGRADOURO_PADRAO = 250 // Rua

function inferirTipoLogradouro(log: string | null): number {
  if (!log) return TIPO_LOGRADOURO_PADRAO
  for (const [re, codigo] of TIPO_LOGRADOURO_PREFIXOS) {
    if (re.test(log)) return codigo
  }
  return TIPO_LOGRADOURO_PADRAO
}

function arredondar4(valor: number | null | undefined): number | null {
  if (valor == null) return null
  return Math.round(valor * 10000) / 10000
}

export type PayloadSinter = {
  DadosGeraisImovel: {
    inscricaoImobiliaria: string
    tipoImovel: number
    tpArquitetonico: number | null
    destinacaoImovel: number
    areaTerreno: number | null
    areaConstruida: number | null
    padraoConstrutivo: number | null
    valorVenal: number | null
    bice: null
    temBairro: boolean
  }
  EnderecoImovel: {
    tipoLogradouro: number
    nomeLogradouro: string
    temBairro: boolean
    bairro: string | null
    cep: string | null
    numeroImovel: string | null
  }
  Titular?: [
    {
      nomeTitular: string
      percTitularidade: number
      tipoTitularidade: number
      docTitularidade: number
    },
  ]
}

// Mapeamento GeoMaple → CADURB (seção 13.9). O tipoImovel/tpArquitetonico/destinacaoImovel/
// padraoConstrutivo já vêm classificados no cadastro (wizard, Prompt 7) — não precisam ser
// inferidos por heurística como no protótipo, exceto quando o operador ainda não classificou.
export function montarPayloadSinter(imovel: Imovel): PayloadSinter {
  const tipoImovel = imovel.cadurb_tipo ?? (imovel.uso === 'terreno' ? 1 : 2)
  const territorial = tipoImovel === 1

  const areaTerreno = arredondar4(imovel.at_geo ?? imovel.at_cad)
  const areaConstruida = territorial ? null : arredondar4(imovel.ac_geo ?? imovel.ac_cad)
  const temBairro = !!imovel.bai?.trim()

  const payload: PayloadSinter = {
    DadosGeraisImovel: {
      inscricaoImobiliaria: imovel.insc,
      tipoImovel,
      tpArquitetonico: territorial ? null : (imovel.tp_arq ?? null),
      destinacaoImovel: imovel.dest ?? 1,
      areaTerreno,
      areaConstruida,
      padraoConstrutivo: imovel.padrao ?? null,
      valorVenal: imovel.valor_venal ?? null,
      bice: null,
      temBairro,
    },
    EnderecoImovel: {
      tipoLogradouro: inferirTipoLogradouro(imovel.log),
      nomeLogradouro: imovel.log?.trim() || 'Não informado',
      temBairro,
      bairro: imovel.bai || null,
      cep: imovel.cep ? imovel.cep.replace(/\D/g, '') : null,
      numeroImovel: imovel.nr || null,
    },
  }

  if (imovel.prop?.trim()) {
    payload.Titular = [
      {
        nomeTitular: imovel.prop.trim(),
        percTitularidade: 1.0,
        tipoTitularidade: 1, // Proprietário
        docTitularidade: 1, // Escritura Pública
      },
    ]
  }

  return payload
}

// Validações da seção 13.6 — os mesmos critérios do v10_sinterValidate do protótipo
export function validarPayloadSinter(payload: PayloadSinter): string[] {
  const erros: string[] = []
  const dg = payload.DadosGeraisImovel
  const en = payload.EnderecoImovel

  if (!dg.inscricaoImobiliaria || dg.inscricaoImobiliaria.length > 45) {
    erros.push('Inscrição cadastral inválida ou ausente')
  }
  if (!dg.areaTerreno || dg.areaTerreno <= 0) {
    erros.push('Área do terreno obrigatória (areaTerreno)')
  }
  if (dg.tipoImovel === 2 && (!dg.tpArquitetonico || dg.tpArquitetonico <= 0)) {
    erros.push('Tipo arquitetônico obrigatório para imóvel predial')
  }
  if (dg.tipoImovel === 2 && (!dg.areaConstruida || dg.areaConstruida <= 0)) {
    erros.push('Área construída obrigatória para imóvel predial')
  }
  if (dg.tipoImovel === 1 && dg.areaConstruida !== null) {
    erros.push('Área construída deve ser nula para imóvel territorial')
  }
  if (!en.nomeLogradouro || en.nomeLogradouro.trim().length < 2) {
    erros.push('Nome do logradouro obrigatório')
  }
  if (!en.cep || en.cep.length !== 8) {
    erros.push('CEP obrigatório (8 dígitos sem hífen)')
  }
  if (en.temBairro && !en.bairro?.trim()) {
    erros.push('Bairro obrigatório quando há bairro informado')
  }

  return erros
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Chama a API do SINTER com retry (máx. 3x) para 5xx/timeout e renovação automática de token em 401.
async function chamarSinter(path: string, method: string, body: unknown): Promise<{ status: number; data: unknown }> {
  let tentativas = 0
  let renovouToken = false

  while (true) {
    tentativas++
    const token = await obterToken()

    let resp: Response
    try {
      resp = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      if (tentativas >= 3) throw new AppError(504, 'Timeout ao comunicar com o SINTER')
      await sleep(500 * tentativas)
      continue
    }

    if (resp.status === 401 && !renovouToken) {
      renovouToken = true
      await obterToken(true)
      continue
    }

    if (resp.status >= 500 && tentativas < 3) {
      await sleep(500 * tentativas)
      continue
    }

    const texto = await resp.text()
    let data: unknown = texto
    try {
      data = texto ? JSON.parse(texto) : null
    } catch {
      // resposta não-JSON — mantém texto bruto
    }
    return { status: resp.status, data }
  }
}

type RespostaCib = { uiIncluida?: { cib?: { valor?: string; situacao?: string } } }

export async function transmitirImovel(imovelId: number, solicitante: { id: number }) {
  const imovel = await prisma.imovel.findUnique({ where: { id: imovelId } })
  if (!imovel) throw new AppError(404, 'Imóvel não encontrado')

  const payload = montarPayloadSinter(imovel)
  const erros = validarPayloadSinter(payload)
  if (erros.length) {
    throw new AppError(400, `Cadastro incompleto para transmissão ao SINTER: ${erros.join('; ')}`)
  }

  const path = imovel.cib
    ? `/api/v1/${municipio.ibge}/ui/${imovel.cib}`
    : `/api/v1/${municipio.ibge}/ui`
  const metodo = imovel.cib ? 'PUT' : 'POST'

  const resultado = await chamarSinter(path, metodo, payload)
  const sucesso = resultado.status >= 200 && resultado.status < 300
  const cib = sucesso ? (resultado.data as RespostaCib)?.uiIncluida?.cib : undefined

  await registrarAuditoria({
    userId: solicitante.id,
    acao: sucesso ? 'SINTER_TRANSMITIDO' : 'SINTER_TRANSMISSAO_FALHOU',
    entidade: `Imovel:${imovel.id}`,
    // Nunca logar o payload completo (endereço/titular) — apenas o resultado da chamada
    detalhe: { insc: imovel.insc, httpStatus: resultado.status, cib: cib?.valor ?? null },
  })

  if (!sucesso) {
    throw new AppError(502, `SINTER retornou HTTP ${resultado.status} ao transmitir ${imovel.insc}`)
  }

  const atualizado = await prisma.imovel.update({
    where: { id: imovelId },
    data: {
      cib: cib?.valor ?? imovel.cib,
      cib_status: cib?.situacao ?? imovel.cib_status,
      cib_dt: new Date(),
    },
  })

  return atualizado
}
