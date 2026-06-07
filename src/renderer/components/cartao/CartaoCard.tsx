import React from 'react'
import { CreditCard, Check, Pencil, Trash2 } from 'lucide-react'
import { formatCurrencyBRL } from '../../../lib/format'
import type { Cartao } from '../../../types/database.types'

export const CARD_GRADIENTS = [
  'from-blue-600 to-indigo-700',
  'from-violet-600 to-purple-700',
  'from-emerald-500 to-teal-700',
  'from-rose-500 to-pink-700',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-sky-700',
]

export const STATUS_CONFIG: Record<Cartao['status'], { label: string; className: string }> = {
  aberta: { label: 'Aberta', className: 'bg-emerald-500/20 text-emerald-300' },
  fechada: { label: 'Fechada', className: 'bg-amber-500/20 text-amber-300' },
  paga: { label: 'Paga', className: 'bg-blue-500/20 text-blue-300' },
  pendente: { label: 'Pendente', className: 'bg-red-500/20 text-red-300' },
}

export interface CartaoCardProps {
  cartao: Cartao
  index: number
  onEdit: () => void
  onDelete: () => void
  onMarkAsPaid?: () => void
}

export function CartaoCard({
  cartao,
  index,
  onEdit,
  onDelete,
  onMarkAsPaid,
}: CartaoCardProps): React.JSX.Element {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length]
  const status = STATUS_CONFIG[cartao.status]

  const cardStyle = cartao.cor
    ? { background: `linear-gradient(135deg, ${cartao.cor}f0, ${cartao.cor}99)` }
    : undefined
  const cardClass = `relative rounded-2xl p-5 text-white overflow-hidden group select-none h-full ${
    cartao.cor ? '' : `bg-gradient-to-br ${gradient}`
  }`

  return (
    <div className={cardClass} style={cardStyle}>
      <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-6 -left-4 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-white/70" />
            <p className="font-bold text-base leading-tight">{cartao.nome}</p>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.className}`}>
            {status.label}
          </span>
        </div>

        <div className="mb-5">
          <p className="text-white/60 text-xs mb-0.5">Fatura atual</p>
          <p className="text-2xl font-bold tracking-tight">{formatCurrencyBRL(cartao.valor)}</p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-xs">Vence dia {cartao.vencimento} de cada mês</p>
            {cartao.status === 'fechada' && (
              <p className="text-amber-300 text-xs mt-0.5 font-medium">
                Fatura fechada · aguardando vencimento
              </p>
            )}
            {cartao.status === 'pendente' && (
              <p className="text-red-300 text-xs mt-0.5 font-medium">Pagamento pendente</p>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {cartao.status === 'pendente' && onMarkAsPaid && (
              <button
                onClick={onMarkAsPaid}
                className="p-1.5 rounded-lg bg-emerald-500/70 hover:bg-emerald-500 transition-colors"
                title="Marcar como pago"
              >
                <Check size={12} />
              </button>
            )}
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
              title="Editar"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-red-500/60 transition-colors"
              title="Remover"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
