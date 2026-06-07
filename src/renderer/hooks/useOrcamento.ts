import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '../services/database'
import { useAuthStore } from '../stores/authStore'
import type { Orcamento } from '../../types/database.types'

export function useOrcamentos(mes: number, ano: number) {
  const userId = useAuthStore((s) => s.currentUser?.id)
  return useQuery({
    queryKey: ['orcamentos', userId, mes, ano],
    queryFn: async () => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.orcamento.list(userId, mes, ano)
      if (!result.success) throw new Error(result.error)
      return result.data ?? []
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateOrcamento() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<Orcamento, 'id' | 'created_at' | 'updated_at'>) => {
      const result = await db.orcamento.create(data)
      if (!result.success) throw new Error(result.error)
      return result.data!
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orcamentos', userId] })
      qc.invalidateQueries({ queryKey: ['resumo'] })
      qc.invalidateQueries({ queryKey: ['grafico-6meses'] })
    },
  })
}

export function useUpdateOrcamento() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Orcamento> }) => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.orcamento.update(id, userId, updates)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orcamentos', userId] })
      qc.invalidateQueries({ queryKey: ['resumo'] })
      qc.invalidateQueries({ queryKey: ['grafico-6meses'] })
    },
  })
}

export function useDeleteOrcamento() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.orcamento.delete(id, userId)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orcamentos', userId] })
      qc.invalidateQueries({ queryKey: ['resumo'] })
      qc.invalidateQueries({ queryKey: ['grafico-6meses'] })
    },
  })
}
