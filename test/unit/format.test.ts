import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatCurrencyBRL,
  parseCurrency,
  formatDate,
  toISODate
} from '@/lib/format'

describe('formatCurrency', () => {
  it('formata valor positivo', () => {
    expect(formatCurrency(1234.56)).toBe('1.234,56')
  })

  it('formata zero', () => {
    expect(formatCurrency(0)).toBe('0,00')
  })

  it('formata string numerica', () => {
    expect(formatCurrency('999.99')).toBe('999,99')
  })
})

describe('formatCurrencyBRL', () => {
  it('adiciona prefixo R$', () => {
    expect(formatCurrencyBRL(1234.56)).toBe('R$ 1.234,56')
  })
})

describe('parseCurrency', () => {
  it('converte moeda formatada de volta para numero string', () => {
    expect(parseCurrency('R$ 1.234,56')).toBe('1234.56')
  })
})

describe('formatDate', () => {
  it('formata ISO date para dd/MM/yyyy', () => {
    expect(formatDate('2026-01-15')).toBe('15/01/2026')
  })
})

describe('toISODate', () => {
  it('converte Date para string ISO yyyy-MM-dd', () => {
    expect(toISODate(new Date(2026, 0, 15))).toBe('2026-01-15')
  })
})
