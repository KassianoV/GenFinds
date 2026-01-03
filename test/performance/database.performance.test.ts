// test/performance/database.performance.test.ts
/**
 * Testes de Performance
 *
 * Verifica comportamento do sistema sob carga:
 * - Grande volume de dados
 * - Consultas complexas
 * - Operações em massa
 */

import { DatabaseManager } from '../../src/database/database';
import { performance } from 'perf_hooks';

describe('DatabaseManager - Testes de Performance', () => {
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
  // TESTE 1: Criação em Massa
  // ========================================

  describe('Criação em massa de registros', () => {
    test('deve criar 1000 transações em tempo razoável (<5s)', () => {
      const usuario = db.createUsuario('Performance User', 'perf@email.com');

      const conta = db.createConta({
        nome: 'Conta Teste',
        saldo: 1000000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id,
      });

      const categoria = db.createCategoria({
        nome: 'Categoria Teste',
        tipo: 'despesa',
        usuario_id: usuario.id,
      });

      const startTime = performance.now();

      // Criar 1000 transações
      for (let i = 0; i < 1000; i++) {
        db.createTransacao({
          descricao: `Transação ${i}`,
          valor: Math.random() * 1000,
          tipo: i % 2 === 0 ? 'receita' : 'despesa',
          data: `2024-12-${String((i % 30) + 1).padStart(2, '0')}`,
          conta_id: conta.id,
          categoria_id: categoria.id,
          usuario_id: usuario.id,
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Tempo para criar 1000 transações: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(5000); // Menos de 5 segundos

      // Verificar que todas foram criadas
      const transacoes = db.getTransacoes(usuario.id);
      expect(transacoes.length).toBe(1000);
    }, 10000); // Timeout de 10 segundos

    test('deve criar 100 categorias rapidamente (<1s)', () => {
      const usuario = db.createUsuario('Cat User', 'cat@email.com');

      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        db.createCategoria({
          nome: `Categoria ${i}`,
          tipo: i % 2 === 0 ? 'receita' : 'despesa',
          cor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
          usuario_id: usuario.id,
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Tempo para criar 100 categorias: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(1000);

      const categorias = db.getCategorias(usuario.id);
      expect(categorias.length).toBe(100);
    });
  });

  // ========================================
  // TESTE 2: Consultas Complexas
  // ========================================

  describe('Performance de consultas', () => {
    beforeEach(() => {
      // Criar dados de teste
      const usuario = db.createUsuario('Query User', 'query@email.com');

      const conta = db.createConta({
        nome: 'Conta',
        saldo: 100000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id,
      });

      const categorias = [];
      for (let i = 0; i < 10; i++) {
        categorias.push(
          db.createCategoria({
            nome: `Cat ${i}`,
            tipo: i % 2 === 0 ? 'receita' : 'despesa',
            usuario_id: usuario.id,
          })
        );
      }

      // Criar 5000 transações
      for (let i = 0; i < 5000; i++) {
        const catIndex = Math.floor(Math.random() * categorias.length);
        const categoria = categorias[catIndex];

        db.createTransacao({
          descricao: `Trans ${i}`,
          valor: Math.random() * 500,
          tipo: categoria.tipo as 'receita' | 'despesa',
          data: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
          conta_id: conta.id,
          categoria_id: categoria.id,
          usuario_id: usuario.id,
        });
      }
    });

    test('deve listar todas as transações rapidamente (<500ms)', () => {
      const usuario = db.getUsuarioByEmail('query@email.com');

      const startTime = performance.now();
      const transacoes = db.getTransacoes(usuario!.id);
      const endTime = performance.now();

      const duration = endTime - startTime;
      console.log(`Tempo para listar 5000 transações: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(500);
      expect(transacoes.length).toBe(5000);
    });

    test('deve calcular resumo financeiro rapidamente (<200ms)', () => {
      const usuario = db.getUsuarioByEmail('query@email.com');

      const startTime = performance.now();
      const resumo = db.getResumoFinanceiro(usuario!.id, '2024-01-01', '2024-12-31');
      const endTime = performance.now();

      const duration = endTime - startTime;
      console.log(`Tempo para calcular resumo: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(200);
      expect(resumo).toBeDefined();
      expect(resumo.receita).toBeGreaterThan(0);
    });

    test('deve listar transações com LIMIT eficientemente', () => {
      const usuario = db.getUsuarioByEmail('query@email.com');

      const limits = [10, 50, 100, 500, 1000];

      limits.forEach((limit) => {
        const startTime = performance.now();
        const transacoes = db.getTransacoes(usuario!.id, limit);
        const endTime = performance.now();

        const duration = endTime - startTime;
        console.log(`LIMIT ${limit}: ${duration.toFixed(2)}ms`);

        expect(duration).toBeLessThan(100);
        expect(transacoes.length).toBe(limit);
      });
    });
  });

  // ========================================
  // TESTE 3: Operações de Atualização
  // ========================================

  describe('Performance de atualizações', () => {
    test('deve atualizar 500 registros em tempo razoável (<2s)', () => {
      const usuario = db.createUsuario('Update User', 'update@email.com');

      const conta = db.createConta({
        nome: 'Conta',
        saldo: 50000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id,
      });

      const categoria = db.createCategoria({
        nome: 'Cat',
        tipo: 'despesa',
        usuario_id: usuario.id,
      });

      // Criar 500 transações
      const transacoes = [];
      for (let i = 0; i < 500; i++) {
        transacoes.push(
          db.createTransacao({
            descricao: `Original ${i}`,
            valor: 100,
            tipo: 'despesa',
            data: '2024-12-25',
            conta_id: conta.id,
            categoria_id: categoria.id,
            usuario_id: usuario.id,
          })
        );
      }

      // Atualizar todas
      const startTime = performance.now();

      transacoes.forEach((t, i) => {
        db.updateTransacao(t.id, {
          descricao: `Atualizada ${i}`,
          valor: 200,
        });
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Tempo para atualizar 500 transações: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(2000);

      // Verificar atualização
      const primeiraAtualizada = db.getTransacao(transacoes[0].id);
      expect(primeiraAtualizada?.descricao).toBe('Atualizada 0');
      expect(primeiraAtualizada?.valor).toBe(200);
    });
  });

  // ========================================
  // TESTE 4: Operações de Exclusão
  // ========================================

  describe('Performance de exclusões', () => {
    test('deve deletar 500 transações rapidamente (<1s)', () => {
      const usuario = db.createUsuario('Delete User', 'delete@email.com');

      const conta = db.createConta({
        nome: 'Conta',
        saldo: 100000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id,
      });

      const categoria = db.createCategoria({
        nome: 'Cat',
        tipo: 'despesa',
        usuario_id: usuario.id,
      });

      // Criar 500 transações
      const transacoes = [];
      for (let i = 0; i < 500; i++) {
        transacoes.push(
          db.createTransacao({
            descricao: `Trans ${i}`,
            valor: 50,
            tipo: 'despesa',
            data: '2024-12-25',
            conta_id: conta.id,
            categoria_id: categoria.id,
            usuario_id: usuario.id,
          })
        );
      }

      // Deletar todas
      const startTime = performance.now();

      transacoes.forEach((t) => {
        db.deleteTransacao(t.id);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Tempo para deletar 500 transações: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(1000);

      // Verificar que foram deletadas
      const remaining = db.getTransacoes(usuario.id);
      expect(remaining.length).toBe(0);
    });
  });

  // ========================================
  // TESTE 5: Stress Test - Volume Máximo
  // ========================================

  describe('Stress test - volume máximo', () => {
    test('deve suportar 10.000 transações', () => {
      const usuario = db.createUsuario('Stress User', 'stress@email.com');

      const conta = db.createConta({
        nome: 'Conta',
        saldo: 10000000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id,
      });

      const categorias = [];
      for (let i = 0; i < 20; i++) {
        categorias.push(
          db.createCategoria({
            nome: `Cat ${i}`,
            tipo: i % 2 === 0 ? 'receita' : 'despesa',
            usuario_id: usuario.id,
          })
        );
      }

      const startTime = performance.now();

      // Criar 10.000 transações
      for (let i = 0; i < 10000; i++) {
        const catIndex = Math.floor(Math.random() * categorias.length);
        const categoria = categorias[catIndex];

        db.createTransacao({
          descricao: `Trans ${i}`,
          valor: Math.random() * 1000,
          tipo: categoria.tipo as 'receita' | 'despesa',
          data: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
          conta_id: conta.id,
          categoria_id: categoria.id,
          usuario_id: usuario.id,
        });

        // Log de progresso a cada 1000
        if ((i + 1) % 1000 === 0) {
          console.log(`Criadas ${i + 1} transações...`);
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Tempo total para 10.000 transações: ${(duration / 1000).toFixed(2)}s`);

      // Verificar que todas foram criadas
      const transacoes = db.getTransacoes(usuario.id);
      expect(transacoes.length).toBe(10000);

      // Testar consulta no conjunto grande
      const queryStart = performance.now();
      const resumo = db.getResumoFinanceiro(usuario.id, '2024-01-01', '2024-12-31');
      const queryEnd = performance.now();

      console.log(
        `Tempo para calcular resumo de 10k transações: ${(queryEnd - queryStart).toFixed(2)}ms`
      );

      expect(resumo).toBeDefined();
      expect(resumo.receita).toBeGreaterThan(0);
    }, 60000); // Timeout de 60 segundos
  });

  // ========================================
  // TESTE 6: Memória e Limpeza
  // ========================================

  describe('Gerenciamento de memória', () => {
    test('deve limpar dados corretamente após exclusão em massa', () => {
      const usuario = db.createUsuario('Memory User', 'memory@email.com');

      const conta = db.createConta({
        nome: 'Conta',
        saldo: 100000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id,
      });

      const categoria = db.createCategoria({
        nome: 'Cat',
        tipo: 'despesa',
        usuario_id: usuario.id,
      });

      // Criar 1000 transações
      const transacoes = [];
      for (let i = 0; i < 1000; i++) {
        transacoes.push(
          db.createTransacao({
            descricao: `Trans ${i}`,
            valor: 100,
            tipo: 'despesa',
            data: '2024-12-25',
            conta_id: conta.id,
            categoria_id: categoria.id,
            usuario_id: usuario.id,
          })
        );
      }

      // Verificar criação
      let allTransacoes = db.getTransacoes(usuario.id);
      expect(allTransacoes.length).toBe(1000);

      // Deletar todas
      transacoes.forEach((t) => db.deleteTransacao(t.id));

      // Verificar limpeza
      allTransacoes = db.getTransacoes(usuario.id);
      expect(allTransacoes.length).toBe(0);

      // Criar novas transações para garantir que IDs não conflitam
      for (let i = 0; i < 100; i++) {
        db.createTransacao({
          descricao: `Nova ${i}`,
          valor: 50,
          tipo: 'receita',
          data: '2024-12-26',
          conta_id: conta.id,
          categoria_id: categoria.id,
          usuario_id: usuario.id,
        });
      }

      const novasTransacoes = db.getTransacoes(usuario.id);
      expect(novasTransacoes.length).toBe(100);
    });
  });
});
