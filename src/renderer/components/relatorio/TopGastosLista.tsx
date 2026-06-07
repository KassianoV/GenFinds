import React, { useState } from 'react'
import { ArrowDownCircle, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'
import { SkeletonListRow } from '../ui/Skeleton'
import { formatCurrencyBRL } from '../../../lib/format'
import { getCategoriaColor } from '../../../lib/constants'
import { isDesktop } from '../../services/platform'
import type { TransacaoCompleta } from '../../../types/database.types'

// ─── Detalhe da transação ─────────────────────────────────────────────────────

interface DetalhesProps {
  transacao: TransacaoCompleta
  posicao: number
}

function DetalheConteudo({ transacao, posicao }: DetalhesProps): React.JSX.Element {
  const data = new Date(transacao.data + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-4 pt-2 pb-2">
      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold text-muted-foreground tabular-nums">#{posicao}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{transacao.descricao}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{data}</p>
        </div>
        <span className="text-lg font-bold text-red-500 shrink-0">
          {formatCurrencyBRL(transacao.valor)}
        </span>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Categoria</span>
          <div className="flex items-center gap-1.5">
            {transacao.categoria_cor && (
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: transacao.categoria_cor }} />
            )}
            <span className="font-medium text-foreground">{transacao.categoria_nome}</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Conta</span>
          <span className="font-medium text-foreground">{transacao.conta_nome}</span>
        </div>
        {transacao.observacoes && (
          <div className="text-sm">
            <span className="text-muted-foreground">Observações</span>
            <p className="mt-1 text-foreground text-xs bg-muted rounded-lg p-2.5">{transacao.observacoes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── TopGastosLista ───────────────────────────────────────────────────────────

interface TopGastosListaProps {
  data: TransacaoCompleta[]
  isLoading: boolean
}

export function TopGastosLista({ data, isLoading }: TopGastosListaProps): React.JSX.Element {
  const [selected, setSelected] = useState<{ t: TransacaoCompleta; pos: number } | null>(null)
  const desktop = isDesktop()

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Top 10 Maiores Gastos</span>
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonListRow key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Top 10 Maiores Gastos</span>
        </div>

        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <ArrowDownCircle size={28} className="text-muted-foreground mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">Nenhum gasto no período selecionado</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.map((t, i) => {
              const pos = i + 1
              const cor = getCategoriaColor(i, t.categoria_cor)
              const dataFmt = new Date(t.data + 'T12:00:00').toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'short',
              })

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelected({ t, pos })}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors text-left group"
                >
                  {/* Posição */}
                  <span className="text-xs font-bold text-muted-foreground tabular-nums w-5 shrink-0">
                    {pos}
                  </span>

                  {/* Ícone cor */}
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: cor + '22' }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cor }} />
                  </span>

                  {/* Descrição + categoria */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.descricao}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {t.categoria_nome} · {dataFmt}
                    </p>
                  </div>

                  {/* Valor */}
                  <span className="text-sm font-semibold text-red-500 shrink-0">
                    {formatCurrencyBRL(t.valor)}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Detalhe — Dialog desktop / Sheet mobile */}
      {selected && desktop && (
        <Dialog open onOpenChange={() => setSelected(null)}>
          <DialogContent className="sm:max-w-96">
            <DialogHeader>
              <DialogTitle>Detalhes do Gasto</DialogTitle>
            </DialogHeader>
            <DetalheConteudo transacao={selected.t} posicao={selected.pos} />
          </DialogContent>
        </Dialog>
      )}

      {selected && !desktop && (
        <Sheet open onOpenChange={() => setSelected(null)}>
          <SheetContent side="bottom" className="max-h-[70vh] rounded-t-2xl px-6 pt-4">
            <SheetHeader className="mb-3">
              <SheetTitle>Detalhes do Gasto</SheetTitle>
            </SheetHeader>
            <DetalheConteudo transacao={selected.t} posicao={selected.pos} />
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}
