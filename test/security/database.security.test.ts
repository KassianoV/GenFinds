// test/database.security.test.ts
// Testes de segurança para validar correções de SQL Injection

import { DatabaseManager } from '../../src/database/database';

describe('SQL Injection Security Tests', () => {
  let db: DatabaseManager;

  beforeEach(async () => {
    db = new DatabaseManager();
    await db.init();
  });

  afterEach(() => {
    db.close();
  });

  describe('getTransacoes - LIMIT parameter', () => {
    test('deve aceitar limit numérico válido', async () => {
      const usuario = db.createUsuario('Teste', 'teste@exemplo.com');
      const result = db.getTransacoes(usuario.id, 10);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('deve rejeitar tentativa de SQL injection via limit', async () => {
      const usuario = db.createUsuario('Teste', 'teste@exemplo.com');

      // ❌ Tentativa de ataque
      const maliciousLimit = '1; DROP TABLE transacoes; --' as any;

      // ✅ Deve falhar ou retornar vazio sem executar DROP
      expect(() => {
        db.getTransacoes(usuario.id, maliciousLimit);
      }).not.toThrow();

      // Verificar que a tabela ainda existe
      const result = db.getTransacoes(usuario.id);
      expect(result).toBeDefined();
    });

    test('deve converter limit para inteiro positivo', async () => {
      const usuario = db.createUsuario('Teste', 'teste@exemplo.com');

      // Testes de validação
      const result1 = db.getTransacoes(usuario.id, 5.7); // float
      const result2 = db.getTransacoes(usuario.id, -10); // negativo
      const result3 = db.getTransacoes(usuario.id, 0); // zero

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result3).toBeDefined();
    });
  });

  describe('updateConta - Field whitelist', () => {
    test('deve permitir atualização de campos válidos', () => {
      const usuario = db.createUsuario('Teste', 'teste@exemplo.com');
      const conta = db.createConta({
        nome: 'Conta Teste',
        saldo: 1000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id,
      });

      // ✅ Campos permitidos
      const result = db.updateConta(conta.id, {
        nome: 'Conta Atualizada',
        saldo: 2000,
      });

      expect(result).toBe(true);

      const contaAtualizada = db.getConta(conta.id);
      expect(contaAtualizada?.nome).toBe('Conta Atualizada');
      expect(contaAtualizada?.saldo).toBe(2000);
    });

    test('deve rejeitar tentativa de SQL injection via nome de campo', () => {
      const usuario = db.createUsuario('Teste', 'teste@exemplo.com');
      const conta = db.createConta({
        nome: 'Conta Teste',
        saldo: 1000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id,
      });

      // ❌ Tentativa de ataque
      const maliciousUpdate = {
        "nome = 'hacked', saldo": 9999999,
      } as any;

      const result = db.updateConta(conta.id, maliciousUpdate);

      // ✅ Deve ser rejeitado (retornar false)
      expect(result).toBe(false);

      // Verificar que a conta não foi modificada
      const contaIntacta = db.getConta(conta.id);
      expect(contaIntacta?.nome).toBe('Conta Teste');
      expect(contaIntacta?.saldo).toBe(1000);
    });

    test('deve rejeitar campos não permitidos', () => {
      const usuario = db.createUsuario('Teste', 'teste@exemplo.com');
      const conta = db.createConta({
        nome: 'Conta Teste',
        saldo: 1000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id,
      });

      // ❌ Campo inexistente/malicioso
      const invalidUpdate = {
        campo_inexistente: 'valor',
        created_at: '2020-01-01', // não deve permitir alterar
      } as any;

      const result = db.updateConta(conta.id, invalidUpdate);
      expect(result).toBe(false);
    });
  });

  describe('updateCategoria - Field whitelist', () => {
    test('deve permitir atualização de campos válidos', () => {
      const usuario = db.createUsuario('Teste', 'teste@exemplo.com');
      const categoria = db.createCategoria({
        nome: 'Alimentação',
        tipo: 'despesa',
        cor: '#FF0000',
        usuario_id: usuario.id,
      });

      const result = db.updateCategoria(categoria.id, {
        nome: 'Alimentação Atualizada',
        cor: '#00FF00',
      });

      expect(result).toBe(true);

      const categoriaAtualizada = db.getCategoria(categoria.id);
      expect(categoriaAtualizada?.nome).toBe('Alimentação Atualizada');
      expect(categoriaAtualizada?.cor).toBe('#00FF00');
    });

    test('deve rejeitar campos não permitidos', () => {
      const usuario = db.createUsuario('Teste', 'teste@exemplo.com');
      const categoria = db.createCategoria({
        nome: 'Alimentação',
        tipo: 'despesa',
        usuario_id: usuario.id,
      });

      const invalidUpdate = {
        campo_malicioso: 'valor',
      } as any;

      const result = db.updateCategoria(categoria.id, invalidUpdate);
      expect(result).toBe(false);
    });
  });

  describe('updateOrcamento - Field whitelist', () => {
    test('deve permitir atualização de campos válidos', () => {
      const usuario = db.createUsuario('Teste', 'teste@exemplo.com');
      const categoria = db.createCategoria({
        nome: 'Alimentação',
        tipo: 'despesa',
        usuario_id: usuario.id,
      });

      const orcamento = db.createOrcamento({
        categoria_id: categoria.id,
        valor_planejado: 1000,
        mes: 12,
        ano: 2024,
        usuario_id: usuario.id,
      });

      const result = db.updateOrcamento(orcamento.id, {
        valor_planejado: 1500,
        mes: 1,
        ano: 2025,
      });

      expect(result).toBe(true);

      const orcamentoAtualizado = db.getOrcamento(orcamento.id);
      expect(orcamentoAtualizado?.valor_planejado).toBe(1500);
      expect(orcamentoAtualizado?.mes).toBe(1);
      expect(orcamentoAtualizado?.ano).toBe(2025);
    });
  });

  describe('updateTransacao - Field whitelist', () => {
    test('deve permitir atualização de campos válidos', () => {
      const usuario = db.createUsuario('Teste', 'teste@exemplo.com');
      const conta = db.createConta({
        nome: 'Conta Teste',
        saldo: 1000,
        tipo: 'corrente',
        ativa: true,
        usuario_id: usuario.id,
      });
      const categoria = db.createCategoria({
        nome: 'Alimentação',
        tipo: 'despesa',
        usuario_id: usuario.id,
      });

      const transacao = db.createTransacao({
        descricao: 'Compra supermercado',
        valor: 100,
        tipo: 'despesa',
        data: '2024-12-25',
        conta_id: conta.id,
        categoria_id: categoria.id,
        usuario_id: usuario.id,
      });

      const result = db.updateTransacao(transacao.id, {
        descricao: 'Compra supermercado atualizada',
        valor: 150,
      });

      expect(result).toBe(true);

      const transacaoAtualizada = db.getTransacao(transacao.id);
      expect(transacaoAtualizada?.descricao).toBe('Compra supermercado atualizada');
      expect(transacaoAtualizada?.valor).toBe(150);
    });
  });

  describe('Injection attempts comprehensive test', () => {
    test('deve resistir a múltiplas tentativas de injeção SQL', () => {
      const usuario = db.createUsuario('Teste', 'teste@exemplo.com');

      // Array de payloads maliciosos comuns
      const maliciousPayloads = [
        "' OR '1'='1",
        '1; DROP TABLE usuarios; --',
        "admin'--",
        "' UNION SELECT * FROM usuarios--",
        "1' AND 1=1 UNION SELECT 1,2,3,4,5--",
        "'; EXEC xp_cmdshell('dir'); --",
      ];

      maliciousPayloads.forEach((payload) => {
        // Tentar injetar via diferentes pontos
        expect(() => {
          db.getUsuarioByEmail(payload);
        }).not.toThrow();

        // Verificar que o sistema ainda está funcional
        const usuarioTeste = db.getUsuario(usuario.id);
        expect(usuarioTeste).toBeDefined();
        expect(usuarioTeste?.id).toBe(usuario.id);
      });
    });
  });
});

// ============================================
// TESTES DE INTEGRAÇÃO
// ============================================

describe('Integration Security Tests', () => {
  let db: DatabaseManager;

  beforeEach(async () => {
    db = new DatabaseManager();
    await db.init();
  });

  afterEach(() => {
    db.close();
  });

  test('cenário completo: criar e manipular dados com segurança', () => {
    // 1. Criar usuário
    const usuario = db.createUsuario('João Silva', 'joao@exemplo.com');
    expect(usuario.id).toBeDefined();

    // 2. Criar conta
    const conta = db.createConta({
      nome: 'Conta Principal',
      saldo: 5000,
      tipo: 'corrente',
      ativa: true,
      usuario_id: usuario.id,
    });
    expect(conta.id).toBeDefined();

    // 3. Criar categoria
    const categoria = db.createCategoria({
      nome: 'Salário',
      tipo: 'receita',
      cor: '#4CAF50',
      usuario_id: usuario.id,
    });
    expect(categoria.id).toBeDefined();

    // 4. Criar transação
    const transacao = db.createTransacao({
      descricao: 'Salário Dezembro',
      valor: 5000,
      tipo: 'receita',
      data: '2024-12-01',
      conta_id: conta.id,
      categoria_id: categoria.id,
      usuario_id: usuario.id,
    });
    expect(transacao.id).toBeDefined();

    // 5. Atualizar com dados válidos
    const updateResult = db.updateTransacao(transacao.id, {
      valor: 5500,
      descricao: 'Salário Dezembro + Bônus',
    });
    expect(updateResult).toBe(true);

    // 6. Verificar que os dados foram atualizados corretamente
    const transacaoAtualizada = db.getTransacao(transacao.id);
    expect(transacaoAtualizada?.valor).toBe(5500);
    expect(transacaoAtualizada?.descricao).toBe('Salário Dezembro + Bônus');

    // 7. Tentar injeção SQL em múltiplos pontos - deve falhar
    const maliciousUpdate = {
      "descricao = 'hacked', valor": 999999,
    } as any;

    const hackAttempt = db.updateTransacao(transacao.id, maliciousUpdate);
    expect(hackAttempt).toBe(false);

    // 8. Verificar que os dados permanecem íntegros
    const transacaoFinal = db.getTransacao(transacao.id);
    expect(transacaoFinal?.valor).toBe(5500);
    expect(transacaoFinal?.descricao).toBe('Salário Dezembro + Bônus');
  });
});
