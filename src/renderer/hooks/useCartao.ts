import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '../services/database'
import { useAuthStore } from '../stores/authStore'
import type { Cartao, Parcela, TransacaoCartao, TransacaoCartaoCompleta } from '../../types/database.types'

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

export function useCreateParcelada() {
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
      if (numeroParcelas < 2 || numeroParcelas > 48)
        throw new Error('Número de parcelas deve ser entre 2 e 48')
      const result = await db.transacaoCartao.createParcelada(
        { ...data, parcelas: numeroParcelas },
        numeroParcelas,
      )
      if (!result.success) throw new Error(result.error)
      return result.data!
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

// ─── Parcelas Abertas ─────────────────────────────────────────────────────────

export interface CompraParcelada {
  grupo: string
  descricao: string
  cartao_nome: string
  categoria_nome?: string
  valor_parcela: number
  total_parcelas: number
  parcelas_pagas: number
  parcelas_abertas: number
  valor_total: number
  valor_restante: number
  data: string
  ids_abertas: number[]
}

export function useParcelasAbertas() {
  const { data: todasTransacoes = [], isLoading, refetch } = useTodasTransacoesCartao()

  const data = useMemo<CompraParcelada[]>(() => {
    const hoje = new Date().toISOString().split('T')[0]
    const comParcelas = todasTransacoes.filter((t) => t.parcelas > 1)
    const grupos = new Map<string, TransacaoCartaoCompleta[]>()

    comParcelas.forEach((t) => {
      const key = t.grupo_parcelamento ?? `solo-${t.id}`
      if (!grupos.has(key)) grupos.set(key, [])
      grupos.get(key)!.push(t)
    })

    return Array.from(grupos.entries())
      .map(([grupo, items]) => {
        const sorted = [...items].sort((a, b) => a.parcela_atual - b.parcela_atual)
        const first = sorted[0]
        const pagas = items.filter((i) => i.data <= hoje)
        const abertas = items.filter((i) => i.data > hoje)
        return {
          grupo,
          descricao: first.descricao,
          cartao_nome: first.cartao_nome,
          categoria_nome: first.categoria_nome ?? undefined,
          valor_parcela: first.valor,
          total_parcelas: first.parcelas,
          parcelas_pagas: pagas.length,
          parcelas_abertas: abertas.length,
          valor_total: first.valor * first.parcelas,
          valor_restante: abertas.reduce((sum, i) => sum + i.valor, 0),
          data: first.data,
          ids_abertas: abertas.map((i) => i.id),
        }
      })
      .sort((a, b) => b.data.localeCompare(a.data))
  }, [todasTransacoes])

  return { data, isLoading, refetch }
}

export function useQuitarParcelamento() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: number[]) => {
      if (!userId) throw new Error('Não autenticado')
      for (const id of ids) {
        const result = await db.transacaoCartao.delete(id, userId)
        if (!result.success) throw new Error(result.error)
      }
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
