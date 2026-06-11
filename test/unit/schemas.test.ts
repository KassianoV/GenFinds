import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// ─── Schemas (espelho dos schemas da aplicação) ───────────────────────────────

const compraParceladaSchema = z.object({
  cartao_id: z.string().min(1, 'Selecione um cartão'),
  descricao: z.string().min(1, 'Descrição obrigatória').max(100, 'Máximo 100 caracteres'),
  valorCentavos: z.number().int().min(1, 'Informe um valor maior que zero'),
  numeroParcelas: z.number().int().min(2, 'Mínimo 2 parcelas').max(48, 'Máximo 48 parcelas'),
  data: z.string().min(1, 'Data obrigatória'),
  categoria_id: z.string().optional(),
})

const transacaoSchema = z.object({
  descricao: z.string().min(1, 'Descrição obrigatória').max(200),
  valor: z.number().positive('Valor deve ser positivo'),
  tipo: z.enum(['receita', 'despesa']),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  conta_id: z.number().int().positive(),
  categoria_id: z.number().int().positive(),
  observacoes: z.string().max(500).optional(),
})

// ─── compraParceladaSchema ────────────────────────────────────────────────────

describe('compraParceladaSchema — dados válidos', () => {
  it('aceita entrada completa e válida', () => {
    const r = compraParceladaSchema.safeParse({
      cartao_id: '1',
      descricao: 'TV Samsung',
      valorCentavos: 250000,
      numeroParcelas: 12,
      data: '2026-06-01',
      categoria_id: '3',
    })
    expect(r.success).toBe(true)
  })

  it('aceita sem categoria_id (campo opcional)', () => {
    const r = compraParceladaSchema.safeParse({
      cartao_id: '1',
      descricao: 'Compra',
      valorCentavos: 10000,
      numeroParcelas: 2,
      data: '2026-06-01',
    })
    expect(r.success).toBe(true)
  })

  it('aceita 2 parcelas (mínimo)', () => {
    const r = compraParceladaSchema.safeParse({
      cartao_id: '1',
      descricao: 'Compra',
      valorCentavos: 5000,
      numeroParcelas: 2,
      data: '2026-06-01',
    })
    expect(r.success).toBe(true)
  })

  it('aceita 48 parcelas (máximo)', () => {
    const r = compraParceladaSchema.safeParse({
      cartao_id: '2',
      descricao: 'Sofá',
      valorCentavos: 480000,
      numeroParcelas: 48,
      data: '2026-06-01',
    })
    expect(r.success).toBe(true)
  })
})

describe('compraParceladaSchema — rejeições', () => {
  it('rejeita cartao_id vazio', () => {
    const r = compraParceladaSchema.safeParse({
      cartao_id: '',
      descricao: 'Compra',
      valorCentavos: 10000,
      numeroParcelas: 3,
      data: '2026-06-01',
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Selecione um cartão')
  })

  it('rejeita descricao vazia', () => {
    const r = compraParceladaSchema.safeParse({
      cartao_id: '1',
      descricao: '',
      valorCentavos: 10000,
      numeroParcelas: 3,
      data: '2026-06-01',
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Descrição obrigatória')
  })

  it('rejeita descricao acima de 100 caracteres', () => {
    const r = compraParceladaSchema.safeParse({
      cartao_id: '1',
      descricao: 'x'.repeat(101),
      valorCentavos: 10000,
      numeroParcelas: 3,
      data: '2026-06-01',
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Máximo 100 caracteres')
  })

  it('rejeita valorCentavos zero', () => {
    const r = compraParceladaSchema.safeParse({
      cartao_id: '1',
      descricao: 'Compra',
      valorCentavos: 0,
      numeroParcelas: 3,
      data: '2026-06-01',
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Informe um valor maior que zero')
  })

  it('rejeita valorCentavos negativo', () => {
    const r = compraParceladaSchema.safeParse({
      cartao_id: '1',
      descricao: 'Compra',
      valorCentavos: -1,
      numeroParcelas: 3,
      data: '2026-06-01',
    })
    expect(r.success).toBe(false)
  })

  it('rejeita numeroParcelas menor que 2', () => {
    const r = compraParceladaSchema.safeParse({
      cartao_id: '1',
      descricao: 'Compra',
      valorCentavos: 10000,
      numeroParcelas: 1,
      data: '2026-06-01',
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Mínimo 2 parcelas')
  })

  it('rejeita numeroParcelas maior que 48', () => {
    const r = compraParceladaSchema.safeParse({
      cartao_id: '1',
      descricao: 'Compra',
      valorCentavos: 10000,
      numeroParcelas: 49,
      data: '2026-06-01',
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Máximo 48 parcelas')
  })

  it('rejeita data vazia', () => {
    const r = compraParceladaSchema.safeParse({
      cartao_id: '1',
      descricao: 'Compra',
      valorCentavos: 10000,
      numeroParcelas: 3,
      data: '',
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Data obrigatória')
  })

  it('rejeita numeroParcelas não-inteiro', () => {
    const r = compraParceladaSchema.safeParse({
      cartao_id: '1',
      descricao: 'Compra',
      valorCentavos: 10000,
      numeroParcelas: 2.5,
      data: '2026-06-01',
    })
    expect(r.success).toBe(false)
  })
})

// ─── transacaoSchema ──────────────────────────────────────────────────────────

describe('transacaoSchema — dados válidos', () => {
  it('aceita despesa completa', () => {
    const r = transacaoSchema.safeParse({
      descricao: 'Aluguel',
      valor: 1200.0,
      tipo: 'despesa',
      data: '2026-06-01',
      conta_id: 1,
      categoria_id: 2,
    })
    expect(r.success).toBe(true)
  })

  it('aceita receita', () => {
    const r = transacaoSchema.safeParse({
      descricao: 'Salário',
      valor: 5000,
      tipo: 'receita',
      data: '2026-06-05',
      conta_id: 1,
      categoria_id: 3,
    })
    expect(r.success).toBe(true)
  })

  it('aceita com observacoes', () => {
    const r = transacaoSchema.safeParse({
      descricao: 'Consulta médica',
      valor: 300,
      tipo: 'despesa',
      data: '2026-06-10',
      conta_id: 1,
      categoria_id: 4,
      observacoes: 'Plano de saúde cobre 50%',
    })
    expect(r.success).toBe(true)
  })
})

describe('transacaoSchema — rejeições', () => {
  it('rejeita tipo inválido', () => {
    const r = transacaoSchema.safeParse({
      descricao: 'Teste',
      valor: 100,
      tipo: 'investimento',
      data: '2026-06-01',
      conta_id: 1,
      categoria_id: 1,
    })
    expect(r.success).toBe(false)
  })

  it('rejeita valor negativo', () => {
    const r = transacaoSchema.safeParse({
      descricao: 'Teste',
      valor: -100,
      tipo: 'despesa',
      data: '2026-06-01',
      conta_id: 1,
      categoria_id: 1,
    })
    expect(r.success).toBe(false)
  })

  it('rejeita valor zero', () => {
    const r = transacaoSchema.safeParse({
      descricao: 'Teste',
      valor: 0,
      tipo: 'despesa',
      data: '2026-06-01',
      conta_id: 1,
      categoria_id: 1,
    })
    expect(r.success).toBe(false)
  })

  it('rejeita data no formato dd/MM/yyyy', () => {
    const r = transacaoSchema.safeParse({
      descricao: 'Teste',
      valor: 100,
      tipo: 'despesa',
      data: '01/06/2026',
      conta_id: 1,
      categoria_id: 1,
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Data inválida')
  })

  it('rejeita descricao vazia', () => {
    const r = transacaoSchema.safeParse({
      descricao: '',
      valor: 100,
      tipo: 'despesa',
      data: '2026-06-01',
      conta_id: 1,
      categoria_id: 1,
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Descrição obrigatória')
  })
})
