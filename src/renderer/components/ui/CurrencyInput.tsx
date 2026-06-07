import React from 'react'
import { cn } from '@/lib/utils'

interface CurrencyInputProps {
  valorEmCentavos: number
  onChange: (centavos: number) => void
  id?: string
  className?: string
  disabled?: boolean
}

function formatCentavos(centavos: number): string {
  if (centavos <= 0) return ''
  const str = String(centavos).padStart(3, '0')
  const intPart = str.slice(0, -2)
  const decPart = str.slice(-2)
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${intFormatted},${decPart}`
}

export function CurrencyInput({
  valorEmCentavos,
  onChange,
  id,
  className,
  disabled,
}: CurrencyInputProps): React.JSX.Element {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const digits = e.target.value.replace(/\D/g, '')
    const centavos = digits === '' ? 0 : Math.min(parseInt(digits, 10), 999_999_999)
    onChange(centavos)
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      value={formatCentavos(valorEmCentavos)}
      onChange={handleChange}
      placeholder="0,00"
      disabled={disabled}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
        'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    />
  )
}
