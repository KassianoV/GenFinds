import React from 'react'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps): React.JSX.Element {
  return <div className={`animate-pulse bg-muted rounded-md ${className}`} />
}

// ─── Composições comuns ───────────────────────────────────────────────────────

export function SkeletonText({ className = '' }: SkeletonProps): React.JSX.Element {
  return <Skeleton className={`h-3 ${className}`} />
}

export function SkeletonTitle({ className = '' }: SkeletonProps): React.JSX.Element {
  return <Skeleton className={`h-5 ${className}`} />
}

export function SkeletonAvatar({ size = 10 }: { size?: number }): React.JSX.Element {
  return <Skeleton className={`rounded-full shrink-0 w-${size} h-${size}`} />
}

export function SkeletonCard({ className = '' }: SkeletonProps): React.JSX.Element {
  return <Skeleton className={`rounded-xl ${className}`} />
}

// ─── Linha de lista (ícone + texto + valor) ───────────────────────────────────

export function SkeletonListRow(): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-2.5 w-24" />
      </div>
      <Skeleton className="h-3 w-16 shrink-0" />
    </div>
  )
}

// ─── Card de resumo (ícone + label + valor) ───────────────────────────────────

export function SkeletonResumoCard(): React.JSX.Element {
  return (
    <div className="bg-card rounded-xl border border-border border-l-4 border-l-muted p-4 flex items-center gap-4 animate-pulse">
      <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

// ─── Gráfico (retângulo cinza) ─────────────────────────────────────────────

export function SkeletonChart({ height = 220 }: { height?: number }): React.JSX.Element {
  return <div className="animate-pulse bg-muted rounded-lg w-full" style={{ height }} />
}
