import React, { useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts'
import { formatCurrencyBRL } from '../../../lib/format'
import { getCategoriaColor } from '../../../lib/constants'
import { isDesktop } from '../../services/platform'
import type { GastoCategoriaComOrcamento } from '../../hooks/useRelatorio'

// ─── Tooltip customizado ──────────────────────────────────────────────────────

function CustomTooltip({ active, payload }: TooltipProps<number, string>): React.JSX.Element | null {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  const { categoria_nome, total_gasto, percentual_total, categoria_cor, index } = entry.payload as GastoCategoriaComOrcamento & { index: number }
  const cor = getCategoriaColor(index, categoria_cor)

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2.5 text-sm">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cor }} />
        <span className="font-semibold text-foreground">{categoria_nome}</span>
      </div>
      <div className="space-y-0.5 text-xs text-muted-foreground">
        <p>Valor: <span className="font-medium text-foreground">{formatCurrencyBRL(total_gasto)}</span></p>
        <p>Percentual: <span className="font-medium text-foreground">{percentual_total.toFixed(1)}%</span></p>
      </div>
    </div>
  )
}

// ─── Legenda mobile (lista vertical) ─────────────────────────────────────────

interface LegendaMobileProps {
  data: (GastoCategoriaComOrcamento & { index: number })[]
  activeIndex: number | null
  onHover: (index: number | null) => void
}

function LegendaMobile({ data, activeIndex, onHover }: LegendaMobileProps): React.JSX.Element {
  return (
    <div className="mt-4 max-h-48 overflow-y-auto space-y-1.5 pr-1">
      {data.map((item) => {
        const cor = getCategoriaColor(item.index, item.categoria_cor)
        const isActive = activeIndex === item.index
        return (
          <button
            key={item.categoria_id}
            type="button"
            onTouchStart={() => onHover(item.index)}
            onTouchEnd={() => onHover(null)}
            className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors text-left ${
              isActive ? 'bg-accent' : 'hover:bg-accent/50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cor }} />
            <span className="flex-1 text-xs text-foreground truncate">{item.categoria_nome}</span>
            <span className="text-xs font-medium text-foreground shrink-0">{formatCurrencyBRL(item.total_gasto)}</span>
            <span className="text-xs text-muted-foreground shrink-0 w-10 text-right">{item.percentual_total.toFixed(1)}%</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Legenda desktop ──────────────────────────────────────────────────────────

interface LegendaDesktopProps {
  data: (GastoCategoriaComOrcamento & { index: number })[]
  activeIndex: number | null
  onHover: (index: number | null) => void
}

function LegendaDesktop({ data, activeIndex, onHover }: LegendaDesktopProps): React.JSX.Element {
  return (
    <div className="flex flex-col justify-center gap-1.5 max-h-64 overflow-y-auto pr-1">
      {data.map((item) => {
        const cor = getCategoriaColor(item.index, item.categoria_cor)
        const isActive = activeIndex === item.index
        return (
          <button
            key={item.categoria_id}
            type="button"
            onMouseEnter={() => onHover(item.index)}
            onMouseLeave={() => onHover(null)}
            className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors text-left ${
              isActive ? 'bg-accent' : 'hover:bg-accent/50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cor }} />
            <span className="flex-1 text-xs text-foreground truncate">{item.categoria_nome}</span>
            <div className="flex flex-col items-end shrink-0">
              <span className="text-xs font-medium text-foreground">{formatCurrencyBRL(item.total_gasto)}</span>
              <span className="text-[10px] text-muted-foreground">{item.percentual_total.toFixed(1)}%</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── GraficoPizzaCategorias ───────────────────────────────────────────────────

interface GraficoPizzaCategoriasProps {
  data: GastoCategoriaComOrcamento[]
  isLoading?: boolean
}

export function GraficoPizzaCategorias({ data, isLoading }: GraficoPizzaCategoriasProps): React.JSX.Element {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const desktop = isDesktop()

  const enriched = data.map((item, index) => ({ ...item, index }))
  const totalGasto = data.reduce((s, d) => s + d.total_gasto, 0)

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="h-5 w-48 bg-muted rounded animate-pulse mb-4" />
        <div className="flex gap-6 items-center">
          <div className="w-48 h-48 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-7 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 flex items-center justify-center min-h-40">
        <p className="text-sm text-muted-foreground">Nenhum dado para exibir no período</p>
      </div>
    )
  }

  const outerRadius = desktop ? 90 : 80
  const innerRadius = desktop ? 50 : 44

  const pieData = enriched.map((item) => ({
    ...item,
    value: item.total_gasto,
    name: item.categoria_nome,
  }))

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-foreground">Distribuição por Categoria</span>
        <span className="text-xs text-muted-foreground">
          Total: <span className="font-medium text-foreground">{formatCurrencyBRL(totalGasto)}</span>
        </span>
      </div>

      {desktop ? (
        /* Desktop: gráfico + legenda lado a lado */
        <div className="flex items-center gap-6">
          <div className="shrink-0 w-48 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={innerRadius}
                  outerRadius={outerRadius}
                  paddingAngle={2}
                  dataKey="value"
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.categoria_id}`}
                      fill={getCategoriaColor(index, entry.categoria_cor)}
                      opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 min-w-0">
            <LegendaDesktop data={enriched} activeIndex={activeIndex} onHover={setActiveIndex} />
          </div>
        </div>
      ) : (
        /* Mobile: gráfico centralizado + legenda com scroll abaixo */
        <div>
          <div className="w-full h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={innerRadius}
                  outerRadius={outerRadius}
                  paddingAngle={2}
                  dataKey="value"
                  onClick={(_, index) => setActiveIndex((v) => v === index ? null : index)}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.categoria_id}`}
                      fill={getCategoriaColor(index, entry.categoria_cor)}
                      opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <LegendaMobile data={enriched} activeIndex={activeIndex} onHover={setActiveIndex} />
        </div>
      )}
    </div>
  )
}
