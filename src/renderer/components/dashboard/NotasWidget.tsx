import React from 'react'
import { Bell, Calendar, StickyNote } from 'lucide-react'
import { formatDate } from '../../../lib/format'
import type { Nota } from '../../../types/database.types'

const tipoIcon: Record<Nota['tipo'], React.ReactNode> = {
  lembrete: <Bell size={14} />,
  vencimento: <Calendar size={14} />,
  outro: <StickyNote size={14} />,
}

const tipoColor: Record<Nota['tipo'], string> = {
  lembrete: 'text-secondary bg-secondary/10',
  vencimento: 'text-destructive bg-destructive/10',
  outro: 'text-muted-foreground bg-muted',
}

interface NotasWidgetProps {
  notas: Nota[]
  loading: boolean
}

function SkeletonNota(): React.JSX.Element {
  return (
    <div className="flex items-start gap-3 py-2 animate-pulse">
      <div className="h-6 w-6 rounded-md bg-muted shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1">
        <div className="h-3.5 w-36 bg-muted rounded" />
        <div className="h-3 w-24 bg-muted rounded" />
      </div>
    </div>
  )
}

export function NotasWidget({ notas, loading }: NotasWidgetProps): React.JSX.Element {
  return (
    <div className="rounded-xl bg-card border border-border p-4">
      <h3 className="text-sm font-medium text-foreground mb-3">Lembretes e notas</h3>

      {loading ? (
        <div className="divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonNota key={i} />
          ))}
        </div>
      ) : notas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma nota ainda</p>
      ) : (
        <div className="divide-y divide-border">
          {notas.slice(0, 5).map((nota) => (
            <div key={nota.id} className="flex items-start gap-3 py-2">
              <div
                className={`p-1.5 rounded-md shrink-0 mt-0.5 ${tipoColor[nota.tipo]}`}
              >
                {tipoIcon[nota.tipo]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{nota.titulo}</p>
                {nota.data && (
                  <p className="text-xs text-muted-foreground">{formatDate(nota.data)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
