// Script de correção de patrimônio líquido
// Corrige saldos inconsistentes criando transações de saldo inicial

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const os = require('os');

async function corrigirPatrimonio() {
  console.log('🔧 INICIANDO CORREÇÃO DE PATRIMÔNIO LÍQUIDO\n');
  console.log('='.repeat(80));

  // Determinar caminho do banco de dados
  let dbPath;

  if (process.argv[2]) {
    dbPath = process.argv[2];
  } else {
    const appDataPath = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    dbPath = path.join(appDataPath, 'genfins', 'financas.db');
  }

  console.log(`📂 Banco de dados: ${dbPath}\n`);

  if (!fs.existsSync(dbPath)) {
    console.error('❌ Erro: Banco de dados não encontrado!');
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  try {
    // Habilitar foreign keys
    db.run('PRAGMA foreign_keys = ON');

    // 1. Buscar a conta Mercado Pago
    console.log('🔍 Buscando conta "Mercado Pago"...\n');

    const contaResult = db.exec(`
      SELECT id, nome, saldo, tipo, ativa, usuario_id
      FROM contas
      WHERE nome = 'Mercado Pago'
      LIMIT 1
    `);

    if (contaResult.length === 0 || contaResult[0].values.length === 0) {
      console.error('❌ Conta "Mercado Pago" não encontrada!');
      process.exit(1);
    }

    const conta = {
      id: contaResult[0].values[0][0],
      nome: contaResult[0].values[0][1],
      saldo: contaResult[0].values[0][2],
      tipo: contaResult[0].values[0][3],
      ativa: contaResult[0].values[0][4],
      usuario_id: contaResult[0].values[0][5],
    };

    console.log(`✅ Conta encontrada:`);
    console.log(`   ID: ${conta.id}`);
    console.log(`   Nome: ${conta.nome}`);
    console.log(`   Saldo atual: R$ ${conta.saldo.toFixed(2)}`);
    console.log(`   Usuário ID: ${conta.usuario_id}\n`);

    // 2. Verificar quantas transações existem
    const transacoesResult = db.exec(`
      SELECT COUNT(*) as total FROM transacoes WHERE conta_id = ${conta.id}
    `);

    const totalTransacoes = transacoesResult[0].values[0][0];
    console.log(`📊 Transações existentes: ${totalTransacoes}\n`);

    // 3. Buscar ou criar categoria "Saldo Inicial"
    console.log('🔍 Buscando categoria "Saldo Inicial"...\n');

    let categoriaId;
    const categoriaResult = db.exec(`
      SELECT id FROM categorias
      WHERE nome = 'Saldo Inicial' AND tipo = 'receita' AND usuario_id = ${conta.usuario_id}
      LIMIT 1
    `);

    if (categoriaResult.length === 0 || categoriaResult[0].values.length === 0) {
      console.log('📝 Categoria "Saldo Inicial" não encontrada. Criando...');

      db.run(`
        INSERT INTO categorias (nome, tipo, cor, icone, usuario_id, created_at, updated_at)
        VALUES ('Saldo Inicial', 'receita', '#4CAF50', '💰', ${conta.usuario_id}, datetime('now'), datetime('now'))
      `);

      const novaCategoriaResult = db.exec(`
        SELECT id FROM categorias
        WHERE nome = 'Saldo Inicial' AND tipo = 'receita' AND usuario_id = ${conta.usuario_id}
        ORDER BY id DESC LIMIT 1
      `);

      categoriaId = novaCategoriaResult[0].values[0][0];
      console.log(`✅ Categoria criada com ID: ${categoriaId}\n`);
    } else {
      categoriaId = categoriaResult[0].values[0][0];
      console.log(`✅ Categoria encontrada com ID: ${categoriaId}\n`);
    }

    // 4. Calcular valor da transação necessária
    const valorTransacao = conta.saldo;

    if (Math.abs(valorTransacao) < 0.01) {
      console.log('✅ Saldo já está zerado ou correto. Nenhuma correção necessária.');
      return;
    }

    console.log('='.repeat(80));
    console.log('💾 CRIANDO TRANSAÇÃO DE SALDO INICIAL:\n');
    console.log(`   Descrição: Saldo inicial da conta ${conta.nome}`);
    console.log(`   Valor: R$ ${valorTransacao.toFixed(2)}`);
    console.log(`   Tipo: receita`);
    console.log(`   Data: 2025-01-01 (primeira data do ano)`);
    console.log(`   Conta: ${conta.nome} (ID: ${conta.id})`);
    console.log(`   Categoria: Saldo Inicial (ID: ${categoriaId})\n`);

    // 5. IMPORTANTE: Primeiro zerar o saldo manualmente para evitar duplicação
    console.log('🔄 Zerando saldo atual da conta...');
    db.run(`UPDATE contas SET saldo = 0 WHERE id = ${conta.id}`);
    console.log('✅ Saldo zerado\n');

    // 6. Criar a transação (o trigger irá atualizar o saldo automaticamente)
    console.log('📝 Inserindo transação...');

    db.run(`
      INSERT INTO transacoes (
        descricao,
        valor,
        tipo,
        data,
        conta_id,
        categoria_id,
        usuario_id,
        observacoes,
        created_at,
        updated_at
      ) VALUES (
        'Saldo inicial da conta ${conta.nome}',
        ${valorTransacao},
        'receita',
        '2025-01-01',
        ${conta.id},
        ${categoriaId},
        ${conta.usuario_id},
        'Transação criada automaticamente pelo script de correção de patrimônio',
        datetime('now'),
        datetime('now')
      )
    `);

    console.log('✅ Transação criada!\n');

    // 7. Verificar se o trigger funcionou
    console.log('🔍 Verificando se o saldo foi atualizado corretamente...\n');

    const contaAtualizadaResult = db.exec(`
      SELECT id, nome, saldo FROM contas WHERE id = ${conta.id}
    `);

    const saldoNovo = contaAtualizadaResult[0].values[0][2];

    console.log('='.repeat(80));
    console.log('📊 RESULTADO DA CORREÇÃO:\n');
    console.log(`   Saldo antes:  R$ ${conta.saldo.toFixed(2)}`);
    console.log(`   Saldo depois: R$ ${saldoNovo.toFixed(2)}`);

    if (Math.abs(saldoNovo - valorTransacao) < 0.01) {
      console.log('\n✅ SUCESSO! O saldo foi corrigido corretamente!');
      console.log('   O trigger SQL atualizou o saldo automaticamente.');
    } else {
      console.log(`\n⚠️  ATENÇÃO: Saldo esperado era R$ ${valorTransacao.toFixed(2)}, mas ficou R$ ${saldoNovo.toFixed(2)}`);
    }

    // 8. Salvar alterações no arquivo
    console.log('\n💾 Salvando alterações no banco de dados...');
    const data = db.export();
    fs.writeFileSync(dbPath, data);
    console.log('✅ Banco de dados atualizado!\n');

    console.log('='.repeat(80));
    console.log('✔️  Correção concluída com sucesso!\n');
    console.log('💡 Próximos passos:');
    console.log('   1. Execute: npm run verify:patrimonio');
    console.log('   2. Verifique se todas as contas estão corretas');
    console.log('   3. Abra o aplicativo e confira o patrimônio líquido\n');

  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Executar correção
corrigirPatrimonio().catch((error) => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
