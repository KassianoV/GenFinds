import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const hoje = new Date()

interface FilterState {
  mes: number
  ano: number
  filtroTipo: 'todas' | 'receita' | 'despesa'
  busca: string
  contaIds: number[]
  categoriaIds: number[]
}

interface FilterActions {
  setMes: (mes: number) => void
  setAno: (ano: number) => void
  setFiltroTipo: (tipo: 'todas' | 'receita' | 'despesa') => void
  setBusca: (v: string) => void
  toggleContaId: (id: number) => void
  toggleCategoriaId: (id: number) => void
  resetFiltros: () => void
}

const DEFAULT: FilterState = {
  mes: hoje.getMonth() + 1,
  ano: hoje.getFullYear(),
  filtroTipo: 'todas',
  busca: '',
  contaIds: [],
  categoriaIds: [],
}

export const useTransacoesFilterStore = create<FilterState & FilterActions>()(
  persist(
    (set, get) => ({
      ...DEFAULT,
      setMes: (mes) => set({ mes }),
      setAno: (ano) => set({ ano }),
      setFiltroTipo: (filtroTipo) => set({ filtroTipo }),
      setBusca: (busca) => set({ busca }),
      toggleContaId: (id) => {
        const ids = get().contaIds
        set({ contaIds: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] })
      },
      toggleCategoriaId: (id) => {
        const ids = get().categoriaIds
        set({ categoriaIds: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] })
      },
      resetFiltros: () =>
        set({ filtroTipo: 'todas', busca: '', contaIds: [], categoriaIds: [] }),
    }),
    { name: 'transacoes-filtros' }
  )
)
