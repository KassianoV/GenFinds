import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Usuario } from '../../types/database.types'
import { db } from '../services/database'

interface AuthState {
  currentUser: Usuario | null
  isLoading: boolean
  login: (nome: string, senha: string) => Promise<{ success: boolean; error?: string }>
  register: (nome: string, senha: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      isLoading: false,

      login: async (nome, senha) => {
        set({ isLoading: true })
        const result = await db.auth.login(nome, senha)
        set({ isLoading: false })
        if (result.success && result.data) {
          set({ currentUser: result.data })
          return { success: true }
        }
        return { success: false, error: result.error ?? 'Erro ao fazer login' }
      },

      register: async (nome, senha) => {
        set({ isLoading: true })
        const result = await db.auth.register(nome, senha)
        set({ isLoading: false })
        if (result.success && result.data) {
          set({ currentUser: result.data })
          return { success: true }
        }
        return { success: false, error: result.error ?? 'Erro ao criar conta' }
      },

      logout: () => set({ currentUser: null })
    }),
    {
      name: 'genfinds-auth',
      partialize: (state) => ({ currentUser: state.currentUser })
    }
  )
)
