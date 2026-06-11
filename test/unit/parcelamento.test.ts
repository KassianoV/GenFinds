import { describe, it, expect } from 'vitest'

// ─── Funções puras de parcelamento (espelham a lógica do service) ────────────

function calcularParcelamento(valorCentavos: number, numeroParcelas: number) {
  if (numeroParcelas < 2 || numeroParcelas > 48) {
    throw new RangeError('Número de parcelas deve ser entre 2 e 48')
  }
  if (valorCentavos <= 0) {
    throw new RangeError('Valor deve ser maior que zero')
  }
  const valorParcela = Math.floor(valorCentavos / numeroParcelas)
  const resto = valorCentavos - valorParcela * numeroParcelas
  return { valorParcela, resto, total: valorCentavos, numeroParcelas }
}

function gerarDatasParcelamento(dataBase: string, numeroParcelas: number): string[] {
  const [year, month, day] = dataBase.split('-').map(Number)
  const datas: string[] = []
  for (let i = 0; i < numeroParcelas; i++) {
    const d = new Date(year, month - 1 + i, day)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    datas.push(`${y}-${m}-${dd}`)
  }
  return datas
}

// ─── calcularParcelamento — valores ─────────────────────────────────────────

describe('calcularParcelamento — divisão de valores', () => {
  it('divide valor exato igualmente', () => {
    const r = calcularParcelamento(10000, 4) // R$ 100,00 ÷ 4 = R$ 25,00
    expect(r.valorParcela).toBe(2500)
    expect(r.resto).toBe(0)
  })

  it('distribui centavos restantes no total', () => {
    const r = calcularParcelamento(10001, 3) // R$ 100,01 ÷ 3
    expect(r.valorParcela * r.numeroParcelas + r.resto).toBe(10001)
  })

  it('valor da parcela não excede o total', () => {
    const r = calcularParcelamento(5000, 12)
    expect(r.valorParcela * r.numeroParcelas).toBeLessThanOrEqual(r.total)
  })

  it('12x de R$ 1.000,00 = R$ 83,33 por parcela + resto', () => {
    const r = calcularParcelamento(100000, 12)
    expect(r.valorParcela).toBe(8333)
    expect(r.resto).toBe(4) // 4 centavos de arredondamento
  })

  it('2 parcelas — valor mínimo permitido', () => {
    expect(() => calcularParcelamento(10000, 2)).not.toThrow()
    const r = calcularParcelamento(10000, 2)
    expect(r.valorParcela).toBe(5000)
  })

  it('48 parcelas — valor máximo permitido', () => {
    expect(() => calcularParcelamento(48000, 48)).not.toThrow()
    const r = calcularParcelamento(48000, 48)
    expect(r.valorParcela).toBe(1000)
  })
})

// ─── calcularParcelamento — validações ───────────────────────────────────────

describe('calcularParcelamento — entradas inválidas', () => {
  it('rejeita 1 parcela', () => {
    expect(() => calcularParcelamento(10000, 1)).toThrow(RangeError)
  })

  it('rejeita 49 parcelas', () => {
    expect(() => calcularParcelamento(10000, 49)).toThrow(RangeError)
  })

  it('rejeita 0 parcelas', () => {
    expect(() => calcularParcelamento(10000, 0)).toThrow(RangeError)
  })

  it('rejeita valor zero', () => {
    expect(() => calcularParcelamento(0, 3)).toThrow(RangeError)
  })

  it('rejeita valor negativo', () => {
    expect(() => calcularParcelamento(-5000, 3)).toThrow(RangeError)
  })

  it('mensagem de erro correta para parcelas fora do range', () => {
    expect(() => calcularParcelamento(10000, 1)).toThrow('Número de parcelas deve ser entre 2 e 48')
  })

  it('mensagem de erro correta para valor inválido', () => {
    expect(() => calcularParcelamento(0, 3)).toThrow('Valor deve ser maior que zero')
  })
})

// ─── gerarDatasParcelamento ───────────────────────────────────────────────────

describe('gerarDatasParcelamento — quantidade e formato', () => {
  it('gera exatamente n datas', () => {
    expect(gerarDatasParcelamento('2026-06-01', 6)).toHaveLength(6)
  })

  it('primeira data é a data base', () => {
    const datas = gerarDatasParcelamento('2026-06-15', 3)
    expect(datas[0]).toBe('2026-06-15')
  })

  it('datas no formato yyyy-MM-dd', () => {
    const datas = gerarDatasParcelamento('2026-06-01', 3)
    datas.forEach((d) => expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/))
  })
})

describe('gerarDatasParcelamento — avanço mensal', () => {
  it('avança um mês por parcela', () => {
    const datas = gerarDatasParcelamento('2026-01-10', 3)
    expect(datas[0]).toBe('2026-01-10')
    expect(datas[1]).toBe('2026-02-10')
    expect(datas[2]).toBe('2026-03-10')
  })

  it('atravessa virada de ano', () => {
    const datas = gerarDatasParcelamento('2026-11-05', 3)
    expect(datas[2]).toBe('2027-01-05')
  })

  it('12 parcelas cobrem 12 meses distintos', () => {
    const datas = gerarDatasParcelamento('2026-01-01', 12)
    const meses = new Set(datas.map((d) => d.slice(0, 7)))
    expect(meses.size).toBe(12)
  })

  it('48 parcelas — última data é 47 meses após a base', () => {
    const datas = gerarDatasParcelamento('2024-01-01', 48)
    expect(datas[47]).toBe('2027-12-01')
  })
})
