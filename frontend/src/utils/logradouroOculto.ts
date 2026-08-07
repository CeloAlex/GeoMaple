// Chaves de visibilidade em cascata para a árvore de Logradouros (Distrito > Bairro >
// Logradouro) — mesma convenção de `ramoOculto` em utils/inscricao.ts, mas própria porque
// os segmentos aqui vêm de campos livres (distrito/bairros), não de inscrição parseada.
// Um logradouro sem distrito/bairro cai nos buckets "Sem distrito"/"Sem bairro" (mesmo
// texto usado como label na árvore, em Sidebar/ArvoreLogradouros.tsx).
export function chaveDistrito(distrito: string | null): string {
  return distrito?.trim() || 'Sem distrito'
}

export function chaveBairro(distrito: string | null, bairro: string | null): string {
  return `${chaveDistrito(distrito)}.${bairro?.trim() || 'Sem bairro'}`
}

// Um logradouro com vários bairros aparece uma folha em cada bairro na árvore — está
// oculto no mapa só se estiver oculto em TODAS as combinações (ocultar um bairro não deve
// esconder um logradouro que também pertence a outro bairro visível).
export function logradouroOculto(ramosOcultos: Set<string>, distrito: string | null, bairros: string[], id: number): boolean {
  const lista = bairros.length > 0 ? bairros : [null]
  return lista.every((bairro) => {
    const cd = chaveDistrito(distrito)
    const cb = chaveBairro(distrito, bairro)
    return ramosOcultos.has(cd) || ramosOcultos.has(cb) || ramosOcultos.has(`${cb}.${id}`)
  })
}
