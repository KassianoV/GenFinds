// test/unit/database.unit.test.ts
/**
 * Testes Unitários - DatabaseManager
 *
 * Testa todas as operações CRUD de todas as entidades:
 * - Usuários
 * - Contas
 * - Categorias
 * - Orçamentos
 * - Transações
 * - Relatórios
 */

import { DatabaseManager } from '../../src/database/database';
import { Usuario, Conta, Categoria } from '../../src/types/database.types';

describe('DatabaseManager - Testes Unitários', () => {
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
  // TESTES - USUÁRIO
  // ========================================

  describe('Operações de Usuário', () => {
    test('deve criar um novo usuário', () => {
      const usuario = db.createUsuario('João Silva', 'joao@email.com');

      expect(usuario).toBeDefined();
      expect(usuario.id).toBeDefined();
      expect(usuario.nome).toBe('João Silva');
      expect(usuario.email).toBe('joao@email.com');
      expect(usuario.created_at).toBeDefined();
    });

    test('deve buscar usuário por ID', () => {
      const created = db.createUsuario('Maria Santos', 'maria@email.com');
      const found = db.getUsuario(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.nome).toBe('Maria Santos');
    });

    test('deve buscar usuário por email', () => {
      db.createUsuario('Pedro Costa', 'pedro@email.com');
      const found = db.getUsuarioByEmail('pedro@email.com');

      expect(found).toBeDefined();
      expect(found?.email).toBe('pedro@email.com');
      expect(found?.nome).toBe('Pedro Costa');
    });

    test('deve retornar undefined para usuário inexistente', () => {
      const found = db.getUsuario(99999);
      expect(found).toBeUndefined();
    });

    test('não deve permitir email duplicado', () => {
      db.createUsuario('User 1', 'duplicate@email.com');

      expect(() => {
        db.createUsuario('User 2', 'duplicate@email.com');
      }).toThrow();
    });
  });

  // ========================================
  // TESTES - CONTA
  // ========================================

  describe('Operações de Conta', () => {
    let usuario: Usuario;

    beforeEach(() => {
      usuario = db.createUsuario('Teste User', 'teste@email.com');
    });

    test('deve criar uma nova conta', () => {
      const conta = db.createConta({
        nome: 'Conta Corrente',
        saldo: 1000,
        tipo: 'corrente',
        ativa: true,
        
      });

      expect(conta).toBeDefined();
      expect(conta.id).toBeDefined();
      expect(conta.nome).toBe('Conta Corrente');
      expect(conta.saldo).toBe(1000);
      expect(conta.tipo).toBe('corrente');
      expect(conta.ativa).toBe(true);
    });

    test('deve listar contas de um usuário', () => {
      db.createConta({
        nome: 'Conta 1',
        saldo: 500,
        tipo: 'corrente',
        ativa: true,
        
      });

      db.createConta({
        nome: 'Conta 2',
        saldo: 1500,
        tipo: 'poupanca',
        ativa: true,
        
      });

      const contas = db.getContas();

      expect(contas).toHaveLength(2);
      expect(contas[0].nome).toBe('Conta 1'); // Ordenado por nome
      expect(contas[1].nome).toBe('Conta 2');
    });

    test('deve buscar conta por ID', () => {
      const created = db.createConta({
        nome: 'Minha Conta',
        saldo: 2000,
        tipo: 'investimento',
        ativa: true,
        
      });

      const found = db.getConta(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.nome).toBe('Minha Conta');
    });

    test('deve atualizar uma conta', () => {
      const conta = db.createConta({
        nome: 'Conta Original',
        saldo: 1000,
        tipo: 'corrente',
        ativa: true,
        
      });

      const updated = db.updateConta(conta.id, {
        nome: 'Conta Atualizada',
        saldo: 2000,
      });

      expect(updated).toBe(true);

      const found = db.getConta(conta.id);
      expect(found?.nome).toBe('Conta Atualizada');
      expect(found?.saldo).toBe(2000);
    });

    test('deve deletar uma conta', () => {
      const conta = db.createConta({
        nome: 'Conta para Deletar',
        saldo: 500,
        tipo: 'carteira',
        ativa: true,
        
      });

      const deleted = db.deleteConta(conta.id);
      expect(deleted).toBe(true);

      const found = db.getConta(conta.id);
      expect(found).toBeUndefined();
    });

    test('deve aceitar diferentes tipos de conta', () => {
      const tipos: Array<'corrente' | 'poupanca' | 'investimento' | 'carteira'> = [
        'corrente',
        'poupanca',
        'investimento',
        'carteira',
      ];

      tipos.forEach((tipo) => {
        const conta = db.createConta({
          nome: `Conta ${tipo}`,
          saldo: 100,
          tipo,
          ativa: true,
          
        });

        expect(conta.tipo).toBe(tipo);
      });
    });

    test('não deve atualizar com campos inválidos', () => {
      const conta = db.createConta({
        nome: 'Conta Teste',
        saldo: 1000,
        tipo: 'corrente',
        ativa: true,
        
      });

      const result = db.updateConta(conta.id, {
        campo_invalido: 'valor',
      } as any);

      expect(result).toBe(false);
    });
  });

  // ========================================
  // TESTES - CATEGORIA
  // ========================================

  describe('Operações de Categoria', () => {
    let usuario: Usuario;

    beforeEach(() => {
      usuario = db.createUsuario('Teste User', 'teste@email.com');
    });

    test('deve criar uma nova categoria de receita', () => {
      const categoria = db.createCategoria({
        nome: 'Salário',
        tipo: 'receita',
        cor: '#4CAF50',
        icone: '💰',
        
      });

      expect(categoria).toBeDefined();
      expect(categoria.nome).toBe('Salário');
      expect(categoria.tipo).toBe('receita');
      expect(categoria.cor).toBe('#4CAF50');
    });

    test('deve criar uma nova categoria de despesa', () => {
      const categoria = db.createCategoria({
        nome: 'Alimentação',
        tipo: 'despesa',
        
      });

      expect(categoria).toBeDefined();
      expect(categoria.tipo).toBe('despesa');
    });

    test('deve listar categorias por tipo', () => {
      db.createCategoria({
        nome: 'Salário',
        tipo: 'receita',
        
      });

      db.createCategoria({
        nome: 'Freelance',
        tipo: 'receita',
        
      });

      db.createCategoria({
        nome: 'Alimentação',
        tipo: 'despesa',
        
      });

      const receitas = db.getCategorias('receita');
      const despesas = db.getCategorias('despesa');

      expect(receitas).toHaveLength(2);
      expect(despesas).toHaveLength(1);
    });

    test('deve listar todas as categorias sem filtro', () => {
      db.createCategoria({
        nome: 'Cat 1',
        tipo: 'receita',
        
      });

      db.createCategoria({
        nome: 'Cat 2',
        tipo: 'despesa',
        
      });

      const todas = db.getCategorias();
      expect(todas).toHaveLength(2);
    });

    test('deve atualizar uma categoria', () => {
      const categoria = db.createCategoria({
        nome: 'Original',
        tipo: 'receita',
        
      });

      const updated = db.updateCategoria(categoria.id, {
        nome: 'Atualizada',
        cor: '#FF0000',
      });

      expect(updated).toBe(true);

      const found = db.getCategoria(categoria.id);
      expect(found?.nome).toBe('Atualizada');
      expect(found?.cor).toBe('#FF0000');
    });

    test('deve deletar uma categoria', () => {
      const categoria = db.createCategoria({
        nome: 'Para Deletar',
        tipo: 'despesa',
        
      });

      const deleted = db.deleteCategoria(categoria.id);
      expect(deleted).toBe(true);

      const found = db.getCategoria(categoria.id);
      expect(found).toBeUndefined();
    });

    test('não deve permitir categoria duplicada para mesmo usuário', () => {
      db.createCategoria({
        nome: 'Duplicada',
        tipo: 'receita',
        
      });

      expect(() => {
        db.createCategoria({
          nome: 'Duplicada',
          tipo: 'receita',
          
        });
      }).toThrow();
    });
  });

  // ========================================
  // TESTES - ORÇAMENTO
  // ========================================

  describe('Operações de Orçamento', () => {
    let usuario: Usuario;
    let categoria: Categoria;

    beforeEach(() => {
      usuario = db.createUsuario('Teste User', 'teste@email.com');
      categoria = db.createCategoria({
        nome: 'Alimentação',
        tipo: 'despesa',
        
      });
    });

    test('deve criar um novo orçamento', () => {
      const orcamento = db.createOrcamento({
        categoria_id: categoria.id,
        valor_planejado: 1000,
        mes: 12,
        ano: 2024,
        
      });

      expect(orcamento).toBeDefined();
      expect(orcamento.valor_planejado).toBe(1000);
      expect(orcamento.mes).toBe(12);
      expect(orcamento.ano).toBe(2024);
    });

    test('deve listar orçamentos por mês e ano', () => {
      db.createOrcamento({
        categoria_id: categoria.id,
        valor_planejado: 1000,
        mes: 12,
        ano: 2024,
        
      });

      db.createOrcamento({
        categoria_id: categoria.id,
        valor_planejado: 1500,
        mes: 1,
        ano: 2025,
        
      });

      const orcamentosDez = db.getOrcamentos(12, 2024);
      const orcamentosJan = db.getOrcamentos(1, 2025);

      expect(orcamentosDez).toHaveLength(1);
      expect(orcamentosJan).toHaveLength(1);
    });

    test('deve validar mês entre 1 e 12', () => {
      expect(() => {
        db.createOrcamento({
          categoria_id: categoria.id,
          valor_planejado: 1000,
          mes: 13, // Inválido
          ano: 2024,
          
        });
      }).toThrow();

      expect(() => {
        db.createOrcamento({
          categoria_id: categoria.id,
          valor_planejado: 1000,
          mes: 0, // Inválido
          ano: 2024,
          
        });
      }).toThrow();
    });

    test('deve atualizar um orçamento', () => {
      const orcamento = db.createOrcamento({
        categoria_id: categoria.id,
        valor_planejado: 1000,
        mes: 12,
        ano: 2024,
        
      });

      const updated = db.updateOrcamento(orcamento.id, {
        valor_planejado: 1500,
      });

      expect(updated).toBe(true);

      const found = db.getOrcamento(orcamento.id);
      expect(found?.valor_planejado).toBe(1500);
    });

    test('deve deletar um orçamento', () => {
      const orcamento = db.createOrcamento({
        categoria_id: categoria.id,
        valor_planejado: 1000,
        mes: 12,
        ano: 2024,
        
      });

      const deleted = db.deleteOrcamento(orcamento.id);
      expect(deleted).toBe(true);

      const found = db.getOrcamento(orcamento.id);
      expect(found).toBeUndefined();
    });
  });

  // ========================================
  // TESTES - TRANSAÇÃO
  // ========================================

  describe('Operações de Transação', () => {
    let usuario: Usuario;
    let conta: Conta;
    let categoriaReceita: Categoria;
    let categoriaDespesa: Categoria;

    beforeEach(() => {
      usuario = db.createUsuario('Teste User', 'teste@email.com');

      conta = db.createConta({
        nome: 'Conta Principal',
        saldo: 1000,
        tipo: 'corrente',
        ativa: true,
        
      });

      categoriaReceita = db.createCategoria({
        nome: 'Salário',
        tipo: 'receita',
        
      });

      categoriaDespesa = db.createCategoria({
        nome: 'Alimentação',
        tipo: 'despesa',
        
      });
    });

    test('deve criar uma transação de receita', () => {
      const transacao = db.createTransacao({
        descricao: 'Salário Dezembro',
        valor: 5000,
        tipo: 'receita',
        data: '2024-12-01',
        conta_id: conta.id,
        categoria_id: categoriaReceita.id,
        
      });

      expect(transacao).toBeDefined();
      expect(transacao.descricao).toBe('Salário Dezembro');
      expect(transacao.valor).toBe(5000);
      expect(transacao.tipo).toBe('receita');
    });

    test('deve criar uma transação de despesa', () => {
      const transacao = db.createTransacao({
        descricao: 'Supermercado',
        valor: 300,
        tipo: 'despesa',
        data: '2024-12-15',
        conta_id: conta.id,
        categoria_id: categoriaDespesa.id,
        
        observacoes: 'Compras do mês',
      });

      expect(transacao).toBeDefined();
      expect(transacao.tipo).toBe('despesa');
      expect(transacao.observacoes).toBe('Compras do mês');
    });

    test('deve atualizar saldo da conta ao criar receita', () => {
      const saldoInicial = conta.saldo;

      db.createTransacao({
        descricao: 'Receita Extra',
        valor: 500,
        tipo: 'receita',
        data: '2024-12-20',
        conta_id: conta.id,
        categoria_id: categoriaReceita.id,
        
      });

      const contaAtualizada = db.getConta(conta.id);
      expect(contaAtualizada?.saldo).toBe(saldoInicial + 500);
    });

    test('deve atualizar saldo da conta ao criar despesa', () => {
      const saldoInicial = conta.saldo;

      db.createTransacao({
        descricao: 'Compra',
        valor: 200,
        tipo: 'despesa',
        data: '2024-12-20',
        conta_id: conta.id,
        categoria_id: categoriaDespesa.id,
        
      });

      const contaAtualizada = db.getConta(conta.id);
      expect(contaAtualizada?.saldo).toBe(saldoInicial - 200);
    });

    test('deve listar transações com limit', () => {
      // Criar 5 transações
      for (let i = 1; i <= 5; i++) {
        db.createTransacao({
          descricao: `Transação ${i}`,
          valor: 100 * i,
          tipo: i % 2 === 0 ? 'receita' : 'despesa',
          data: `2024-12-${String(i).padStart(2, '0')}`,
          conta_id: conta.id,
          categoria_id: i % 2 === 0 ? categoriaReceita.id : categoriaDespesa.id,
          
        });
      }

      const todas = db.getTransacoes();
      const limitadas = db.getTransacoes(3);

      expect(todas.length).toBe(5);
      expect(limitadas.length).toBe(3);
    });

    test('deve incluir nomes de conta e categoria nas transações', () => {
      db.createTransacao({
        descricao: 'Teste',
        valor: 100,
        tipo: 'receita',
        data: '2024-12-25',
        conta_id: conta.id,
        categoria_id: categoriaReceita.id,
        
      });

      const transacoes = db.getTransacoes();

      expect(transacoes[0].conta_nome).toBe(conta.nome);
      expect(transacoes[0].categoria_nome).toBe(categoriaReceita.nome);
    });

    test('deve atualizar uma transação', () => {
      const transacao = db.createTransacao({
        descricao: 'Original',
        valor: 100,
        tipo: 'despesa',
        data: '2024-12-25',
        conta_id: conta.id,
        categoria_id: categoriaDespesa.id,
        
      });

      const updated = db.updateTransacao(transacao.id, {
        descricao: 'Atualizada',
        valor: 150,
      });

      expect(updated).toBe(true);

      const found = db.getTransacao(transacao.id);
      expect(found?.descricao).toBe('Atualizada');
      expect(found?.valor).toBe(150);
    });

    test('deve reverter saldo ao deletar transação de receita', () => {
      const saldoInicial = conta.saldo;

      const transacao = db.createTransacao({
        descricao: 'Receita',
        valor: 500,
        tipo: 'receita',
        data: '2024-12-25',
        conta_id: conta.id,
        categoria_id: categoriaReceita.id,
        
      });

      // Saldo deve ter aumentado
      let contaAtualizada = db.getConta(conta.id);
      expect(contaAtualizada?.saldo).toBe(saldoInicial + 500);

      // Deletar transação
      db.deleteTransacao(transacao.id);

      // Saldo deve voltar ao inicial
      contaAtualizada = db.getConta(conta.id);
      expect(contaAtualizada?.saldo).toBe(saldoInicial);
    });

    test('deve reverter saldo ao deletar transação de despesa', () => {
      const saldoInicial = conta.saldo;

      const transacao = db.createTransacao({
        descricao: 'Despesa',
        valor: 300,
        tipo: 'despesa',
        data: '2024-12-25',
        conta_id: conta.id,
        categoria_id: categoriaDespesa.id,
        
      });

      // Saldo deve ter diminuído
      let contaAtualizada = db.getConta(conta.id);
      expect(contaAtualizada?.saldo).toBe(saldoInicial - 300);

      // Deletar transação
      db.deleteTransacao(transacao.id);

      // Saldo deve voltar ao inicial
      contaAtualizada = db.getConta(conta.id);
      expect(contaAtualizada?.saldo).toBe(saldoInicial);
    });
  });

  // ========================================
  // TESTES - RELATÓRIOS
  // ========================================

  describe('Relatórios Financeiros', () => {
    let usuario: Usuario;
    let conta: Conta;
    let categoriaReceita: Categoria;
    let categoriaDespesa: Categoria;

    beforeEach(() => {
      usuario = db.createUsuario('Teste User', 'teste@email.com');

      conta = db.createConta({
        nome: 'Conta Principal',
        saldo: 0,
        tipo: 'corrente',
        ativa: true,
        
      });

      categoriaReceita = db.createCategoria({
        nome: 'Salário',
        tipo: 'receita',
        
      });

      categoriaDespesa = db.createCategoria({
        nome: 'Alimentação',
        tipo: 'despesa',
        
      });
    });

    test('deve calcular resumo financeiro correto', () => {
      // Criar receitas
      db.createTransacao({
        descricao: 'Salário',
        valor: 5000,
        tipo: 'receita',
        data: '2024-12-01',
        conta_id: conta.id,
        categoria_id: categoriaReceita.id,
        
      });

      db.createTransacao({
        descricao: 'Freelance',
        valor: 1500,
        tipo: 'receita',
        data: '2024-12-15',
        conta_id: conta.id,
        categoria_id: categoriaReceita.id,
        
      });

      // Criar despesas
      db.createTransacao({
        descricao: 'Supermercado',
        valor: 800,
        tipo: 'despesa',
        data: '2024-12-10',
        conta_id: conta.id,
        categoria_id: categoriaDespesa.id,
        
      });

      db.createTransacao({
        descricao: 'Restaurante',
        valor: 200,
        tipo: 'despesa',
        data: '2024-12-20',
        conta_id: conta.id,
        categoria_id: categoriaDespesa.id,
        
      });

      const resumo = db.getResumoFinanceiro();

      expect(resumo.receita).toBe(6500); // 5000 + 1500
      expect(resumo.despesa).toBe(1000); // 800 + 200
      expect(resumo.saldo).toBe(5500); // 6500 - 1000
    });

    test('deve filtrar resumo por período', () => {
      // Transações em dezembro
      db.createTransacao({
        descricao: 'Dezembro Receita',
        valor: 5000,
        tipo: 'receita',
        data: '2024-12-15',
        conta_id: conta.id,
        categoria_id: categoriaReceita.id,
        
      });

      // Transações em janeiro
      db.createTransacao({
        descricao: 'Janeiro Receita',
        valor: 3000,
        tipo: 'receita',
        data: '2025-01-15',
        conta_id: conta.id,
        categoria_id: categoriaReceita.id,
        
      });

      const resumoDez = db.getResumoFinanceiro('2024-12-01', '2024-12-31');

      const resumoJan = db.getResumoFinanceiro('2025-01-01', '2025-01-31');

      expect(resumoDez.receita).toBe(5000);
      expect(resumoJan.receita).toBe(3000);
    });

    test('deve retornar zeros quando não há transações', () => {
      const resumo = db.getResumoFinanceiro();

      expect(resumo.receita).toBe(0);
      expect(resumo.despesa).toBe(0);
      expect(resumo.saldo).toBe(0);
    });
  });
});
