import React from 'react'
import { PeriodoSelector } from '../components/relatorio/PeriodoSelector'
import { GastosPorCategoriaTable } from '../components/relatorio/GastosPorCategoriaTable'
import { GraficoPizzaCategorias } from '../components/relatorio/GraficoPizzaCategorias'
import { GraficoBarrasReceita } from '../components/relatorio/GraficoBarrasReceita'
import { TopGastosLista } from '../components/relatorio/TopGastosLista'
import { useRelatorioFilterStore, getDatasAtuais } from '../stores/relatorioFilterStore'
import { useGastosPorCategoria, useTopGastos, useEvolucaoMensal } from '../hooks/useRelatorio'

export function RelatorioPage(): React.JSX.Element {
  const { preset, dataInicio, dataFim } = useRelatorioFilterStore()
  const periodo = getDatasAtuais(preset, dataInicio, dataFim)

  const { data: gastosData, isLoading: gastosLoading } = useGastosPorCategoria(
    periodo.dataInicio,
    periodo.dataFim
  )
  const { data: topData = [], isLoading: topLoading } = useTopGastos(
    periodo.dataInicio,
    periodo.dataFim,
    10
  )
  const { data: evolucaoData = [], isLoading: evolucaoLoading } = useEvolucaoMensal(
    periodo.dataInicio,
    periodo.dataFim
  )

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="px-6 pt-5 pb-4 flex items-start justify-between border-b border-border shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Relatórios</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Análise de receitas e despesas</p>
        </div>
        <PeriodoSelector />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Linha 1 — Pizza + Top 10 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <GraficoPizzaCategorias data={gastosData} isLoading={gastosLoading} />
          <TopGastosLista data={topData} isLoading={topLoading} />
        </div>

        {/* Linha 2 — Barras receita vs despesa */}
        <GraficoBarrasReceita data={evolucaoData} isLoading={evolucaoLoading} />

        {/* Linha 3 — Tabela por categoria */}
        <GastosPorCategoriaTable data={gastosData} isLoading={gastosLoading} />
      </div>
    </div>
  )
}
