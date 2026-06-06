import React, { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import {
  useResumoMes,
  useSaldoContas,
  useTransacoesRecentes,
  useNotas,
  useGrafico6Meses,
} from '../hooks/useDashboard'
import { ResumoCards } from '../components/dashboard/ResumoCards'
import { GraficoMeses } from '../components/dashboard/GraficoMeses'
import { TransacoesRecentes } from '../components/dashboard/TransacoesRecentes'
import { NotasWidget } from '../components/dashboard/NotasWidget'
import { isDesktop } from '../services/platform'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function DashboardPage(): React.JSX.Element {
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())

  const resumo = useResumoMes(mes, ano)
  const saldoContas = useSaldoContas()
  const transacoes = useTransacoesRecentes(5)
  const notas = useNotas()
  const grafico = useGrafico6Meses()

  const refetching =
    resumo.isFetching ||
    saldoContas.isFetching ||
    transacoes.isFetching ||
    grafico.isFetching

  function refetchAll(): void {
    resumo.refetch()
    saldoContas.refetch()
    transacoes.refetch()
    notas.refetch()
    grafico.refetch()
  }

  function mesAnterior(): void {
    if (mes === 1) { setMes(12); setAno((a) => a - 1) }
    else setMes((m) => m - 1)
  }

  function proximoMes(): void {
    const limite = hoje.getFullYear() * 12 + hoje.getMonth()
    const atual = ano * 12 + (mes - 1)
    if (atual >= limite) return
    if (mes === 12) { setMes(1); setAno((a) => a + 1) }
    else setMes((m) => m + 1)
  }

  const eMesAtual = mes === hoje.getMonth() + 1 && ano === hoje.getFullYear()

  // Pull-to-refresh (mobile)
  const touchStartY = useRef(0)
  function onTouchStart(e: React.TouchEvent): void { touchStartY.current = e.touches[0].clientY }
  function onTouchEnd(e: React.TouchEvent): void {
    if (e.changedTouches[0].clientY - touchStartY.current > 80) refetchAll()
  }

  const carregando = resumo.isLoading || saldoContas.isLoading

  return (
    <div
      className="flex flex-col h-full overflow-auto"
      onTouchStart={isDesktop() ? undefined : onTouchStart}
      onTouchEnd={isDesktop() ? undefined : onTouchEnd}
    >
      <div className="p-4 pb-8 space-y-4 w-full">
        {/* Seletor de mês + refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={mesAnterior}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-foreground w-32 text-center">
              {MESES[mes - 1]} {ano}
            </span>
            <button
              onClick={proximoMes}
              disabled={eMesAtual}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            onClick={refetchAll}
            disabled={refetching}
            className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground disabled:opacity-50"
          >
            <RefreshCw size={15} className={refetching ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Cards de resumo */}
        <ResumoCards
          receita={resumo.data?.receita ?? 0}
          despesa={resumo.data?.despesa ?? 0}
          saldo={resumo.data?.saldo ?? 0}
          saldoContas={saldoContas.data ?? 0}
          mes={mes}
          ano={ano}
          loading={carregando}
        />

        {/* Gráfico + Transações (desktop: lado a lado / mobile: empilhado) */}
        <div className={isDesktop() ? 'grid grid-cols-3 gap-4' : 'space-y-4'}>
          <div className={isDesktop() ? 'col-span-2' : ''}>
            <GraficoMeses data={grafico.data ?? []} loading={grafico.isLoading} />
          </div>
          <TransacoesRecentes
            transacoes={transacoes.data ?? []}
            loading={transacoes.isLoading}
          />
        </div>

        {/* Notas */}
        <NotasWidget notas={notas.data ?? []} loading={notas.isLoading} />
      </div>
    </div>
  )
}
