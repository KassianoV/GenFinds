import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '../services/database'
import { useAuthStore } from '../stores/authStore'
import type { Transacao, Conta } from '../../types/database.types'

function getMesRange(ano: number, mes: number): { inicio: string; fim: string } {
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`
  return { inicio, fim }
}

export function useTransacoesMes(mes: number, ano: number) {
  const userId = useAuthStore((s) => s.currentUser?.id)
  return useQuery({
    queryKey: ['transacoes-mes', userId, mes, ano],
    queryFn: async () => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.transacao.list(userId)
      if (!result.success) throw new Error(result.error)
      const { inicio, fim } = getMesRange(ano, mes)
      return (result.data ?? []).filter((t) => t.data >= inicio && t.data <= fim)
    },
    enabled: !!userId,
    staleTime: 60_000,
  })
}

export function useContas() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  return useQuery({
    queryKey: ['contas', userId],
    queryFn: async () => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.conta.list(userId)
      if (!result.success) throw new Error(result.error)
      return result.data ?? []
    },
    enabled: !!userId,
    staleTime: 300_000,
  })
}

export function useCategorias(tipo?: 'receita' | 'despesa') {
  const userId = useAuthStore((s) => s.currentUser?.id)
  return useQuery({
    queryKey: ['categorias', userId, tipo ?? 'all'],
    queryFn: async () => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.categoria.list(userId, tipo)
      if (!result.success) throw new Error(result.error)
      return result.data ?? []
    },
    enabled: !!userId,
    staleTime: 600_000,
  })
}

export function useCreateConta() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<Conta, 'id' | 'created_at' | 'updated_at'>) => {
      const result = await db.conta.create(data)
      if (!result.success) throw new Error(result.error)
      return result.data!
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas', userId] })
      qc.invalidateQueries({ queryKey: ['saldo-contas'] })
      qc.invalidateQueries({ queryKey: ['resumo'] })
    },
  })
}

export function useUpdateConta() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Conta> }) => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.conta.update(id, userId, updates)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas', userId] })
      qc.invalidateQueries({ queryKey: ['saldo-contas'] })
      qc.invalidateQueries({ queryKey: ['resumo'] })
    },
  })
}

export function useDeleteConta() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.conta.delete(id, userId)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas', userId] })
      qc.invalidateQueries({ queryKey: ['saldo-contas'] })
      qc.invalidateQueries({ queryKey: ['resumo'] })
    },
  })
}

export function useCreateTransacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<Transacao, 'id' | 'created_at' | 'updated_at'>) => {
      const result = await db.transacao.create(data)
      if (!result.success) throw new Error(result.error)
      return result.data!
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transacoes-mes'] })
      qc.invalidateQueries({ queryKey: ['resumo'] })
      qc.invalidateQueries({ queryKey: ['saldo-contas'] })
      qc.invalidateQueries({ queryKey: ['transacoes-recentes'] })
      qc.invalidateQueries({ queryKey: ['grafico-6meses'] })
    },
  })
}

export function useUpdateTransacao() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Transacao> }) => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.transacao.update(id, userId, updates)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transacoes-mes'] })
      qc.invalidateQueries({ queryKey: ['resumo'] })
      qc.invalidateQueries({ queryKey: ['saldo-contas'] })
      qc.invalidateQueries({ queryKey: ['transacoes-recentes'] })
      qc.invalidateQueries({ queryKey: ['grafico-6meses'] })
    },
  })
}

export function useDeleteTransacao() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.transacao.delete(id, userId)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transacoes-mes'] })
      qc.invalidateQueries({ queryKey: ['resumo'] })
      qc.invalidateQueries({ queryKey: ['saldo-contas'] })
      qc.invalidateQueries({ queryKey: ['transacoes-recentes'] })
      qc.invalidateQueries({ queryKey: ['grafico-6meses'] })
    },
  })
}
