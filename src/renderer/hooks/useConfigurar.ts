import { useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '../services/database'
import { useAuthStore } from '../stores/authStore'
import type { Categoria } from '../../types/database.types'

export function useUpdateNome() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  return useMutation({
    mutationFn: async (novoNome: string) => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.auth.updateNome(userId, novoNome)
      if (!result.success) throw new Error(result.error)
      return result.data!
    },
    onSuccess: (usuario) => {
      useAuthStore.setState((state) => ({
        currentUser: state.currentUser ? { ...state.currentUser, nome: usuario.nome } : null,
      }))
    },
  })
}

export function useChangePassword() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  return useMutation({
    mutationFn: async ({ senhaAtual, novaSenha }: { senhaAtual: string; novaSenha: string }) => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.auth.changePassword(userId, senhaAtual, novaSenha)
      if (!result.success) throw new Error(result.error)
    },
  })
}

export function useCreateCategoria() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<Categoria, 'id' | 'created_at' | 'updated_at'>) => {
      const result = await db.categoria.create(data)
      if (!result.success) throw new Error(result.error)
      return result.data!
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias', userId] }),
  })
}

export function useUpdateCategoria() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Categoria> }) => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.categoria.update(id, userId, updates)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias', userId] }),
  })
}

export function useDeleteCategoria() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.categoria.delete(id, userId)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias', userId] }),
  })
}
