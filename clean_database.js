#!/usr/bin/env node

/**
 * Script para limpar todos os dados do banco de dados
 * 
 * Este script remove:
 * - Todas as transações
 * - Todas as transações de cartão
 * - Todos os cartões
 * - Todas as parcelas
 * - Todas as categorias
 * - Todas as contas
 * - Todos os orçamentos
 * 
 * A estrutura das tabelas é mantida.
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// Cores para output no terminal
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Função para perguntar confirmação ao usuário
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${colors.yellow}${question} (sim/não): ${colors.reset}`, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'sim' || answer.toLowerCase() === 's');
    });
  });
}

// Determinar caminho do banco de dados baseado no sistema operacional
function getDatabasePath() {
  const appName = 'genfins'; // Nome da aplicação
  let userDataPath;

  if (process.platform === 'win32') {
    userDataPath = path.join(process.env.APPDATA || '', appName);
  } else if (process.platform === 'darwin') {
    userDataPath = path.join(os.homedir(), 'Library', 'Application Support', appName);
  } else {
    // Linux
    userDataPath = path.join(os.homedir(), '.config', appName);
  }

  return path.join(userDataPath, 'financas.db');
}

async function clearDatabase() {
  const dbPath = getDatabasePath();

  log('\n==============================================', 'blue');
  log('   LIMPEZA DO BANCO DE DADOS - GenFins', 'blue');
  log('==============================================\n', 'blue');

  log(`Caminho do banco de dados: ${dbPath}`, 'magenta');

  // Verificar se o banco de dados existe
  if (!fs.existsSync(dbPath)) {
    log('\n❌ Banco de dados não encontrado!', 'red');
    log(`O arquivo não existe em: ${dbPath}`, 'yellow');
    process.exit(1);
  }

  // Criar backup antes de limpar
  const backupPath = `${dbPath}.backup.${Date.now()}`;
  log(`\n📦 Criando backup em: ${backupPath}`, 'yellow');
  fs.copyFileSync(dbPath, backupPath);
  log('✅ Backup criado com sucesso!', 'green');

  // Perguntar confirmação
  log('\n⚠️  ATENÇÃO: Esta ação irá remover TODOS os dados do banco!', 'red');
  log('Incluindo:', 'yellow');
  log('  • Todas as transações', 'yellow');
  log('  • Todas as transações de cartão', 'yellow');
  log('  • Todos os cartões', 'yellow');
  log('  • Todas as parcelas', 'yellow');
  log('  • Todas as categorias', 'yellow');
  log('  • Todas as contas', 'yellow');
  log('  • Todos os orçamentos', 'yellow');
  log('\nA estrutura das tabelas será mantida.', 'blue');
  log(`Um backup foi criado em: ${backupPath}\n`, 'green');

  const confirmed = await askConfirmation('Deseja continuar?');

  if (!confirmed) {
    log('\n❌ Operação cancelada pelo usuário.', 'yellow');
    log('O backup foi mantido em caso de necessidade futura.', 'blue');
    process.exit(0);
  }

  try {
    log('\n🔄 Carregando banco de dados...', 'blue');
    
    // Inicializar SQL.js
    const SQL = await initSqlJs();
    
    // Carregar banco de dados
    const buffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    log('✅ Banco de dados carregado!', 'green');
    log('\n🗑️  Limpando dados...', 'blue');

    // Executar limpeza em uma transação
    db.run('BEGIN TRANSACTION');

    try {
      // Ordem importante: deletar tabelas dependentes primeiro
      db.run('DELETE FROM transacoes_cartao');
      log('  ✓ Transações de cartão removidas', 'green');

      db.run('DELETE FROM transacoes');
      log('  ✓ Transações removidas', 'green');

      db.run('DELETE FROM parcelas');
      log('  ✓ Parcelas removidas', 'green');

      db.run('DELETE FROM orcamentos');
      log('  ✓ Orçamentos removidos', 'green');

      db.run('DELETE FROM cartoes');
      log('  ✓ Cartões removidos', 'green');

      db.run('DELETE FROM categorias');
      log('  ✓ Categorias removidas', 'green');

      db.run('DELETE FROM contas');
      log('  ✓ Contas removidas', 'green');

      // Resetar os auto-incrementos
      db.run(
        "DELETE FROM sqlite_sequence WHERE name IN ('transacoes_cartao', 'transacoes', 'parcelas', 'orcamentos', 'cartoes', 'categorias', 'contas')"
      );
      log('  ✓ Contadores resetados', 'green');

      db.run('COMMIT');
      log('\n✅ Transação concluída com sucesso!', 'green');
    } catch (error) {
      db.run('ROLLBACK');
      throw error;
    }

    // Salvar banco de dados limpo
    log('\n💾 Salvando alterações...', 'blue');
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
    
    db.close();
    
    log('✅ Banco de dados salvo!', 'green');
    log('\n==============================================', 'blue');
    log('   ✅ LIMPEZA CONCLUÍDA COM SUCESSO!', 'green');
    log('==============================================', 'blue');
    log(`\n📦 Backup mantido em: ${backupPath}`, 'magenta');
    log('💡 Você pode restaurar os dados copiando o backup de volta para:', 'blue');
    log(`   ${dbPath}\n`, 'blue');

  } catch (error) {
    log('\n❌ ERRO ao limpar banco de dados:', 'red');
    log(error.message, 'red');
    if (error.stack) {
      log('\nStack trace:', 'yellow');
      log(error.stack, 'yellow');
    }
    log(`\n📦 O backup está salvo em: ${backupPath}`, 'green');
    process.exit(1);
  }
}

// Executar
clearDatabase().catch((error) => {
  log('\n❌ ERRO FATAL:', 'red');
  log(error.message, 'red');
  process.exit(1);
});