import React from 'react'
import { TrendingUp, TrendingDown, Scale, PiggyBank, BarChart3 } from 'lucide-react'
import { formatCurrencyBRL } from '../../../lib/format'
import { SkeletonResumoCard } from '../ui/Skeleton'
import type { PeriodoPreset } from '../../stores/relatorioFilterStore'

type CardDef = {
  label: string
  displayValue: string
  icon: React.ReactNode
  iconBg: string
  valueColor: string
  borderColor: string
}

function buildCards(
  preset: PeriodoPreset,
  receita: number,
  despesa: number,
  saldo: number,
  nMeses: number,
): CardDef[] {
  const saldoPositivo = saldo >= 0
  const isSingleMonth =
    preset === 'mes-atual' || preset === 'mes-anterior' || nMeses <= 1

  const cardReceita: CardDef = {
    label: isSingleMonth ? 'Receita do Mês' : 'Receita Total',
    displayValue: formatCurrencyBRL(receita),
    icon: <TrendingUp size={20} className="text-green-600" />,
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    valueColor: 'text-green-600',
    borderColor: 'border-l-green-500',
  }

  const cardDespesa: CardDef = {
    label: isSingleMonth ? 'Despesa do Mês' : 'Despesa Total',
    displayValue: formatCurrencyBRL(despesa),
    icon: <TrendingDown size={20} className="text-red-600" />,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    valueColor: 'text-red-600',
    borderColor: 'border-l-red-500',
  }

  const cardSaldo: CardDef = {
    label: 'Saldo Líquido',
    displayValue: formatCurrencyBRL(saldo),
    icon: <Scale size={20} className={saldoPositivo ? 'text-green-600' : 'text-red-600'} />,
    iconBg: saldoPositivo ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30',
    valueColor: saldoPositivo ? 'text-green-600' : 'text-red-600',
    borderColor: saldoPositivo ? 'border-l-green-500' : 'border-l-red-500',
  }

  if (isSingleMonth) {
    const taxa = receita > 0 ? (saldo / receita) * 100 : 0
    const taxaPositiva = taxa >= 0
    return [
      cardReceita,
      cardDespesa,
      cardSaldo,
      {
        label: 'Taxa de Economia',
        displayValue: receita > 0 ? `${taxa.toFixed(1)}%` : '—',
        icon: <PiggyBank size={20} className={taxaPositiva ? 'text-blue-600' : 'text-red-600'} />,
        iconBg: taxaPositiva ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-red-100 dark:bg-red-900/30',
        valueColor: taxaPositiva ? 'text-blue-600' : 'text-red-600',
        borderColor: taxaPositiva ? 'border-l-blue-500' : 'border-l-red-500',
      },
    ]
  }

  const mediaMensal = nMeses > 0 ? despesa / nMeses : 0
  return [
    cardReceita,
    cardDespesa,
    cardSaldo,
    {
      label: 'Média Mensal de Gastos',
      displayValue: formatCurrencyBRL(mediaMensal),
      icon: <BarChart3 size={20} className="text-amber-600" />,
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      valueColor: 'text-amber-600',
      borderColor: 'border-l-amber-500',
    },
  ]
}

function SummaryCard({ card }: { card: CardDef }): React.JSX.Element {
  return (
    <div
      className={`bg-card rounded-xl border border-border border-l-4 ${card.borderColor} p-4 flex items-center gap-4`}
    >
      <div className={`p-3 rounded-xl shrink-0 ${card.iconBg}`}>{card.icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
        <p className={`text-xl font-bold truncate ${card.valueColor}`}>{card.displayValue}</p>
      </div>
    </div>
  )
}

interface ResumoCardsRelatorioProps {
  receita: number
  despesa: number
  saldo: number
  preset: PeriodoPreset
  nMeses: number
  isLoading: boolean
}

export function ResumoCardsRelatorio({
  receita,
  despesa,
  saldo,
  preset,
  nMeses,
  isLoading,
}: ResumoCardsRelatorioProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonResumoCard key={i} />
        ))}
      </div>
    )
  }

  const cards = buildCards(preset, receita, despesa, saldo, nMeses)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => (
        <SummaryCard key={i} card={card} />
      ))}
    </div>
  )
}
