import React, { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PeriodoSelector } from '../components/relatorio/PeriodoSelector'
import { GastosPorCategoriaTable } from '../components/relatorio/GastosPorCategoriaTable'
import { GraficoPizzaCategorias } from '../components/relatorio/GraficoPizzaCategorias'
import { GraficoBarrasReceita } from '../components/relatorio/GraficoBarrasReceita'
import { TopGastosLista } from '../components/relatorio/TopGastosLista'
import { ResumoCardsRelatorio } from '../components/relatorio/ResumoCardsRelatorio'
import { useRelatorioFilterStore, getDatasAtuais } from '../stores/relatorioFilterStore'
import { useGastosPorCategoria, useTopGastos, useEvolucaoMensal, useResumoRelatorio } from '../hooks/useRelatorio'
import { useAuthStore } from '../stores/authStore'
import type { PeriodoPreset } from '../stores/relatorioFilterStore'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function gerarNomeArquivo(preset: PeriodoPreset, dataInicio: string, dataFim: string): string {
  if (preset === 'mes-atual' || preset === 'mes-anterior') {
    const [ano, mes] = dataInicio.split('-')
    return `transacoes-${MESES[Number(mes) - 1]}-${ano}.csv`
  }
  if (preset === 'ultimos-3-meses') return `transacoes-ultimos-3-meses.csv`
  if (preset === 'ano-atual') return `transacoes-${dataInicio.split('-')[0]}.csv`
  return `transacoes-${dataInicio}_${dataFim}.csv`
}

export function RelatorioPage(): React.JSX.Element {
  const { preset, dataInicio, dataFim } = useRelatorioFilterStore()
  const periodo = getDatasAtuais(preset, dataInicio, dataFim)
  const userId = useAuthStore((s) => s.currentUser?.id)
  const [exportando, setExportando] = useState(false)

  async function handleExportarCSV(): Promise<void> {
    if (!userId) return
    setExportando(true)
    try {
      const filename = gerarNomeArquivo(preset, periodo.dataInicio, periodo.dataFim)
      const result = await window.api.csv.export(userId, periodo.dataInicio, periodo.dataFim, filename)
      if (result.canceled) return
      if (!result.success) { toast.error(result.error ?? 'Erro ao exportar CSV'); return }
      const nome = result.filePath!.split(/[\\/]/).pop()!
      toast.success(`Arquivo salvo: ${nome}`)
    } finally {
      setExportando(false)
    }
  }

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
  const { data: resumoData, isLoading: resumoLoading } = useResumoRelatorio(
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
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportarCSV}
            disabled={exportando}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
          >
            {exportando ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {exportando ? 'Exportando...' : 'Exportar CSV'}
          </button>
          <PeriodoSelector />
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Cards de resumo */}
        <ResumoCardsRelatorio
          receita={resumoData?.receita ?? 0}
          despesa={resumoData?.despesa ?? 0}
          saldo={resumoData?.saldo ?? 0}
          preset={preset}
          nMeses={evolucaoData.length}
          isLoading={resumoLoading || evolucaoLoading}
        />

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
