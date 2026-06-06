import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatCurrencyBRL } from '../../../lib/format'

interface GraficoData {
  mes: string
  receita: number
  despesa: number
}

interface GraficoMesesProps {
  data: GraficoData[]
  loading: boolean
}

function SkeletonGrafico(): React.JSX.Element {
  return (
    <div className="animate-pulse">
      <div className="h-52 bg-muted rounded-lg" />
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any): React.JSX.Element | null {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg p-3 text-sm shadow-lg">
      <p className="font-medium text-foreground mb-1 capitalize">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.dataKey === 'receita' ? 'Receitas' : 'Despesas'}: {formatCurrencyBRL(entry.value)}
        </p>
      ))}
    </div>
  )
}

function yTickFormatter(v: number): string {
  if (v === 0) return 'R$ 0'
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`
  return `R$ ${v}`
}

export function GraficoMeses({ data, loading }: GraficoMesesProps): React.JSX.Element {
  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-3">
      <h3 className="text-base font-semibold text-foreground">Evolução Mensal</h3>

      {loading ? (
        <SkeletonGrafico />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={yTickFormatter}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="rect"
              iconSize={10}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(v) => (v === 'receita' ? 'Receitas' : 'Despesas')}
            />
            <Line
              type="monotone"
              dataKey="receita"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 4, fill: '#22c55e' }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="despesa"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 4, fill: '#ef4444' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
