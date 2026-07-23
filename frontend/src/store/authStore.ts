import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Usuario } from '../types/imovel'

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  usuario: Usuario | null
  autenticar: (dados: { accessToken: string; refreshToken: string; usuario: Usuario }) => void
  logout: () => void
  marcarSenhaTrocada: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      usuario: null,
      autenticar: ({ accessToken, refreshToken, usuario }) =>
        set({ accessToken, refreshToken, usuario }),
      logout: () => set({ accessToken: null, refreshToken: null, usuario: null }),
      marcarSenhaTrocada: () =>
        set((s) => (s.usuario ? { usuario: { ...s.usuario, primeiroAcesso: false } } : {})),
    }),
    { name: 'geomaple-auth' },
  ),
)
