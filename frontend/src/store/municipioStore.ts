import { create } from 'zustand'
import { api } from '../api/client'

export type Municipio = {
  nome: string
  uf: string
  ibge: string
  centro: { lat: number; lng: number; zoom: number }
}

// Nada no restante do app deve ter o nome/UF/coordenadas de um município fixos no código —
// tudo deriva de GET /api/config, que por sua vez lê as variáveis de ambiente do backend
// (veja backend/src/config/municipio.ts). Isto é o que permite reaproveitar o sistema
// para qualquer prefeitura apenas trocando a configuração da implantação.
const PADRAO: Municipio = {
  nome: 'Ouro Preto',
  uf: 'MG',
  ibge: '3146107',
  centro: { lat: -20.3855, lng: -43.5035, zoom: 17 },
}

type MunicipioState = {
  municipio: Municipio
  carregado: boolean
  carregar: () => Promise<void>
}

export const useMunicipioStore = create<MunicipioState>()((set, get) => ({
  municipio: PADRAO,
  carregado: false,
  carregar: async () => {
    if (get().carregado) return
    try {
      const { data } = await api.get<{ municipio: Municipio }>('/api/config')
      set({ municipio: data.municipio, carregado: true })
    } catch {
      // Sem config disponível (ex.: backend fora do ar na tela de login) — mantém o padrão
    }
  },
}))
