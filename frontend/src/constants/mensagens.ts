// Mensagem padrão para recursos ainda não implementados nesta versão (ex.: dados que
// eram mockados no protótipo original) — evita o texto "Fora do escopo do MVP", que
// testes de usuário apontaram como confuso (soa como "nunca vai existir", quando na
// verdade é um recurso planejado para uma fase futura).
export function mensagemForaDoEscopo(detalhe?: string): string {
  return `Recurso ainda não disponível nesta versão — previsto para uma fase futura${detalhe ? ` (${detalhe})` : ''}.`
}
