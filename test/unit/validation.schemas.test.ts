// test/unit/validation.schemas.test.ts
/**
 * Testes de Validação - Schemas Zod
 *
 * Testa os schemas de validação para:
 * - Cartão (CartaoCreateSchema, CartaoUpdateSchema)
 * - Parcela (ParcelaCreateSchema, ParcelaUpdateSchema)
 * - Transação de Cartão (TransacaoCartaoCreateSchema, TransacaoCartaoUpdateSchema)
 * - Transação Parcelada (TransacaoParceladaSchema)
 * - Data (DataSchema)
 */

import {
  CartaoCreateSchema,
  CartaoUpdateSchema,
  ParcelaCreateSchema,
  ParcelaUpdateSchema,
  TransacaoCartaoCreateSchema,
  TransacaoCartaoUpdateSchema,
  TransacaoParceladaSchema,
  DataSchema,
  validateData,
} from '../../src/main/validation';

describe('Validação Zod - Schemas de Cartão', () => {
  describe('CartaoCreateSchema', () => {
    test('deve aceitar cartão válido com todos os campos', () => {
      const result = CartaoCreateSchema.safeParse({
        usuario_id: 1,
        nome: 'Nubank Roxinho',
        valor: 0,
        vencimento: 15,
        status: 'aberta',
      });
      expect(result.success).toBe(true);
    });

    test('deve aceitar cartão com valores padrão', () => {
      const result = CartaoCreateSchema.safeParse({
        usuario_id: 1,
        nome: 'Visa',
        vencimento: 10,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.valor).toBe(0);
        expect(result.data.status).toBe('aberta');
      }
    });

    test('deve rejeitar cartão sem nome', () => {
      const result = CartaoCreateSchema.safeParse({
        usuario_id: 1,
        vencimento: 15,
      });
      expect(result.success).toBe(false);
    });

    test('deve rejeitar cartão com nome vazio', () => {
      const result = CartaoCreateSchema.safeParse({
        usuario_id: 1,
        nome: '',
        vencimento: 15,
      });
      expect(result.success).toBe(false);
    });

    test('deve rejeitar vencimento menor que 1', () => {
      const result = CartaoCreateSchema.safeParse({
        usuario_id: 1,
        nome: 'Visa',
        vencimento: 0,
      });
      expect(result.success).toBe(false);
    });

    test('deve rejeitar vencimento maior que 31', () => {
      const result = CartaoCreateSchema.safeParse({
        usuario_id: 1,
        nome: 'Visa',
        vencimento: 32,
      });
      expect(result.success).toBe(false);
    });

    test('deve rejeitar vencimento decimal', () => {
      const result = CartaoCreateSchema.safeParse({
        usuario_id: 1,
        nome: 'Visa',
        vencimento: 15.5,
      });
      expect(result.success).toBe(false);
    });

    test('deve rejeitar usuario_id inválido', () => {
      const result = CartaoCreateSchema.safeParse({
        usuario_id: -1,
        nome: 'Visa',
        vencimento: 15,
      });
      expect(result.success).toBe(false);
    });

    test('deve rejeitar valor negativo', () => {
      const result = CartaoCreateSchema.safeParse({
        usuario_id: 1,
        nome: 'Visa',
        valor: -100,
        vencimento: 15,
      });
      expect(result.success).toBe(false);
    });

    test('deve rejeitar status inválido', () => {
      const result = CartaoCreateSchema.safeParse({
        usuario_id: 1,
        nome: 'Visa',
        vencimento: 15,
        status: 'invalido',
      });
      expect(result.success).toBe(false);
    });

    test('deve aceitar todos os status válidos', () => {
      const statusValidos = ['aberta', 'fechada', 'paga', 'pendente'];
      statusValidos.forEach((status) => {
        const result = CartaoCreateSchema.safeParse({
          usuario_id: 1,
          nome: 'Visa',
          vencimento: 15,
          status,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('CartaoUpdateSchema', () => {
    test('deve aceitar atualização parcial', () => {
      const result = CartaoUpdateSchema.safeParse({ nome: 'Novo Nome' });
      expect(result.success).toBe(true);
    });

    test('deve rejeitar objeto vazio', () => {
      const result = CartaoUpdateSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    test('deve aceitar atualização de vencimento', () => {
      const result = CartaoUpdateSchema.safeParse({ vencimento: 20 });
      expect(result.success).toBe(true);
    });

    test('deve rejeitar vencimento fora do range', () => {
      const result = CartaoUpdateSchema.safeParse({ vencimento: 32 });
      expect(result.success).toBe(false);
    });
  });
});

describe('Validação Zod - Schemas de Parcela', () => {
  describe('ParcelaCreateSchema', () => {
    test('deve aceitar parcela válida', () => {
      const result = ParcelaCreateSchema.safeParse({
        usuario_id: 1,
        cartao_id: 1,
        descricao: 'Compra parcelada',
        dia: 15,
        valor_parcela: 100.50,
        quantidade_parcelas: 12,
        total: 1206,
      });
      expect(result.success).toBe(true);
    });

    test('deve rejeitar parcela sem descrição', () => {
      const result = ParcelaCreateSchema.safeParse({
        usuario_id: 1,
        cartao_id: 1,
        dia: 15,
        valor_parcela: 100,
        quantidade_parcelas: 6,
        total: 600,
      });
      expect(result.success).toBe(false);
    });

    test('deve rejeitar quantidade de parcelas acima de 60', () => {
      const result = ParcelaCreateSchema.safeParse({
        usuario_id: 1,
        cartao_id: 1,
        descricao: 'Compra',
        dia: 15,
        valor_parcela: 10,
        quantidade_parcelas: 61,
        total: 610,
      });
      expect(result.success).toBe(false);
    });

    test('deve rejeitar dia fora do range 1-31', () => {
      const result = ParcelaCreateSchema.safeParse({
        usuario_id: 1,
        cartao_id: 1,
        descricao: 'Compra',
        dia: 32,
        valor_parcela: 100,
        quantidade_parcelas: 6,
        total: 600,
      });
      expect(result.success).toBe(false);
    });

    test('deve rejeitar valor da parcela negativo', () => {
      const result = ParcelaCreateSchema.safeParse({
        usuario_id: 1,
        cartao_id: 1,
        descricao: 'Compra',
        dia: 15,
        valor_parcela: -50,
        quantidade_parcelas: 6,
        total: 600,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ParcelaUpdateSchema', () => {
    test('deve aceitar atualização de descrição', () => {
      const result = ParcelaUpdateSchema.safeParse({ descricao: 'Nova descrição' });
      expect(result.success).toBe(true);
    });

    test('deve rejeitar objeto vazio', () => {
      const result = ParcelaUpdateSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});

describe('Validação Zod - Schemas de Transação de Cartão', () => {
  describe('TransacaoCartaoCreateSchema', () => {
    test('deve aceitar transação válida', () => {
      const result = TransacaoCartaoCreateSchema.safeParse({
        usuario_id: 1,
        cartao_id: 1,
        descricao: 'Compra no supermercado',
        valor: 150.99,
        data: '2026-01-15',
        categoria_id: 1,
        parcelas: 1,
        parcela_atual: 1,
      });
      expect(result.success).toBe(true);
    });

    test('deve aceitar transação sem categoria (opcional)', () => {
      const result = TransacaoCartaoCreateSchema.safeParse({
        usuario_id: 1,
        cartao_id: 1,
        descricao: 'Compra',
        valor: 100,
        data: '2026-01-15',
      });
      expect(result.success).toBe(true);
    });

    test('deve rejeitar transação sem descrição', () => {
      const result = TransacaoCartaoCreateSchema.safeParse({
        usuario_id: 1,
        cartao_id: 1,
        valor: 100,
        data: '2026-01-15',
      });
      expect(result.success).toBe(false);
    });

    test('deve rejeitar valor negativo', () => {
      const result = TransacaoCartaoCreateSchema.safeParse({
        usuario_id: 1,
        cartao_id: 1,
        descricao: 'Compra',
        valor: -100,
        data: '2026-01-15',
      });
      expect(result.success).toBe(false);
    });

    test('deve rejeitar valor acima do máximo', () => {
      const result = TransacaoCartaoCreateSchema.safeParse({
        usuario_id: 1,
        cartao_id: 1,
        descricao: 'Compra',
        valor: 9999999999,
        data: '2026-01-15',
      });
      expect(result.success).toBe(false);
    });

    test('deve rejeitar data em formato inválido', () => {
      const result = TransacaoCartaoCreateSchema.safeParse({
        usuario_id: 1,
        cartao_id: 1,
        descricao: 'Compra',
        valor: 100,
        data: '15/01/2026',
      });
      expect(result.success).toBe(false);
    });

    test('deve rejeitar data em formato DD-MM-YYYY', () => {
      const result = TransacaoCartaoCreateSchema.safeParse({
        usuario_id: 1,
        cartao_id: 1,
        descricao: 'Compra',
        valor: 100,
        data: '15-01-2026',
      });
      expect(result.success).toBe(false);
    });

    test('deve rejeitar parcelas acima de 60', () => {
      const result = TransacaoCartaoCreateSchema.safeParse({
        usuario_id: 1,
        cartao_id: 1,
        descricao: 'Compra',
        valor: 100,
        data: '2026-01-15',
        parcelas: 61,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('TransacaoCartaoUpdateSchema', () => {
    test('deve aceitar atualização de valor', () => {
      const result = TransacaoCartaoUpdateSchema.safeParse({ valor: 200 });
      expect(result.success).toBe(true);
    });

    test('deve rejeitar objeto vazio', () => {
      const result = TransacaoCartaoUpdateSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    test('deve rejeitar valor negativo em atualização', () => {
      const result = TransacaoCartaoUpdateSchema.safeParse({ valor: -50 });
      expect(result.success).toBe(false);
    });
  });
});

describe('Validação Zod - Schema de Transação Parcelada', () => {
  describe('TransacaoParceladaSchema', () => {
    test('deve aceitar transação parcelada válida', () => {
      const result = TransacaoParceladaSchema.safeParse({
        transacao: {
          usuario_id: 1,
          cartao_id: 1,
          descricao: 'TV Samsung',
          valor: 3000,
          data: '2026-01-15',
          categoria_id: 1,
        },
        numeroParcelas: 12,
      });
      expect(result.success).toBe(true);
    });

    test('deve rejeitar menos de 2 parcelas', () => {
      const result = TransacaoParceladaSchema.safeParse({
        transacao: {
          usuario_id: 1,
          cartao_id: 1,
          descricao: 'Compra',
          valor: 100,
          data: '2026-01-15',
        },
        numeroParcelas: 1,
      });
      expect(result.success).toBe(false);
    });

    test('deve rejeitar mais de 60 parcelas', () => {
      const result = TransacaoParceladaSchema.safeParse({
        transacao: {
          usuario_id: 1,
          cartao_id: 1,
          descricao: 'Compra',
          valor: 100,
          data: '2026-01-15',
        },
        numeroParcelas: 61,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Validação Zod - DataSchema', () => {
  test('deve aceitar data válida no formato YYYY-MM-DD', () => {
    const result = DataSchema.safeParse('2026-01-15');
    expect(result.success).toBe(true);
  });

  test('deve rejeitar data com mês inválido (13)', () => {
    const result = DataSchema.safeParse('2026-13-15');
    expect(result.success).toBe(false);
  });

  test('deve rejeitar data com dia inválido (32)', () => {
    const result = DataSchema.safeParse('2026-01-32');
    expect(result.success).toBe(false);
  });

  test('deve rejeitar formato DD/MM/YYYY', () => {
    const result = DataSchema.safeParse('15/01/2026');
    expect(result.success).toBe(false);
  });

  test('deve aceitar undefined (campo opcional)', () => {
    const result = DataSchema.safeParse(undefined);
    expect(result.success).toBe(true);
  });

  test('deve rejeitar string vazia', () => {
    const result = DataSchema.safeParse('');
    expect(result.success).toBe(false);
  });
});

describe('Validação - Função validateData', () => {
  test('deve retornar dados validados para input válido', () => {
    const result = validateData(CartaoCreateSchema, {
      usuario_id: 1,
      nome: 'Nubank',
      vencimento: 15,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nome).toBe('Nubank');
    }
  });

  test('deve retornar erro para input inválido', () => {
    const result = validateData(CartaoCreateSchema, {
      usuario_id: 1,
      // nome ausente
      vencimento: 15,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });
});
