import { useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '../services/database'
import { useAuthStore } from '../stores/authStore'

function getMesRange(ano: number, mes: number): { inicio: string; fim: string } {
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`
  return { inicio, fim }
}

export function useResumoMes(mes: number, ano: number) {
  const userId = useAuthStore((s) => s.currentUser?.id)
  return useQuery({
    queryKey: ['resumo', userId, mes, ano],
    queryFn: async () => {
      if (!userId) throw new Error('Não autenticado')
      const { inicio, fim } = getMesRange(ano, mes)
      const result = await db.relatorio.getResumo(userId, inicio, fim)
      if (!result.success) throw new Error(result.error)
      return result.data!
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  })
}

export function useSaldoContas() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  return useQuery({
    queryKey: ['saldo-contas', userId],
    queryFn: async () => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.conta.list(userId)
      if (!result.success) throw new Error(result.error)
      return (result.data ?? []).reduce((acc, c) => acc + c.saldo, 0)
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  })
}

export function useTransacoesRecentes(limit = 5) {
  const userId = useAuthStore((s) => s.currentUser?.id)
  return useQuery({
    queryKey: ['transacoes-recentes', userId, limit],
    queryFn: async () => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.transacao.list(userId, limit)
      if (!result.success) throw new Error(result.error)
      return result.data ?? []
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 1,
  })
}

export function useNotas() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  return useQuery({
    queryKey: ['notas', userId],
    queryFn: async () => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.nota.list(userId)
      if (!result.success) throw new Error(result.error)
      return result.data ?? []
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useGrafico6Meses() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const hoje = new Date()

  return useQuery({
    queryKey: ['grafico-6meses', userId, hoje.getMonth(), hoje.getFullYear()],
    queryFn: async () => {
      if (!userId) throw new Error('Não autenticado')

      const meses = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1)
        return { mes: d.getMonth() + 1, ano: d.getFullYear() }
      })

      const results = await Promise.all(
        meses.map(async ({ mes, ano }) => {
          const { inicio, fim } = getMesRange(ano, mes)
          const result = await db.relatorio.getResumo(userId, inicio, fim)
          return {
            mes: new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }),
            receita: result.data?.receita ?? 0,
            despesa: result.data?.despesa ?? 0,
          }
        }),
      )

      return results
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useInvalidateDashboard() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.currentUser?.id)
  return () => {
    qc.invalidateQueries({ queryKey: ['resumo', userId] })
    qc.invalidateQueries({ queryKey: ['saldo-contas', userId] })
    qc.invalidateQueries({ queryKey: ['transacoes-recentes', userId] })
    qc.invalidateQueries({ queryKey: ['grafico-6meses', userId] })
  }
}
