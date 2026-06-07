import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { db } from '../services/database'
import { useAuthStore } from '../stores/authStore'
import { useOrcamentos } from './useOrcamento'
import type { GastoPorCategoria, TransacaoCompleta } from '../../types/database.types'

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export interface EvolucaoMensalItem {
  label: string
  ano: number
  mes: number
  receita: number
  despesa: number
}

export function useEvolucaoMensal(dataInicio: string, dataFim: string) {
  const userId = useAuthStore((s) => s.currentUser?.id)

  return useQuery<EvolucaoMensalItem[]>({
    queryKey: ['evolucao-mensal', userId, dataInicio, dataFim],
    queryFn: async () => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.relatorio.getEvolucaoMensal(userId, dataInicio, dataFim)
      if (!result.success) throw new Error(result.error)
      const raw = result.data ?? []

      // Gera todos os meses do período para preencher lacunas com zero
      const inicio = new Date(dataInicio + 'T12:00:00')
      const fim = new Date(dataFim + 'T12:00:00')
      const todosMeses: { ano: number; mes: number }[] = []
      const cur = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
      while (cur <= fim) {
        todosMeses.push({ ano: cur.getFullYear(), mes: cur.getMonth() + 1 })
        cur.setMonth(cur.getMonth() + 1)
      }

      const rawMap = new Map(raw.map((r) => [`${r.ano}-${r.mes}`, r]))
      const multiAno = new Set(todosMeses.map((m) => m.ano)).size > 1

      return todosMeses.map(({ ano, mes }) => {
        const found = rawMap.get(`${ano}-${mes}`)
        const abrev = MESES_ABREV[mes - 1]
        return {
          label: multiAno ? `${abrev}/${String(ano).slice(2)}` : abrev,
          ano,
          mes,
          receita: found?.receita ?? 0,
          despesa: found?.despesa ?? 0,
        }
      })
    },
    enabled: !!userId && !!dataInicio && !!dataFim,
    staleTime: 60_000,
  })
}

export function useTopGastos(dataInicio: string, dataFim: string, limite = 10) {
  const userId = useAuthStore((s) => s.currentUser?.id)
  return useQuery<TransacaoCompleta[]>({
    queryKey: ['top-gastos', userId, dataInicio, dataFim, limite],
    queryFn: async () => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.relatorio.getTopGastos(userId, dataInicio, dataFim, limite)
      if (!result.success) throw new Error(result.error)
      return result.data ?? []
    },
    enabled: !!userId && !!dataInicio && !!dataFim,
    staleTime: 60_000,
  })
}

export interface GastoCategoriaComOrcamento extends GastoPorCategoria {
  orcamento: number
  percentual_total: number
}

export function useGastosPorCategoria(dataInicio: string, dataFim: string) {
  const userId = useAuthStore((s) => s.currentUser?.id)

  // Mês/ano do início do período para buscar os orçamentos
  const [anoInicio, mesInicio] = useMemo(() => {
    if (!dataInicio) return [new Date().getFullYear(), new Date().getMonth() + 1]
    const d = new Date(dataInicio + 'T12:00:00')
    return [d.getFullYear(), d.getMonth() + 1]
  }, [dataInicio])

  const gastosQuery = useQuery({
    queryKey: ['gastos-categoria', userId, dataInicio, dataFim],
    queryFn: async () => {
      if (!userId) throw new Error('Não autenticado')
      const result = await db.relatorio.getGastosPorCategoria(userId, dataInicio, dataFim)
      if (!result.success) throw new Error(result.error)
      return result.data ?? []
    },
    enabled: !!userId && !!dataInicio && !!dataFim,
    staleTime: 60_000,
  })

  const orcamentosQuery = useOrcamentos(mesInicio, anoInicio)

  const data = useMemo<GastoCategoriaComOrcamento[]>(() => {
    const gastos = gastosQuery.data ?? []
    const orcamentos = orcamentosQuery.data ?? []
    const totalGasto = gastos.reduce((s, g) => s + g.total_gasto, 0)

    return gastos.map((g) => ({
      ...g,
      orcamento: orcamentos.find((o) => o.categoria_id === g.categoria_id)?.valor_planejado ?? 0,
      percentual_total: totalGasto > 0 ? (g.total_gasto / totalGasto) * 100 : 0,
    }))
  }, [gastosQuery.data, orcamentosQuery.data])

  return {
    data,
    isLoading: gastosQuery.isLoading || orcamentosQuery.isLoading,
    isError: gastosQuery.isError,
  }
}
