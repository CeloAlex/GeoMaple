import { AppError } from '../utils/errors'

export type CamadaCatalogo = { name: string; title: string; abstract: string }

const LIMITE_CAMADAS = 200
const TIMEOUT_MS = 25000

// Consulta o GetCapabilities de um servidor WMS/GeoServer (base de qualquer catálogo
// GeoNetwork) e extrai as camadas disponíveis. Roda no backend (não no navegador) para
// evitar bloqueio de CORS ao consultar servidores de terceiros informados pelo operador.
//
// Extração por regex sequencial (Name seguido de Title), no mesmo espírito da análise de
// KML já usada no frontend (utils/importarGeo.ts) — cobre o caso comum de camadas-folha em
// GeoServer/MapServer sem precisar de um parser XML completo como dependência nova.
export async function consultarCapacidadesWms(urlBase: string): Promise<{ layers: CamadaCatalogo[] }> {
  let url: URL
  try {
    url = new URL(urlBase)
  } catch {
    throw new AppError(400, 'URL inválida')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new AppError(400, 'A URL deve ser http ou https')
  }

  url.searchParams.set('service', 'WMS')
  url.searchParams.set('request', 'GetCapabilities')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let texto: string
  try {
    const resposta = await fetch(url.toString(), { signal: controller.signal })
    if (!resposta.ok) {
      throw new AppError(502, `Servidor respondeu ${resposta.status} ao consultar o catálogo`)
    }
    texto = await resposta.text()
  } catch (e) {
    if (e instanceof AppError) throw e
    if (e instanceof Error && e.name === 'AbortError') {
      throw new AppError(504, 'Tempo esgotado ao consultar o servidor WMS/GeoNetwork')
    }
    throw new AppError(502, 'Não foi possível consultar o servidor WMS/GeoNetwork informado')
  } finally {
    clearTimeout(timeout)
  }

  if (!texto.includes('<') || !/wms|capabilities/i.test(texto.slice(0, 2000))) {
    throw new AppError(502, 'A resposta do servidor não parece ser um GetCapabilities WMS válido')
  }

  // Só considera o bloco <Capability> em diante — o <Service> (antes disso) também tem
  // Name/Title, mas descreve o serviço como um todo, não uma camada individual.
  const inicioCapability = texto.search(/<Capability[>\s]/i)
  const textoCamadas = inicioCapability >= 0 ? texto.slice(inicioCapability) : texto

  const regex = /<Name>([^<]+)<\/Name>\s*<Title>([^<]*)<\/Title>(?:\s*<Abstract>([^<]*)<\/Abstract>)?/g
  const layers: CamadaCatalogo[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(textoCamadas)) !== null && layers.length < LIMITE_CAMADAS) {
    const [, name, title, abstract] = match
    layers.push({
      name: decodificarEntidades(name.trim()),
      title: decodificarEntidades((title || name).trim()),
      abstract: decodificarEntidades((abstract || '').trim()),
    })
  }

  return { layers }
}

function decodificarEntidades(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}
