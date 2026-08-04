// Mantém só a URL base do serviço (origin + pathname) — se o usuário colar uma URL
// completa de GetCapabilities (com ?service=WMS&request=GetCapabilities&...), o Leaflet
// acrescenta seus próprios parâmetros de GetMap depois, e alguns servidores WMS
// respeitam o primeiro `request=` da URL, retornando XML em vez de imagem, sem erro de
// rede — a camada fica cadastrada mas nunca renderiza.
export function baseUrlWms(url: string): string {
  try {
    const u = new URL(url)
    return u.origin + u.pathname
  } catch {
    return url
  }
}
