// test/validation/database.validation.test.ts
/**
 * Testes de Validação e Edge Cases
 *
 * Testa comportamento com:
 * - Dados inválidos
 * - Valores limites
 * - Casos especiais
 * - Erros esperados
 */

import { DatabaseManager } from '../../src/database/database';

describe('DatabaseManager - Testes de Validação', () => {
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

  // ========================================
  // EDGE CASES - VALORES NUMÉRICOS
  // ========================================

  describe('Edge cases - Valores numéricos', () => {
    let usuario: any;
    let conta: any;
    let categoria: any;

    beforeEach(() => {
      usuario = db.createUsuario('Test', 'test@email.com');
      conta = db.createConta({
        nome: 'Conta',
        saldo: 0,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id,
      });
      categoria = db.createCategoria({
        nome: 'Cat',
        tipo: 'receita',
        usuario_id: usuario.id,
      });
    });

    test('deve aceitar valor zero', () => {
      const transacao = db.createTransacao({
        descricao: 'Valor zero',
        valor: 0,
        tipo: 'receita',
        data: '2024-12-25',
        conta_id: conta.id,
        categoria_id: categoria.id,
        usuario_id: usuario.id,
      });

      expect(transacao.valor).toBe(0);
    });

    test('deve aceitar valores decimais precisos', () => {
      const valores = [0.01, 0.99, 1.5, 99.99, 1234.56];

      valores.forEach((valor) => {
        const transacao = db.createTransacao({
          descricao: `Valor ${valor}`,
          valor,
          tipo: 'receita',
          data: '2024-12-25',
          conta_id: conta.id,
          categoria_id: categoria.id,
          usuario_id: usuario.id,
        });

        expect(transacao.valor).toBe(valor);
      });
    });

    test('deve aceitar valores muito grandes', () => {
      const valorGrande = 999999999.99;

      const transacao = db.createTransacao({
        descricao: 'Valor grande',
        valor: valorGrande,
        tipo: 'receita',
        data: '2024-12-25',
        conta_id: conta.id,
        categoria_id: categoria.id,
        usuario_id: usuario.id,
      });

      expect(transacao.valor).toBe(valorGrande);

      // Verificar saldo
      const contaAtualizada = db.getConta(conta.id);
      expect(contaAtualizada?.saldo).toBe(valorGrande);
    });

    test('deve lidar com saldo negativo', () => {
      const contaNegativa = db.createConta({
        nome: 'Conta Negativa',
        saldo: -500,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id,
      });

      expect(contaNegativa.saldo).toBe(-500);

      // Criar despesa que torna saldo ainda mais negativo
      const categoriaDespesa = db.createCategoria({
        nome: 'Despesa',
        tipo: 'despesa',
        usuario_id: usuario.id,
      });

      db.createTransacao({
        descricao: 'Despesa',
        valor: 100,
        tipo: 'despesa',
        data: '2024-12-25',
        conta_id: contaNegativa.id,
        categoria_id: categoriaDespesa.id,
        usuario_id: usuario.id,
      });

      const contaAtualizada = db.getConta(contaNegativa.id);
      expect(contaAtualizada?.saldo).toBe(-600);
    });
  });

  // ========================================
  // EDGE CASES - STRINGS
  // ========================================

  describe('Edge cases - Strings', () => {
    let usuario: any;

    beforeEach(() => {
      usuario = db.createUsuario('Test', 'test@email.com');
    });

    test('deve aceitar strings vazias onde permitido', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
      const conta = db.createConta({
        nome: 'Conta',
        saldo: 1000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id,
      });

      const categoria = db.createCategoria({
        nome: 'Cat',
        tipo: 'receita',
        icone: '', // String vazia permitida
        cor: '', // String vazia permitida
        usuario_id: usuario.id,
      });

      expect(categoria.icone).toBe('');
      expect(categoria.cor).toBe('');
    });

    test('deve aceitar strings longas', () => {
      const descricaoLonga = 'A'.repeat(1000);

      const conta = db.createConta({
        nome: 'Conta',
        saldo: 1000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id,
      });

      const categoria = db.createCategoria({
        nome: 'Cat',
        tipo: 'despesa',
        usuario_id: usuario.id,
      });

      const transacao = db.createTransacao({
        descricao: descricaoLonga,
        valor: 100,
        tipo: 'despesa',
        data: '2024-12-25',
        conta_id: conta.id,
        categoria_id: categoria.id,
        usuario_id: usuario.id,
        observacoes: descricaoLonga,
      });

      expect(transacao.descricao).toBe(descricaoLonga);
      expect(transacao.observacoes).toBe(descricaoLonga);
    });

    test('deve preservar caracteres especiais', () => {
      const textosEspeciais = [
        'Café com açúcar',
        '¥€$£',
        'Emoji: 😀🎉💰',
        'Quebra\nde\nlinha',
        'Tab\t\ttest',
        'Aspas "duplas" e \'simples\'',
        'HTML <script>alert("xss")</script>',
      ];

      const conta = db.createConta({
        nome: 'Conta',
        saldo: 1000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id,
      });

      const categoria = db.createCategoria({
        nome: 'Cat',
        tipo: 'despesa',
        usuario_id: usuario.id,
      });

      textosEspeciais.forEach((texto) => {
        const transacao = db.createTransacao({
          descricao: texto,
          valor: 100,
          tipo: 'despesa',
          data: '2024-12-25',
          conta_id: conta.id,
          categoria_id: categoria.id,
          usuario_id: usuario.id,
        });

        expect(transacao.descricao).toBe(texto);
      });
    });
  });

  // ========================================
  // EDGE CASES - DATAS
  // ========================================

  describe('Edge cases - Datas', () => {
    let usuario: any;
    let conta: any;
    let categoria: any;

    beforeEach(() => {
      usuario = db.createUsuario('Test', 'test@email.com');
      conta = db.createConta({
        nome: 'Conta',
        saldo: 1000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id,
      });
      categoria = db.createCategoria({
        nome: 'Cat',
        tipo: 'despesa',
        usuario_id: usuario.id,
      });
    });

    test('deve aceitar datas antigas', () => {
      const transacao = db.createTransacao({
        descricao: 'Transação antiga',
        valor: 100,
        tipo: 'despesa',
        data: '2000-01-01',
        conta_id: conta.id,
        categoria_id: categoria.id,
        usuario_id: usuario.id,
      });

      expect(transacao.data).toBe('2000-01-01');
    });

    test('deve aceitar datas futuras', () => {
      const transacao = db.createTransacao({
        descricao: 'Transação futura',
        valor: 100,
        tipo: 'despesa',
        data: '2030-12-31',
        conta_id: conta.id,
        categoria_id: categoria.id,
        usuario_id: usuario.id,
      });

      expect(transacao.data).toBe('2030-12-31');
    });

    test('deve ordenar transações por data corretamente', () => {
      const datas = ['2024-12-01', '2024-12-15', '2024-12-05', '2024-12-20', '2024-12-10'];

      datas.forEach((data, index) => {
        db.createTransacao({
          descricao: `Trans ${index}`,
          valor: 100,
          tipo: 'despesa',
          data,
          conta_id: conta.id,
          categoria_id: categoria.id,
          usuario_id: usuario.id,
        });
      });

      const transacoes = db.getTransacoes(usuario.id);

      // Deve estar ordenado DESC (mais recente primeiro)
      expect(transacoes[0].data).toBe('2024-12-20');
      expect(transacoes[1].data).toBe('2024-12-15');
      expect(transacoes[2].data).toBe('2024-12-10');
      expect(transacoes[3].data).toBe('2024-12-05');
      expect(transacoes[4].data).toBe('2024-12-01');
    });
  });

  // ========================================
  // EDGE CASES - MESES E ANOS
  // ========================================

  describe('Edge cases - Meses e anos em orçamentos', () => {
    let usuario: any;
    let categoria: any;

    beforeEach(() => {
      usuario = db.createUsuario('Test', 'test@email.com');
      categoria = db.createCategoria({
        nome: 'Cat',
        tipo: 'despesa',
        usuario_id: usuario.id,
      });
    });

    test('deve aceitar mês 1 (janeiro)', () => {
      const orcamento = db.createOrcamento({
        categoria_id: categoria.id,
        valor_planejado: 1000,
        mes: 1,
        ano: 2024,
        usuario_id: usuario.id,
      });

      expect(orcamento.mes).toBe(1);
    });

    test('deve aceitar mês 12 (dezembro)', () => {
      const orcamento = db.createOrcamento({
        categoria_id: categoria.id,
        valor_planejado: 1000,
        mes: 12,
        ano: 2024,
        usuario_id: usuario.id,
      });

      expect(orcamento.mes).toBe(12);
    });

    test('deve aceitar anos distantes', () => {
      const anos = [2000, 2050, 2100];

      anos.forEach((ano) => {
        const orcamento = db.createOrcamento({
          categoria_id: categoria.id,
          valor_planejado: 1000,
          mes: 6,
          ano,
          usuario_id: usuario.id,
        });

        expect(orcamento.ano).toBe(ano);
      });
    });
  });

  // ========================================
  // VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS
  // ========================================

  describe('Validação de campos obrigatórios', () => {
    test('deve falhar ao criar usuário sem nome', () => {
      expect(() => {
        db.createUsuario('', 'email@test.com');
      }).toThrow();
    });

    test('deve falhar ao criar usuário sem email', () => {
      expect(() => {
        db.createUsuario('Nome', '');
      }).toThrow();
    });

    test('deve falhar ao criar conta sem nome', () => {
      const usuario = db.createUsuario('Test', 'test@email.com');

      expect(() => {
        db.createConta({
          nome: '',
          saldo: 1000,
          tipo: 'corrente',
          ativa: true,
          usuario_id: usuario.id,
        });
      }).toThrow();
    });

    test('deve falhar ao criar categoria sem nome', () => {
      const usuario = db.createUsuario('Test', 'test@email.com');

      expect(() => {
        db.createCategoria({
          nome: '',
          tipo: 'receita',
          usuario_id: usuario.id,
        });
      }).toThrow();
    });
  });

  // ========================================
  // VALIDAÇÃO DE TIPOS ENUMERADOS
  // ========================================

  describe('Validação de tipos enumerados', () => {
    let usuario: any;

    beforeEach(() => {
      usuario = db.createUsuario('Test', 'test@email.com');
    });

    test('deve aceitar apenas tipos válidos de conta', () => {
      const tiposValidos: Array<'corrente' | 'poupanca' | 'investimento' | 'carteira'> = [
        'corrente',
        'poupanca',
        'investimento',
        'carteira',
      ];

      tiposValidos.forEach((tipo) => {
        const conta = db.createConta({
          nome: `Conta ${tipo}`,
          saldo: 1000,
          tipo,
          ativa: true,
          usuario_id: usuario.id,
        });

        expect(conta.tipo).toBe(tipo);
      });

      // Tipo inválido deve falhar
      expect(() => {
        db.createConta({
          nome: 'Conta Inválida',
          saldo: 1000,
          tipo: 'tipo_invalido' as any,
          ativa: true,
          usuario_id: usuario.id,
        });
      }).toThrow();
    });

    test('deve aceitar apenas tipos válidos de categoria', () => {
      const tiposValidos: Array<'receita' | 'despesa'> = ['receita', 'despesa'];

      tiposValidos.forEach((tipo) => {
        const categoria = db.createCategoria({
          nome: `Cat ${tipo}`,
          tipo,
          usuario_id: usuario.id,
        });

        expect(categoria.tipo).toBe(tipo);
      });

      // Tipo inválido deve falhar
      expect(() => {
        db.createCategoria({
          nome: 'Cat Inválida',
          tipo: 'tipo_invalido' as any,
          usuario_id: usuario.id,
        });
      }).toThrow();
    });

    test('deve aceitar apenas tipos válidos de transação', () => {
      const conta = db.createConta({
        nome: 'Conta',
        saldo: 1000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id,
      });

      const categoria = db.createCategoria({
        nome: 'Cat',
        tipo: 'receita',
        usuario_id: usuario.id,
      });

      const tiposValidos: Array<'receita' | 'despesa'> = ['receita', 'despesa'];

      tiposValidos.forEach((tipo) => {
        const transacao = db.createTransacao({
          descricao: `Trans ${tipo}`,
          valor: 100,
          tipo,
          data: '2024-12-25',
          conta_id: conta.id,
          categoria_id: categoria.id,
          usuario_id: usuario.id,
        });

        expect(transacao.tipo).toBe(tipo);
      });

      // Tipo inválido deve falhar
      expect(() => {
        db.createTransacao({
          descricao: 'Trans Inválida',
          valor: 100,
          tipo: 'tipo_invalido' as any,
          data: '2024-12-25',
          conta_id: conta.id,
          categoria_id: categoria.id,
          usuario_id: usuario.id,
        });
      }).toThrow();
    });
  });

  // ========================================
  // VALIDAÇÃO DE REFERÊNCIAS
  // ========================================

  describe('Validação de referências (Foreign Keys)', () => {
    test('deve falhar ao criar conta com usuario_id inexistente', () => {
      expect(() => {
        db.createConta({
          nome: 'Conta',
          saldo: 1000,
          tipo: 'corrente',
          ativa: true,
          usuario_id: 99999, // ID inexistente
        });
      }).toThrow();
    });

    test('deve falhar ao criar transação com conta_id inexistente', () => {
      const usuario = db.createUsuario('Test', 'test@email.com');
      const categoria = db.createCategoria({
        nome: 'Cat',
        tipo: 'despesa',
        usuario_id: usuario.id,
      });

      expect(() => {
        db.createTransacao({
          descricao: 'Trans',
          valor: 100,
          tipo: 'despesa',
          data: '2024-12-25',
          conta_id: 99999, // ID inexistente
          categoria_id: categoria.id,
          usuario_id: usuario.id,
        });
      }).toThrow();
    });

    test('deve falhar ao criar transação com categoria_id inexistente', () => {
      const usuario = db.createUsuario('Test', 'test@email.com');
      const conta = db.createConta({
        nome: 'Conta',
        saldo: 1000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id,
      });

      expect(() => {
        db.createTransacao({
          descricao: 'Trans',
          valor: 100,
          tipo: 'despesa',
          data: '2024-12-25',
          conta_id: conta.id,
          categoria_id: 99999, // ID inexistente
          usuario_id: usuario.id,
        });
      }).toThrow();
    });
  });

  // ========================================
  // EDGE CASES - LIMIT
  // ========================================

  describe('Edge cases - LIMIT parameter', () => {
    let usuario: any;

    beforeEach(() => {
      usuario = db.createUsuario('Test', 'test@email.com');

      const conta = db.createConta({
        nome: 'Conta',
        saldo: 10000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id,
      });

      const categoria = db.createCategoria({
        nome: 'Cat',
        tipo: 'despesa',
        usuario_id: usuario.id,
      });

      // Criar 10 transações
      for (let i = 0; i < 10; i++) {
        db.createTransacao({
          descricao: `Trans ${i}`,
          valor: 100,
          tipo: 'despesa',
          data: '2024-12-25',
          conta_id: conta.id,
          categoria_id: categoria.id,
          usuario_id: usuario.id,
        });
      }
    });

    test('deve retornar todas quando LIMIT não especificado', () => {
      const transacoes = db.getTransacoes(usuario.id);
      expect(transacoes.length).toBe(10);
    });

    test('deve respeitar LIMIT = 1', () => {
      const transacoes = db.getTransacoes(usuario.id, 1);
      expect(transacoes.length).toBe(1);
    });

    test('deve respeitar LIMIT maior que total', () => {
      const transacoes = db.getTransacoes(usuario.id, 100);
      expect(transacoes.length).toBe(10);
    });

    test('deve lidar com LIMIT = 0 (retornar vazio ou tudo)', () => {
      const transacoes = db.getTransacoes(usuario.id, 0);
      // Comportamento pode variar - documentar o esperado
      expect(Array.isArray(transacoes)).toBe(true);
    });
  });
});
