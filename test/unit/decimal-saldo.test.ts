// test/unit/decimal-saldo.test.ts
/**
 * Testes de Arredondamento Monetário com Decimal.js
 * e Recálculo de Saldo na Edição de Transações
 *
 * Testa:
 * - Distribuição precisa de centavos em parcelas
 * - Soma exata após divisão
 * - Recálculo de saldo via triggers ao editar transações
 */

import { DatabaseManager } from '../../src/database/database';

describe('Arredondamento Monetário com Decimal.js', () => {
  let db: DatabaseManager;

  beforeEach(async () => {
    db = new DatabaseManager();
    await db.init();
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  function setupCartaoData() {
    const usuario = db.createUsuario('Teste Decimal', 'decimal@test.com');
    const cartao = db.createCartao({
      usuario_id: usuario.id,
      nome: 'Cartão Teste',
      valor: 0,
      vencimento: 15,
      status: 'aberta',
    });
    const categoria = db.createCategoria({
      usuario_id: usuario.id,
      nome: 'Compras',
      tipo: 'despesa',
    });
    return { usuario, cartao, categoria };
  }

  test('deve dividir R$1000 em 3 parcelas com distribuição correta de centavos', () => {
    const { usuario, cartao, categoria } = setupCartaoData();

    const parcelas = db.createTransacaoParcelada(
      {
        usuario_id: usuario.id,
        cartao_id: cartao.id,
        descricao: 'Compra parcelada',
        valor: 1000,
        data: '2026-01-10',
        categoria_id: categoria.id,
        parcelas: 3,
      },
      3
    );

    expect(parcelas).toHaveLength(3);

    // Verificar que a soma é exatamente R$1000
    const soma = parcelas.reduce((acc, p) => acc + p.valor, 0);
    expect(Math.round(soma * 100) / 100).toBe(1000);

    // R$1000 / 3 = R$333.33 base, 1 centavo extra na primeira parcela
    const valores = parcelas.map((p) => p.valor).sort((a, b) => b - a);
    expect(valores[0]).toBe(333.34);
    expect(valores[1]).toBe(333.33);
    expect(valores[2]).toBe(333.33);
  });

  test('deve dividir R$100 em 7 parcelas mantendo soma exata', () => {
    const { usuario, cartao, categoria } = setupCartaoData();

    const parcelas = db.createTransacaoParcelada(
      {
        usuario_id: usuario.id,
        cartao_id: cartao.id,
        descricao: 'Compra 7x',
        valor: 100,
        data: '2026-01-10',
        categoria_id: categoria.id,
        parcelas: 7,
      },
      7
    );

    expect(parcelas).toHaveLength(7);

    // Verificar que a soma é exatamente R$100
    const soma = parcelas.reduce((acc, p) => acc + p.valor, 0);
    expect(Math.round(soma * 100) / 100).toBe(100);

    // R$100 / 7 = R$14.28 base, restam 4 centavos
    const parcelas1429 = parcelas.filter((p) => p.valor === 14.29);
    const parcelas1428 = parcelas.filter((p) => p.valor === 14.28);
    expect(parcelas1429.length).toBe(4);
    expect(parcelas1428.length).toBe(3);
  });

  test('deve dividir valor exato sem centavos restantes', () => {
    const { usuario, cartao, categoria } = setupCartaoData();

    const parcelas = db.createTransacaoParcelada(
      {
        usuario_id: usuario.id,
        cartao_id: cartao.id,
        descricao: 'Compra divisão exata',
        valor: 1200,
        data: '2026-01-10',
        categoria_id: categoria.id,
        parcelas: 6,
      },
      6
    );

    expect(parcelas).toHaveLength(6);

    // R$1200 / 6 = R$200 exato
    parcelas.forEach((p) => {
      expect(p.valor).toBe(200);
    });

    const soma = parcelas.reduce((acc, p) => acc + p.valor, 0);
    expect(soma).toBe(1200);
  });

  test('deve manter precisão com valores pequenos (R$1 em 3 parcelas)', () => {
    const { usuario, cartao, categoria } = setupCartaoData();

    const parcelas = db.createTransacaoParcelada(
      {
        usuario_id: usuario.id,
        cartao_id: cartao.id,
        descricao: 'Valor pequeno',
        valor: 1,
        data: '2026-01-10',
        categoria_id: categoria.id,
        parcelas: 3,
      },
      3
    );

    expect(parcelas).toHaveLength(3);

    // R$1 / 3 = R$0.33 base, 1 centavo restante
    const soma = parcelas.reduce((acc, p) => acc + p.valor, 0);
    expect(Math.round(soma * 100) / 100).toBe(1);
  });

  test('deve numerar parcelas corretamente e manter grupo_parcelamento', () => {
    const { usuario, cartao, categoria } = setupCartaoData();

    const parcelas = db.createTransacaoParcelada(
      {
        usuario_id: usuario.id,
        cartao_id: cartao.id,
        descricao: 'Numeração',
        valor: 600,
        data: '2026-01-10',
        categoria_id: categoria.id,
        parcelas: 3,
      },
      3
    );

    expect(parcelas[0].parcela_atual).toBe(1);
    expect(parcelas[1].parcela_atual).toBe(2);
    expect(parcelas[2].parcela_atual).toBe(3);
    expect(parcelas[0].parcelas).toBe(3);

    // Todas devem ter o mesmo grupo_parcelamento
    const grupo = parcelas[0].grupo_parcelamento;
    expect(grupo).toBeDefined();
    parcelas.forEach((p) => {
      expect(p.grupo_parcelamento).toBe(grupo);
    });
  });
});

describe('Recálculo de Saldo ao Editar Transação', () => {
  let db: DatabaseManager;

  beforeEach(async () => {
    db = new DatabaseManager();
    await db.init();
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  function setupTransacaoData() {
    const usuario = db.createUsuario('Teste Saldo', 'saldo@test.com');
    const conta = db.createConta({
      usuario_id: usuario.id,
      nome: 'Conta Saldo',
      saldo: 1000,
      tipo: 'corrente',
      ativa: true,
    });
    const categoriaReceita = db.createCategoria({
      usuario_id: usuario.id,
      nome: 'Salário',
      tipo: 'receita',
    });
    const categoriaDespesa = db.createCategoria({
      usuario_id: usuario.id,
      nome: 'Despesa Geral',
      tipo: 'despesa',
    });
    return { usuario, conta, categoriaReceita, categoriaDespesa };
  }

  test('deve recalcular saldo ao editar valor de despesa', () => {
    const { usuario, conta, categoriaDespesa } = setupTransacaoData();

    // Criar transação de R$100 (despesa)
    const transacao = db.createTransacao({
      usuario_id: usuario.id,
      descricao: 'Despesa editável',
      valor: 100,
      tipo: 'despesa',
      data: '2026-01-15',
      conta_id: conta.id,
      categoria_id: categoriaDespesa.id,
    });

    // Saldo após criar: 1000 - 100 = 900
    let contaAtual = db.getConta(conta.id, usuario.id);
    expect(contaAtual?.saldo).toBe(900);

    // Editar valor para R$200
    db.updateTransacao(transacao.id, usuario.id, { valor: 200 });

    // Saldo deve ser: 1000 - 200 = 800
    contaAtual = db.getConta(conta.id, usuario.id);
    expect(contaAtual?.saldo).toBe(800);
  });

  test('deve recalcular saldo ao editar valor de receita', () => {
    const { usuario, conta, categoriaReceita } = setupTransacaoData();

    // Criar transação de R$500 (receita)
    const transacao = db.createTransacao({
      usuario_id: usuario.id,
      descricao: 'Receita editável',
      valor: 500,
      tipo: 'receita',
      data: '2026-01-15',
      conta_id: conta.id,
      categoria_id: categoriaReceita.id,
    });

    // Saldo após criar: 1000 + 500 = 1500
    let contaAtual = db.getConta(conta.id, usuario.id);
    expect(contaAtual?.saldo).toBe(1500);

    // Editar valor para R$300
    db.updateTransacao(transacao.id, usuario.id, { valor: 300 });

    // Saldo deve ser: 1000 + 300 = 1300
    contaAtual = db.getConta(conta.id, usuario.id);
    expect(contaAtual?.saldo).toBe(1300);
  });

  test('deve recalcular saldo ao mudar tipo de receita para despesa', () => {
    const { usuario, conta, categoriaReceita } = setupTransacaoData();

    // Criar transação de R$200 (receita)
    const transacao = db.createTransacao({
      usuario_id: usuario.id,
      descricao: 'Tipo editável',
      valor: 200,
      tipo: 'receita',
      data: '2026-01-15',
      conta_id: conta.id,
      categoria_id: categoriaReceita.id,
    });

    // Saldo após criar: 1000 + 200 = 1200
    let contaAtual = db.getConta(conta.id, usuario.id);
    expect(contaAtual?.saldo).toBe(1200);

    // Mudar tipo para despesa
    db.updateTransacao(transacao.id, usuario.id, { tipo: 'despesa' });

    // Saldo deve ser: 1000 - 200 = 800 (reverteu receita +200, aplicou despesa -200)
    contaAtual = db.getConta(conta.id, usuario.id);
    expect(contaAtual?.saldo).toBe(800);
  });
});
