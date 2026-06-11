import { describe, it, expect } from 'vitest'
import type { Transacao, TransacaoCompleta } from '@/types/database.types'
import type { DatabaseService } from '@/renderer/services/database/types'

function createTransacaoService(): DatabaseService['transacao'] {
  let nextId = 1
  const store: Transacao[] = []
  const now = () => new Date().toISOString()

  return {
    async create(input) {
      const t: Transacao = { ...input, id: nextId++, created_at: now(), updated_at: now() }
      store.push(t)
      return { success: true, data: t }
    },
    async list(usuarioId, limit) {
      const rows = store
        .filter((t) => t.usuario_id === usuarioId)
        .slice(0, limit ?? store.length)
        .map<TransacaoCompleta>((t) => ({ ...t, conta_nome: 'Conta', categoria_nome: 'Geral' }))
      return { success: true, data: rows }
    },
    async listPaginated(usuarioId, page = 1, pageSize = 10) {
      const all = store.filter((t) => t.usuario_id === usuarioId)
      const start = (page - 1) * pageSize
      const data = all
        .slice(start, start + pageSize)
        .map<TransacaoCompleta>((t) => ({ ...t, conta_nome: 'Conta', categoria_nome: 'Geral' }))
      return {
        success: true,
        data: {
          data,
          pagination: {
            page,
            pageSize,
            total: all.length,
            totalPages: Math.ceil(all.length / pageSize),
            hasNext: start + pageSize < all.length,
            hasPrev: page > 1,
          },
        },
      }
    },
    async get(id, usuarioId) {
      return { success: true, data: store.find((t) => t.id === id && t.usuario_id === usuarioId) }
    },
    async update(id, usuarioId, updates) {
      const idx = store.findIndex((t) => t.id === id && t.usuario_id === usuarioId)
      if (idx === -1) return { success: false, error: 'Não encontrado' }
      store[idx] = { ...store[idx], ...updates, updated_at: now() }
      return { success: true, data: true }
    },
    async delete(id, usuarioId) {
      const idx = store.findIndex((t) => t.id === id && t.usuario_id === usuarioId)
      if (idx === -1) return { success: false, error: 'Não encontrado' }
      store.splice(idx, 1)
      return { success: true, data: true }
    },
  }
}

const BASE: Omit<Transacao, 'id' | 'created_at' | 'updated_at'> = {
  usuario_id: 1,
  descricao: 'Mercado',
  valor: 150.0,
  tipo: 'despesa',
  data: '2026-06-01',
  conta_id: 10,
  categoria_id: 5,
}

describe('transacao.create', () => {
  it('cria transação e retorna com id numérico', async () => {
    const svc = createTransacaoService()
    const r = await svc.create(BASE)
    expect(r.success).toBe(true)
    expect(r.data?.id).toBeTypeOf('number')
    expect(r.data?.descricao).toBe('Mercado')
  })

  it('ids são sequenciais', async () => {
    const svc = createTransacaoService()
    const a = await svc.create(BASE)
    const b = await svc.create({ ...BASE, descricao: 'Farmácia' })
    expect(b.data!.id).toBe(a.data!.id + 1)
  })

  it('preserva tipo receita e valor', async () => {
    const svc = createTransacaoService()
    const r = await svc.create({ ...BASE, tipo: 'receita', valor: 5000 })
    expect(r.data?.tipo).toBe('receita')
    expect(r.data?.valor).toBe(5000)
  })

  it('armazena ofx_id quando fornecido', async () => {
    const svc = createTransacaoService()
    const r = await svc.create({ ...BASE, ofx_id: 'TXN-ABC-001' })
    expect(r.data?.ofx_id).toBe('TXN-ABC-001')
  })

  it('popula created_at e updated_at', async () => {
    const svc = createTransacaoService()
    const r = await svc.create(BASE)
    expect(r.data?.created_at).toBeTruthy()
    expect(r.data?.updated_at).toBeTruthy()
  })
})

describe('transacao.update', () => {
  it('atualiza descrição e valor', async () => {
    const svc = createTransacaoService()
    await svc.create(BASE)
    await svc.update(1, 1, { descricao: 'Supermercado', valor: 200 })
    const got = await svc.get(1, 1)
    expect(got.data?.descricao).toBe('Supermercado')
    expect(got.data?.valor).toBe(200)
  })

  it('retorna success true ao atualizar', async () => {
    const svc = createTransacaoService()
    await svc.create(BASE)
    const r = await svc.update(1, 1, { valor: 99 })
    expect(r.success).toBe(true)
    expect(r.data).toBe(true)
  })

  it('retorna erro para id inexistente', async () => {
    const svc = createTransacaoService()
    const r = await svc.update(999, 1, { descricao: 'X' })
    expect(r.success).toBe(false)
    expect(r.error).toBeDefined()
  })

  it('isola por usuario_id — não atualiza transação de outro usuário', async () => {
    const svc = createTransacaoService()
    await svc.create(BASE) // usuario 1, id 1
    const r = await svc.update(1, 2, { descricao: 'Invasão' })
    expect(r.success).toBe(false)
    const intacta = await svc.get(1, 1)
    expect(intacta.data?.descricao).toBe('Mercado')
  })
})

describe('transacao.delete', () => {
  it('remove transação existente', async () => {
    const svc = createTransacaoService()
    await svc.create(BASE)
    const r = await svc.delete(1, 1)
    expect(r.success).toBe(true)
    const got = await svc.get(1, 1)
    expect(got.data).toBeUndefined()
  })

  it('retorna erro ao deletar id inexistente', async () => {
    const svc = createTransacaoService()
    const r = await svc.delete(999, 1)
    expect(r.success).toBe(false)
  })

  it('não deleta transação de outro usuário', async () => {
    const svc = createTransacaoService()
    await svc.create(BASE)
    const r = await svc.delete(1, 2)
    expect(r.success).toBe(false)
    expect((await svc.get(1, 1)).data).toBeDefined()
  })
})

describe('transacao.list', () => {
  it('lista apenas transações do usuário correto', async () => {
    const svc = createTransacaoService()
    await svc.create(BASE)
    await svc.create({ ...BASE, usuario_id: 2 })
    const r = await svc.list(1)
    expect(r.data?.length).toBe(1)
    expect(r.data?.[0].usuario_id).toBe(1)
  })

  it('respeita o limit', async () => {
    const svc = createTransacaoService()
    for (let i = 0; i < 5; i++) await svc.create(BASE)
    const r = await svc.list(1, 3)
    expect(r.data?.length).toBe(3)
  })

  it('retorna lista vazia para usuário sem transações', async () => {
    const svc = createTransacaoService()
    const r = await svc.list(99)
    expect(r.success).toBe(true)
    expect(r.data?.length).toBe(0)
  })
})

describe('transacao.listPaginated', () => {
  it('primeira página retorna pageSize itens', async () => {
    const svc = createTransacaoService()
    for (let i = 0; i < 15; i++) await svc.create(BASE)
    const r = await svc.listPaginated(1, 1, 10)
    expect(r.data?.data.length).toBe(10)
    expect(r.data?.pagination.hasNext).toBe(true)
    expect(r.data?.pagination.hasPrev).toBe(false)
  })

  it('última página retorna o restante', async () => {
    const svc = createTransacaoService()
    for (let i = 0; i < 15; i++) await svc.create(BASE)
    const r = await svc.listPaginated(1, 2, 10)
    expect(r.data?.data.length).toBe(5)
    expect(r.data?.pagination.hasNext).toBe(false)
    expect(r.data?.pagination.hasPrev).toBe(true)
  })

  it('totalPages calculado corretamente', async () => {
    const svc = createTransacaoService()
    for (let i = 0; i < 25; i++) await svc.create(BASE)
    const r = await svc.listPaginated(1, 1, 10)
    expect(r.data?.pagination.totalPages).toBe(3)
    expect(r.data?.pagination.total).toBe(25)
  })
})
