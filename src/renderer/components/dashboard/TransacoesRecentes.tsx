import React from 'react'
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { formatCurrencyBRL, formatDate } from '../../../lib/format'
import type { TransacaoCompleta } from '../../../types/database.types'

interface TransacoesRecentesProps {
  transacoes: TransacaoCompleta[]
  loading: boolean
}

function SkeletonItem(): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 py-2 animate-pulse">
      <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
      <div className="flex-1 space-y-1">
        <div className="h-3.5 w-32 bg-muted rounded" />
        <div className="h-3 w-20 bg-muted rounded" />
      </div>
      <div className="h-4 w-16 bg-muted rounded" />
    </div>
  )
}

export function TransacoesRecentes({
  transacoes,
  loading,
}: TransacoesRecentesProps): React.JSX.Element {
  return (
    <div className="rounded-xl bg-card border border-border p-4">
      <h3 className="text-sm font-medium text-foreground mb-3">Transações recentes</h3>

      {loading ? (
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonItem key={i} />
          ))}
        </div>
      ) : transacoes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhuma transação ainda
        </p>
      ) : (
        <div className="divide-y divide-border">
          {transacoes.map((t) => (
            <div key={t.id} className="flex items-center gap-3 py-2">
              <div
                className={`shrink-0 ${t.tipo === 'receita' ? 'text-primary' : 'text-destructive'}`}
              >
                {t.tipo === 'receita' ? (
                  <ArrowUpCircle size={28} strokeWidth={1.5} />
                ) : (
                  <ArrowDownCircle size={28} strokeWidth={1.5} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{t.descricao}</p>
                <p className="text-xs text-muted-foreground">
                  {t.categoria_nome} · {formatDate(t.data)}
                </p>
              </div>
              <span
                className={`text-sm font-semibold shrink-0 ${
                  t.tipo === 'receita' ? 'text-primary' : 'text-destructive'
                }`}
              >
                {t.tipo === 'receita' ? '+' : '-'} {formatCurrencyBRL(t.valor)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
