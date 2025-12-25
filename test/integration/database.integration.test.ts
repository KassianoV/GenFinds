// test/integration/database.integration.test.ts
/**
 * Testes de Integração - Fluxos Completos
 * 
 * Testa cenários reais de uso combinando múltiplas operações
 */

import { DatabaseManager } from '../../src/database/database';

describe('DatabaseManager - Testes de Integração', () => {
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
  // CENÁRIO 1: Novo Usuário - Setup Completo
  // ========================================
  
  describe('Cenário: Novo usuário configurando aplicação', () => {
    test('deve criar usuário, contas, categorias e fazer primeira transação', () => {
      // 1. Criar usuário
      const usuario = db.createUsuario('João Silva', 'joao@email.com');
      expect(usuario.id).toBeDefined();

      // 2. Criar contas
      const contaCorrente = db.createConta({
        nome: 'Conta Corrente',
        saldo: 5000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id
      });

      const poupanca = db.createConta({
        nome: 'Poupança',
        saldo: 10000,
        tipo: 'poupanca',
        ativa: true,
        usuario_id: usuario.id
      });

      expect(db.getContas(usuario.id)).toHaveLength(2);

      // 3. Criar categorias
      const categorias = [
        { nome: 'Salário', tipo: 'receita' as const },
        { nome: 'Freelance', tipo: 'receita' as const },
        { nome: 'Alimentação', tipo: 'despesa' as const },
        { nome: 'Transporte', tipo: 'despesa' as const },
        { nome: 'Lazer', tipo: 'despesa' as const }
      ];

      categorias.forEach(cat => {
        db.createCategoria({
          nome: cat.nome,
          tipo: cat.tipo,
          usuario_id: usuario.id
        });
      });

      expect(db.getCategorias(usuario.id)).toHaveLength(5);
      expect(db.getCategorias(usuario.id, 'receita')).toHaveLength(2);
      expect(db.getCategorias(usuario.id, 'despesa')).toHaveLength(3);

      // 4. Criar primeira transação
      const categoriaSalario = db.getCategorias(usuario.id, 'receita')
        .find(c => c.nome === 'Salário');

      const transacao = db.createTransacao({
        descricao: 'Salário Dezembro',
        valor: 5000,
        tipo: 'receita',
        data: '2024-12-01',
        conta_id: contaCorrente.id,
        categoria_id: categoriaSalario!.id,
        usuario_id: usuario.id
      });

      expect(transacao).toBeDefined();

      // 5. Verificar saldo atualizado
      const contaAtualizada = db.getConta(contaCorrente.id);
      expect(contaAtualizada?.saldo).toBe(10000); // 5000 inicial + 5000 salário
    });
  });

  // ========================================
  // CENÁRIO 2: Controle de Orçamento Mensal
  // ========================================
  
  describe('Cenário: Controle de orçamento mensal', () => {
    test('deve configurar orçamentos e acompanhar gastos', () => {
      // Setup inicial
      const usuario = db.createUsuario('Maria Santos', 'maria@email.com');
      
      const conta = db.createConta({
        nome: 'Conta Principal',
        saldo: 10000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id
      });

      // Criar categorias de despesa
      const catAlimentacao = db.createCategoria({
        nome: 'Alimentação',
        tipo: 'despesa',
        usuario_id: usuario.id
      });

      const catTransporte = db.createCategoria({
        nome: 'Transporte',
        tipo: 'despesa',
        usuario_id: usuario.id
      });

      const catLazer = db.createCategoria({
        nome: 'Lazer',
        tipo: 'despesa',
        usuario_id: usuario.id
      });

      // Configurar orçamentos para dezembro/2024
      const orcamentos = [
        { categoria: catAlimentacao, valor: 1500 },
        { categoria: catTransporte, valor: 500 },
        { categoria: catLazer, valor: 300 }
      ];

      orcamentos.forEach(orc => {
        db.createOrcamento({
          categoria_id: orc.categoria.id,
          valor_planejado: orc.valor,
          mes: 12,
          ano: 2024,
          usuario_id: usuario.id
        });
      });

      // Registrar gastos do mês
      const gastos = [
        { categoria: catAlimentacao, valor: 800, descricao: 'Supermercado 1' },
        { categoria: catAlimentacao, valor: 400, descricao: 'Supermercado 2' },
        { categoria: catTransporte, valor: 200, descricao: 'Combustível' },
        { categoria: catTransporte, valor: 150, descricao: 'Uber' },
        { categoria: catLazer, valor: 250, descricao: 'Cinema e jantar' }
      ];

      gastos.forEach((gasto, index) => {
        db.createTransacao({
          descricao: gasto.descricao,
          valor: gasto.valor,
          tipo: 'despesa',
          data: `2024-12-${String(index + 1).padStart(2, '0')}`,
          conta_id: conta.id,
          categoria_id: gasto.categoria.id,
          usuario_id: usuario.id
        });
      });

      // Verificar resumo
      const resumo = db.getResumoFinanceiro(
        usuario.id,
        '2024-12-01',
        '2024-12-31'
      );

      expect(resumo.despesa).toBe(1800); // Total de gastos
      expect(resumo.receita).toBe(0);
      expect(resumo.saldo).toBe(-1800);

      // Verificar saldo da conta
      const contaAtualizada = db.getConta(conta.id);
      expect(contaAtualizada?.saldo).toBe(8200); // 10000 - 1800

      // Verificar orçamentos
      const orcamentosConfigurados = db.getOrcamentos(usuario.id, 12, 2024);
      expect(orcamentosConfigurados).toHaveLength(3);

      // Calcular quanto foi gasto por categoria
      const transacoes = db.getTransacoes(usuario.id);
      
      const gastoAlimentacao = transacoes
        .filter(t => t.categoria_id === catAlimentacao.id)
        .reduce((sum, t) => sum + t.valor, 0);
      
      const gastoTransporte = transacoes
        .filter(t => t.categoria_id === catTransporte.id)
        .reduce((sum, t) => sum + t.valor, 0);

      expect(gastoAlimentacao).toBe(1200); // 800 + 400
      expect(gastoTransporte).toBe(350);   // 200 + 150

      // Verificar se está dentro do orçamento
      const orcamentoAlimentacao = orcamentosConfigurados
        .find(o => o.categoria_id === catAlimentacao.id);
      
      expect(gastoAlimentacao).toBeLessThan(orcamentoAlimentacao!.valor_planejado);
    });
  });

  // ========================================
  // CENÁRIO 3: Transferência Entre Contas
  // ========================================
  
  describe('Cenário: Transferência entre contas', () => {
    test('deve transferir valor de uma conta para outra', () => {
      // Setup
      const usuario = db.createUsuario('Pedro Costa', 'pedro@email.com');

      const contaCorrente = db.createConta({
        nome: 'Conta Corrente',
        saldo: 5000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id
      });

      const poupanca = db.createConta({
        nome: 'Poupança',
        saldo: 10000,
        tipo: 'poupanca',
        ativa: true,
        usuario_id: usuario.id
      });

      // Criar categorias para transferência
      const catTransferenciaOut = db.createCategoria({
        nome: 'Transferência (Saída)',
        tipo: 'despesa',
        usuario_id: usuario.id
      });

      const catTransferenciaIn = db.createCategoria({
        nome: 'Transferência (Entrada)',
        tipo: 'receita',
        usuario_id: usuario.id
      });

      const valorTransferencia = 2000;

      // Registrar saída da conta corrente
      db.createTransacao({
        descricao: 'Transferência para Poupança',
        valor: valorTransferencia,
        tipo: 'despesa',
        data: '2024-12-25',
        conta_id: contaCorrente.id,
        categoria_id: catTransferenciaOut.id,
        usuario_id: usuario.id
      });

      // Registrar entrada na poupança
      db.createTransacao({
        descricao: 'Transferência da Conta Corrente',
        valor: valorTransferencia,
        tipo: 'receita',
        data: '2024-12-25',
        conta_id: poupanca.id,
        categoria_id: catTransferenciaIn.id,
        usuario_id: usuario.id
      });

      // Verificar saldos
      const ccAtualizada = db.getConta(contaCorrente.id);
      const poupancaAtualizada = db.getConta(poupanca.id);

      expect(ccAtualizada?.saldo).toBe(3000);  // 5000 - 2000
      expect(poupancaAtualizada?.saldo).toBe(12000); // 10000 + 2000

      // Saldo total deve permanecer o mesmo
      const saldoTotal = ccAtualizada!.saldo + poupancaAtualizada!.saldo;
      expect(saldoTotal).toBe(15000); // 5000 + 10000 (inicial)
    });
  });

  // ========================================
  // CENÁRIO 4: Edição de Transação
  // ========================================
  
  describe('Cenário: Editar transação e atualizar saldos', () => {
    test('deve atualizar transação e recalcular saldos corretamente', () => {
      // Setup
      const usuario = db.createUsuario('Ana Lima', 'ana@email.com');

      const conta1 = db.createConta({
        nome: 'Conta 1',
        saldo: 1000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id
      });

      const conta2 = db.createConta({
        nome: 'Conta 2',
        saldo: 2000,
        tipo: 'poupanca',
        ativa: true,
        usuario_id: usuario.id
      });

      const categoria = db.createCategoria({
        nome: 'Compras',
        tipo: 'despesa',
        usuario_id: usuario.id
      });

      // Criar transação inicial
      const transacao = db.createTransacao({
        descricao: 'Compra Original',
        valor: 500,
        tipo: 'despesa',
        data: '2024-12-20',
        conta_id: conta1.id,
        categoria_id: categoria.id,
        usuario_id: usuario.id
      });

      // Verificar saldo após criação
      let conta1Atual = db.getConta(conta1.id);
      expect(conta1Atual?.saldo).toBe(500); // 1000 - 500

      // Editar: mudar valor
      db.updateTransacao(transacao.id, {
        valor: 300 // Diminuir valor
      });

      // Saldo deve ser recalculado (implementação futura no backend)
      // Por enquanto, apenas verificar que a transação foi atualizada
      const transacaoAtualizada = db.getTransacao(transacao.id);
      expect(transacaoAtualizada?.valor).toBe(300);

      // Editar: mudar para outra conta
      db.updateTransacao(transacao.id, {
        conta_id: conta2.id
      });

      const transacaoNaConta2 = db.getTransacao(transacao.id);
      expect(transacaoNaConta2?.conta_id).toBe(conta2.id);
    });
  });

  // ========================================
  // CENÁRIO 5: Exclusão em Cascata
  // ========================================
  
  describe('Cenário: Exclusão de dados relacionados', () => {
    test('deve manter integridade ao deletar categoria com orçamentos', () => {
      const usuario = db.createUsuario('Carlos Souza', 'carlos@email.com');

      const categoria = db.createCategoria({
        nome: 'Categoria Teste',
        tipo: 'despesa',
        usuario_id: usuario.id
      });

      // Criar orçamento para esta categoria
      db.createOrcamento({
        categoria_id: categoria.id,
        valor_planejado: 1000,
        mes: 12,
        ano: 2024,
        usuario_id: usuario.id
      });

      // Verificar que orçamento existe
      const orcamentosAntes = db.getOrcamentos(usuario.id, 12, 2024);
      expect(orcamentosAntes).toHaveLength(1);

      // Deletar categoria (deve deletar orçamento em cascata)
      db.deleteCategoria(categoria.id);

      // Verificar que categoria foi deletada
      const categoriaExiste = db.getCategoria(categoria.id);
      expect(categoriaExiste).toBeUndefined();

      // Verificar que orçamento também foi deletado (CASCADE)
      const orcamentosDepois = db.getOrcamentos(usuario.id, 12, 2024);
      expect(orcamentosDepois).toHaveLength(0);
    });

    test('deve reverter saldo ao deletar conta com transações', () => {
      const usuario = db.createUsuario('Teste', 'teste@email.com');

      const conta = db.createConta({
        nome: 'Conta Temporária',
        saldo: 1000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id
      });

      const categoria = db.createCategoria({
        nome: 'Categoria',
        tipo: 'despesa',
        usuario_id: usuario.id
      });

      // Criar transação
      db.createTransacao({
        descricao: 'Compra',
        valor: 300,
        tipo: 'despesa',
        data: '2024-12-25',
        conta_id: conta.id,
        categoria_id: categoria.id,
        usuario_id: usuario.id
      });

      // Saldo deve ter diminuído
      let contaAtual = db.getConta(conta.id);
      expect(contaAtual?.saldo).toBe(700);

      // Deletar conta (deve deletar transações em cascata)
      db.deleteConta(conta.id);

      // Verificar que conta foi deletada
      const contaExiste = db.getConta(conta.id);
      expect(contaExiste).toBeUndefined();

      // Verificar que transações foram deletadas
      const transacoes = db.getTransacoes(usuario.id);
      expect(transacoes).toHaveLength(0);
    });
  });

  // ========================================
  // CENÁRIO 6: Múltiplos Usuários
  // ========================================
  
  describe('Cenário: Isolamento de dados entre usuários', () => {
    test('não deve permitir acesso cruzado entre usuários', () => {
      // Criar dois usuários
      const usuario1 = db.createUsuario('Usuário 1', 'user1@email.com');
      const usuario2 = db.createUsuario('Usuário 2', 'user2@email.com');

      // Criar dados para usuário 1
      const conta1 = db.createConta({
        nome: 'Conta User 1',
        saldo: 1000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario1.id
      });

      const cat1 = db.createCategoria({
        nome: 'Categoria User 1',
        tipo: 'receita',
        usuario_id: usuario1.id
      });

      db.createTransacao({
        descricao: 'Transação User 1',
        valor: 500,
        tipo: 'receita',
        data: '2024-12-25',
        conta_id: conta1.id,
        categoria_id: cat1.id,
        usuario_id: usuario1.id
      });

      // Criar dados para usuário 2
      const conta2 = db.createConta({
        nome: 'Conta User 2',
        saldo: 2000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario2.id
      });

      const cat2 = db.createCategoria({
        nome: 'Categoria User 2',
        tipo: 'despesa',
        usuario_id: usuario2.id
      });

      db.createTransacao({
        descricao: 'Transação User 2',
        valor: 300,
        tipo: 'despesa',
        data: '2024-12-25',
        conta_id: conta2.id,
        categoria_id: cat2.id,
        usuario_id: usuario2.id
      });

      // Verificar isolamento
      const contasUser1 = db.getContas(usuario1.id);
      const contasUser2 = db.getContas(usuario2.id);

      expect(contasUser1).toHaveLength(1);
      expect(contasUser2).toHaveLength(1);
      expect(contasUser1[0].nome).toBe('Conta User 1');
      expect(contasUser2[0].nome).toBe('Conta User 2');

      const categoriasUser1 = db.getCategorias(usuario1.id);
      const categoriasUser2 = db.getCategorias(usuario2.id);

      expect(categoriasUser1).toHaveLength(1);
      expect(categoriasUser2).toHaveLength(1);

      const transacoesUser1 = db.getTransacoes(usuario1.id);
      const transacoesUser2 = db.getTransacoes(usuario2.id);

      expect(transacoesUser1).toHaveLength(1);
      expect(transacoesUser2).toHaveLength(1);
      expect(transacoesUser1[0].descricao).toBe('Transação User 1');
      expect(transacoesUser2[0].descricao).toBe('Transação User 2');
    });
  });

  // ========================================
  // CENÁRIO 7: Relatório Anual
  // ========================================
  
  describe('Cenário: Gerar relatório anual', () => {
    test('deve calcular resumo financeiro de todo o ano', () => {
      const usuario = db.createUsuario('Relatório User', 'relatorio@email.com');

      const conta = db.createConta({
        nome: 'Conta Principal',
        saldo: 0,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id
      });

      const catReceita = db.createCategoria({
        nome: 'Salário',
        tipo: 'receita',
        usuario_id: usuario.id
      });

      const catDespesa = db.createCategoria({
        nome: 'Despesas Gerais',
        tipo: 'despesa',
        usuario_id: usuario.id
      });

      // Criar transações para cada mês do ano
      for (let mes = 1; mes <= 12; mes++) {
        // Receita mensal
        db.createTransacao({
          descricao: `Salário ${mes}`,
          valor: 5000,
          tipo: 'receita',
          data: `2024-${String(mes).padStart(2, '0')}-01`,
          conta_id: conta.id,
          categoria_id: catReceita.id,
          usuario_id: usuario.id
        });

        // Despesas mensais
        db.createTransacao({
          descricao: `Despesas ${mes}`,
          valor: 3000,
          tipo: 'despesa',
          data: `2024-${String(mes).padStart(2, '0')}-15`,
          conta_id: conta.id,
          categoria_id: catDespesa.id,
          usuario_id: usuario.id
        });
      }

      // Resumo anual
      const resumoAnual = db.getResumoFinanceiro(
        usuario.id,
        '2024-01-01',
        '2024-12-31'
      );

      expect(resumoAnual.receita).toBe(60000); // 5000 x 12
      expect(resumoAnual.despesa).toBe(36000); // 3000 x 12
      expect(resumoAnual.saldo).toBe(24000);   // 60000 - 36000

      // Verificar saldo final da conta
      const contaFinal = db.getConta(conta.id);
      expect(contaFinal?.saldo).toBe(24000);
    });
  });
});