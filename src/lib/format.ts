import Decimal from 'decimal.js'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export function formatCurrency(value: string | number): string {
  return new Decimal(value).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function formatCurrencyBRL(value: string | number): string {
  return `R$ ${formatCurrency(value)}`
}

export function parseCurrency(formatted: string): string {
  return formatted.replace(/[R$\s.]/g, '').replace(',', '.')
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}
