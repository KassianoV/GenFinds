import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { formatCurrencyBRL } from '../../../lib/format'
import { isDesktop } from '../../services/platform'
import type { EvolucaoMensalItem } from '../../hooks/useRelatorio'

// ─── Constantes ───────────────────────────────────────────────────────────────

const COR_RECEITA = '#22c55e'
const COR_DESPESA = '#ef4444'
const BAR_MIN_WIDTH = 64 // px por grupo de barras no mobile

// ─── Formatadores ─────────────────────────────────────────────────────────────

function formatYAxis(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}k`
  return String(value)
}

// ─── Tooltip customizado ──────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>): React.JSX.Element | null {
  if (!active || !payload?.length) return null
  const receita = payload.find((p) => p.dataKey === 'receita')?.value ?? 0
  const despesa = payload.find((p) => p.dataKey === 'despesa')?.value ?? 0
  const saldo = Number(receita) - Number(despesa)

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2.5 text-sm min-w-44">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COR_RECEITA }} />
            Receita
          </span>
          <span className="font-medium text-green-600">{formatCurrencyBRL(Number(receita))}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COR_DESPESA }} />
            Despesa
          </span>
          <span className="font-medium text-red-500">{formatCurrencyBRL(Number(despesa))}</span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-border">
          <span className="text-muted-foreground">Saldo</span>
          <span className={`font-semibold ${saldo >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatCurrencyBRL(saldo)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton(): React.JSX.Element {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="h-5 w-64 bg-muted rounded animate-pulse mb-5" />
      <div className="h-52 bg-muted/50 rounded-lg animate-pulse" />
    </div>
  )
}

// ─── Conteúdo do gráfico ──────────────────────────────────────────────────────

interface ChartInnerProps {
  data: EvolucaoMensalItem[]
  width: number | string
  height: number
}

function ChartInner({ data, width, height }: ChartInnerProps): React.JSX.Element {
  const isFixed = typeof width === 'number'

  const chart = (
    <BarChart
      data={data}
      margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
    >
      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
      <XAxis
        dataKey="label"
        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        tickFormatter={formatYAxis}
        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
        axisLine={false}
        tickLine={false}
        width={40}
      />
      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--accent)', opacity: 0.4 }} />
      <Legend
        wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
        formatter={(value) => value === 'receita' ? 'Receita' : 'Despesa'}
      />
      <Bar dataKey="receita" fill={COR_RECEITA} radius={[4, 4, 0, 0]} maxBarSize={36} />
      <Bar dataKey="despesa" fill={COR_DESPESA} radius={[4, 4, 0, 0]} maxBarSize={36} />
    </BarChart>
  )

  if (isFixed) {
    return <div style={{ width, height }}>{React.cloneElement(chart, { width, height })}</div>
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      {chart}
    </ResponsiveContainer>
  )
}

// ─── GraficoBarrasReceita ─────────────────────────────────────────────────────

interface GraficoBarrasReceitaProps {
  data: EvolucaoMensalItem[]
  isLoading?: boolean
}

export function GraficoBarrasReceita({ data, isLoading }: GraficoBarrasReceitaProps): React.JSX.Element {
  const desktop = isDesktop()

  if (isLoading) return <Skeleton />

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 flex items-center justify-center min-h-40">
        <p className="text-sm text-muted-foreground">Nenhum dado para exibir no período</p>
      </div>
    )
  }

  const chartHeight = 220

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <p className="text-sm font-semibold text-foreground mb-4">Receita vs Despesa por Mês</p>

      {desktop ? (
        <ChartInner data={data} width="100%" height={chartHeight} />
      ) : (
        /* Mobile: largura fixa por barra + pan/zoom */
        <div className="overflow-hidden rounded-lg">
          <TransformWrapper
            initialScale={1}
            minScale={0.6}
            maxScale={2.5}
            panning={{ touchPadding: 0 }}
            pinch={{ disabled: false }}
            doubleClick={{ disabled: true }}
            centerZoomedOut={false}
          >
            <TransformComponent wrapperStyle={{ width: '100%' }}>
              <ChartInner
                data={data}
                width={Math.max(data.length * BAR_MIN_WIDTH + 48, 320)}
                height={chartHeight}
              />
            </TransformComponent>
          </TransformWrapper>
          <p className="text-center text-xs text-muted-foreground mt-2 opacity-60">
            Aperte dois dedos para zoom
          </p>
        </div>
      )}
    </div>
  )
}
