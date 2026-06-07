import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, TrendingUp, TrendingDown } from 'lucide-react'
import { SkeletonListRow } from '../ui/Skeleton'
import { formatCurrencyBRL } from '../../../lib/format'
import type { GastoCategoriaComOrcamento } from '../../hooks/useRelatorio'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type SortCol = 'categoria' | 'total_gasto' | 'percentual' | 'orcamento' | 'status'
type SortDir = 'asc' | 'desc'

// ─── SortHeader ───────────────────────────────────────────────────────────────

interface SortHeaderProps {
  col: SortCol
  label: string
  sortCol: SortCol
  sortDir: SortDir
  onSort: (col: SortCol) => void
  className?: string
}

function SortHeader({ col, label, sortCol, sortDir, onSort, className = '' }: SortHeaderProps): React.JSX.Element {
  const active = sortCol === col
  return (
    <button
      onClick={() => onSort(col)}
      className={`flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors whitespace-nowrap ${className}`}
    >
      {label}
      {active ? (
        sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      ) : (
        <ChevronsUpDown size={12} className="opacity-40" />
      )}
    </button>
  )
}

// ─── BarraProgresso ───────────────────────────────────────────────────────────

function BarraProgresso({ valor, cor }: { valor: number; cor?: string }): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden min-w-12">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, valor)}%`, backgroundColor: cor ?? '#6366f1' }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-10 text-right shrink-0">
        {valor.toFixed(1)}%
      </span>
    </div>
  )
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ gasto, orcamento }: { gasto: number; orcamento: number }): React.JSX.Element {
  if (orcamento === 0) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  const acima = gasto > orcamento
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
        acima
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      }`}
    >
      {acima ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {acima ? 'Acima' : 'Dentro'}
    </span>
  )
}

// ─── GastosPorCategoriaTable ──────────────────────────────────────────────────

interface GastosPorCategoriaTableProps {
  data: GastoCategoriaComOrcamento[]
  isLoading: boolean
}

export function GastosPorCategoriaTable({ data, isLoading }: GastosPorCategoriaTableProps): React.JSX.Element {
  const [sortCol, setSortCol] = useState<SortCol>('total_gasto')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(col: SortCol): void {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('desc') }
  }

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      let cmp = 0
      switch (sortCol) {
        case 'categoria': cmp = a.categoria_nome.localeCompare(b.categoria_nome); break
        case 'total_gasto': cmp = a.total_gasto - b.total_gasto; break
        case 'percentual': cmp = a.percentual_total - b.percentual_total; break
        case 'orcamento': cmp = a.orcamento - b.orcamento; break
        case 'status': {
          const statusA = a.orcamento > 0 ? (a.total_gasto > a.orcamento ? 1 : 0) : -1
          const statusB = b.orcamento > 0 ? (b.total_gasto > b.orcamento ? 1 : 0) : -1
          cmp = statusA - statusB
          break
        }
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortCol, sortDir])

  const totalGasto = data.reduce((s, g) => s + g.total_gasto, 0)

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Gastos por Categoria</span>
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonListRow key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Gastos por Categoria</span>
        {data.length > 0 && (
          <span className="text-xs text-muted-foreground">
            Total: <span className="font-medium text-foreground">{formatCurrencyBRL(totalGasto)}</span>
          </span>
        )}
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Nenhum gasto no período selecionado
        </div>
      ) : (
        /* Scroll horizontal no mobile */
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left">
                  <SortHeader col="categoria" label="Categoria" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-2.5 text-right">
                  <SortHeader col="total_gasto" label="Total Gasto" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="justify-end" />
                </th>
                <th className="px-4 py-2.5 w-44">
                  <SortHeader col="percentual" label="% do Total" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-2.5 text-right">
                  <SortHeader col="orcamento" label="Orçamento" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="justify-end" />
                </th>
                <th className="px-4 py-2.5 text-center">
                  <SortHeader col="status" label="Status" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="justify-center" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((row) => (
                <tr key={row.categoria_id} className="hover:bg-accent/40 transition-colors">
                  {/* Categoria */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: row.categoria_cor ?? '#94a3b8' }}
                      />
                      <span className="text-sm font-medium text-foreground">{row.categoria_nome}</span>
                    </div>
                  </td>
                  {/* Total gasto */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-red-500">
                      {formatCurrencyBRL(row.total_gasto)}
                    </span>
                  </td>
                  {/* % do total */}
                  <td className="px-4 py-3 w-44">
                    <BarraProgresso valor={row.percentual_total} cor={row.categoria_cor} />
                  </td>
                  {/* Orçamento */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-muted-foreground">
                      {row.orcamento > 0 ? formatCurrencyBRL(row.orcamento) : '—'}
                    </span>
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <StatusBadge gasto={row.total_gasto} orcamento={row.orcamento} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
