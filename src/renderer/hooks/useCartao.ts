import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '../services/database'
import { useAuthStore } from '../stores/authStore'
import type { Cartao, Parcela, TransacaoCartao } from '../../types/database.types'

// ─── Cartões ──────────────────────────────────────────────────────────────────

export function useCartoes() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  return useQuery({
    queryKey: ['cartoes', userId],
    queryFn: async () => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.cartao.list(userId)
      if (!result.success) throw new Error(result.error)
      return result.data ?? []
    },
    enabled: !!userId,
    staleTime: 300_000,
  })
}

export function useCreateCartao() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<Cartao, 'id' | 'created_at' | 'updated_at'>) => {
      const result = await db.cartao.create(data)
      if (!result.success) throw new Error(result.error)
      return result.data!
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cartoes', userId] }),
  })
}

export function useUpdateCartao() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Cartao> }) => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.cartao.update(id, userId, updates)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cartoes', userId] }),
  })
}

export function useDeleteCartao() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.cartao.delete(id, userId)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cartoes', userId] })
      qc.invalidateQueries({ queryKey: ['transacoes-cartao', userId] })
      qc.invalidateQueries({ queryKey: ['transacoes-cartao-todas', userId] })
    },
  })
}

// ─── Parcelas ─────────────────────────────────────────────────────────────────

export function useParcelas() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  return useQuery({
    queryKey: ['parcelas', userId],
    queryFn: async () => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.parcela.list(userId)
      if (!result.success) throw new Error(result.error)
      return result.data ?? []
    },
    enabled: !!userId,
    staleTime: 300_000,
  })
}

export function useCreateParcela() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<Parcela, 'id' | 'created_at' | 'updated_at'>) => {
      const result = await db.parcela.create(data)
      if (!result.success) throw new Error(result.error)
      return result.data!
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parcelas', userId] }),
  })
}

export function useDeleteParcela() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.parcela.delete(id, userId)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parcelas', userId] }),
  })
}

// ─── Fatura (TransacaoCartao) ─────────────────────────────────────────────────

export function useTodasTransacoesCartao(cartaoId?: number) {
  const userId = useAuthStore((s) => s.currentUser?.id)
  return useQuery({
    queryKey: ['transacoes-cartao-todas', userId, cartaoId],
    queryFn: async () => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.transacaoCartao.list(userId, cartaoId)
      if (!result.success) throw new Error(result.error)
      return result.data ?? []
    },
    enabled: !!userId,
    staleTime: 60_000,
  })
}

export function useTransacoesCartao(cartaoId?: number, mes?: number, ano?: number) {
  const userId = useAuthStore((s) => s.currentUser?.id)
  return useQuery({
    queryKey: ['transacoes-cartao', userId, cartaoId, mes, ano],
    queryFn: async () => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.transacaoCartao.list(userId, cartaoId, mes, ano)
      if (!result.success) throw new Error(result.error)
      return result.data ?? []
    },
    enabled: !!userId,
    staleTime: 60_000,
  })
}

export function useCreateFatura() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      data,
      numeroParcelas,
    }: {
      data: Omit<TransacaoCartao, 'id' | 'created_at' | 'updated_at' | 'parcela_atual' | 'grupo_parcelamento'>
      numeroParcelas: number
    }) => {
      if (numeroParcelas > 1) {
        const result = await db.transacaoCartao.createParcelada(
          { ...data, parcelas: numeroParcelas },
          numeroParcelas,
        )
        if (!result.success) throw new Error(result.error)
        return result.data!
      }
      const result = await db.transacaoCartao.create({ ...data, parcelas: 1, parcela_atual: 1 })
      if (!result.success) throw new Error(result.error)
      return [result.data!]
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transacoes-cartao', userId] })
      qc.invalidateQueries({ queryKey: ['transacoes-cartao-todas', userId] })
      qc.invalidateQueries({ queryKey: ['cartoes', userId] })
      qc.invalidateQueries({ queryKey: ['resumo'] })
      qc.invalidateQueries({ queryKey: ['saldo-contas'] })
      qc.invalidateQueries({ queryKey: ['transacoes-recentes'] })
      qc.invalidateQueries({ queryKey: ['grafico-6meses'] })
    },
  })
}

export function useDeleteFatura() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.transacaoCartao.delete(id, userId)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transacoes-cartao', userId] })
      qc.invalidateQueries({ queryKey: ['transacoes-cartao-todas', userId] })
      qc.invalidateQueries({ queryKey: ['cartoes', userId] })
      qc.invalidateQueries({ queryKey: ['resumo'] })
      qc.invalidateQueries({ queryKey: ['saldo-contas'] })
      qc.invalidateQueries({ queryKey: ['transacoes-recentes'] })
      qc.invalidateQueries({ queryKey: ['grafico-6meses'] })
    },
  })
}
