import React from 'react'
import { TrendingUp, TrendingDown, Wallet, Scale } from 'lucide-react'
import { formatCurrencyBRL } from '../../../lib/format'
import { SkeletonResumoCard } from '../ui/Skeleton'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

interface CardConfig {
  label: string
  value: number
  icon: React.ReactNode
  iconBg: string
  valueColor: string
  borderColor: string
  showPeriod?: boolean
  mes?: number
  ano?: number
}

function ResumoCard({ label, value, icon, iconBg, valueColor, borderColor, showPeriod, mes, ano }: CardConfig): React.JSX.Element {
  return (
    <div className={`bg-card rounded-xl border border-border border-l-4 ${borderColor} p-4 flex items-center gap-4`}>
      <div className={`p-3 rounded-xl shrink-0 ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className={`text-xl font-bold truncate ${valueColor}`}>{formatCurrencyBRL(value)}</p>
        {showPeriod && mes && ano && (
          <p className="text-xs text-muted-foreground mt-0.5">{MESES[mes - 1]} {ano}</p>
        )}
      </div>
    </div>
  )
}


interface ResumoCardsProps {
  receita: number
  despesa: number
  saldo: number
  saldoContas: number
  mes: number
  ano: number
  loading: boolean
}

export function ResumoCards({ receita, despesa, saldo, saldoContas, mes, ano, loading }: ResumoCardsProps): React.JSX.Element {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonResumoCard key={i} />)}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <ResumoCard
        label="Patrimônio Líquido"
        value={saldoContas}
        icon={<Wallet size={20} className="text-blue-600" />}
        iconBg="bg-blue-100 dark:bg-blue-900/30"
        valueColor="text-blue-600"
        borderColor="border-l-blue-500"
        loading={loading}
      />
      <ResumoCard
        label="Receita Mensal"
        value={receita}
        icon={<TrendingUp size={20} className="text-green-600" />}
        iconBg="bg-green-100 dark:bg-green-900/30"
        valueColor="text-green-600"
        borderColor="border-l-green-500"
        showPeriod
        mes={mes}
        ano={ano}
        loading={loading}
      />
      <ResumoCard
        label="Despesas Mensal"
        value={despesa}
        icon={<TrendingDown size={20} className="text-red-600" />}
        iconBg="bg-red-100 dark:bg-red-900/30"
        valueColor="text-red-600"
        borderColor="border-l-red-500"
        showPeriod
        mes={mes}
        ano={ano}
        loading={loading}
      />
      <ResumoCard
        label="Saldo Mensal"
        value={saldo}
        icon={<Scale size={20} className="text-amber-600" />}
        iconBg="bg-amber-100 dark:bg-amber-900/30"
        valueColor={saldo >= 0 ? 'text-amber-600' : 'text-red-600'}
        borderColor="border-l-amber-500"
        showPeriod
        mes={mes}
        ano={ano}
        loading={loading}
      />
    </div>
  )
}
