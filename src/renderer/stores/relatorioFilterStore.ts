import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PeriodoPreset = 'mes-atual' | 'mes-anterior' | 'ultimos-3-meses' | 'ano-atual' | 'personalizado'

function toISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function calcularPeriodo(preset: Exclude<PeriodoPreset, 'personalizado'>): { dataInicio: string; dataFim: string } {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()

  switch (preset) {
    case 'mes-atual':
      return {
        dataInicio: toISO(new Date(ano, mes, 1)),
        dataFim: toISO(new Date(ano, mes + 1, 0)),
      }
    case 'mes-anterior':
      return {
        dataInicio: toISO(new Date(ano, mes - 1, 1)),
        dataFim: toISO(new Date(ano, mes, 0)),
      }
    case 'ultimos-3-meses':
      return {
        dataInicio: toISO(new Date(ano, mes - 2, 1)),
        dataFim: toISO(new Date(ano, mes + 1, 0)),
      }
    case 'ano-atual':
      return {
        dataInicio: toISO(new Date(ano, 0, 1)),
        dataFim: toISO(new Date(ano, 11, 31)),
      }
  }
}

// Retorna datas frescas: recomputa para presets, usa armazenado só para personalizado
export function getDatasAtuais(
  preset: PeriodoPreset,
  dataInicio: string,
  dataFim: string,
): { dataInicio: string; dataFim: string } {
  if (preset === 'personalizado') return { dataInicio, dataFim }
  return calcularPeriodo(preset)
}

interface RelatorioFilterState {
  preset: PeriodoPreset
  dataInicio: string
  dataFim: string
}

interface RelatorioFilterActions {
  setPreset: (preset: Exclude<PeriodoPreset, 'personalizado'>) => void
  setPersonalizado: (dataInicio: string, dataFim: string) => void
}

const defaultPeriodo = calcularPeriodo('mes-atual')

export const useRelatorioFilterStore = create<RelatorioFilterState & RelatorioFilterActions>()(
  persist(
    (set) => ({
      preset: 'mes-atual',
      ...defaultPeriodo,
      setPreset: (preset) => set({ preset, ...calcularPeriodo(preset) }),
      setPersonalizado: (dataInicio, dataFim) =>
        set({ preset: 'personalizado', dataInicio, dataFim }),
    }),
    { name: 'relatorio-filtros' }
  )
)
