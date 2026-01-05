// Script de verificação de patrimônio líquido
// Verifica se os saldos das contas estão consistentes com as transações
// Uso: node verify-patrimonio.js [caminho-do-banco-de-dados]

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const os = require('os');

async function verificarPatrimonio() {
  console.log('🔍 INICIANDO VERIFICAÇÃO DE PATRIMÔNIO LÍQUIDO\n');
  console.log('='.repeat(80));

  // Determinar caminho do banco de dados
  let dbPath;

  if (process.argv[2]) {
    // Caminho fornecido como argumento
    dbPath = process.argv[2];
  } else {
    // Tentar localizar automaticamente
    const appDataPath = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    dbPath = path.join(appDataPath, 'genfins', 'financas.db');
  }

  console.log(`📂 Procurando banco de dados em: ${dbPath}\n`);

  if (!fs.existsSync(dbPath)) {
    console.error('❌ Erro: Banco de dados não encontrado!');
    console.log('\n💡 Dica: Forneça o caminho do banco como argumento:');
    console.log('   node verify-patrimonio.js "C:\\caminho\\para\\financas.db"');

    // Tentar encontrar o arquivo
    console.log('\n🔍 Tentando localizar o arquivo...');
    const possiveisCaminhos = [
      path.join(appDataPath, 'genfins', 'financas.db'),
      path.join(appDataPath, 'GenFins', 'financas.db'),
      path.join(os.homedir(), 'AppData', 'Local', 'genfins', 'financas.db'),
      path.join(os.homedir(), 'AppData', 'Local', 'GenFins', 'financas.db'),
    ];

    console.log('\nLocais verificados:');
    possiveisCaminhos.forEach(p => {
      const existe = fs.existsSync(p);
      console.log(`  ${existe ? '✅' : '❌'} ${p}`);
      if (existe) dbPath = p;
    });

    if (!fs.existsSync(dbPath)) {
      process.exit(1);
    }
  }

  console.log(`✅ Banco de dados encontrado!\n`);

  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  try {
    // 1. Buscar todas as contas
    console.log('📊 CONTAS CADASTRADAS:');
    console.log('-'.repeat(80));

    const contasResult = db.exec('SELECT * FROM contas ORDER BY id');

    if (contasResult.length === 0 || contasResult[0].values.length === 0) {
      console.log('⚠️  Nenhuma conta encontrada no banco de dados.');
      return;
    }

    const contas = contasResult[0].values.map((row) => ({
      id: row[0],
      nome: row[1],
      saldo: row[2],
      tipo: row[3],
      ativa: Boolean(row[4]),
      usuario_id: row[5],
    }));

    // 2. Para cada conta, verificar transações
    const resultados = [];
    let patrimonioArmazenado = 0;
    let patrimonioCalculado = 0;

    for (const conta of contas) {
      if (!conta.ativa) {
        console.log(`\n⏸️  Conta #${conta.id} - ${conta.nome} (INATIVA - ignorada)`);
        continue;
      }

      // Buscar todas as transações da conta
      const transacoesResult = db.exec(`
        SELECT id, descricao, valor, tipo, data, conta_id, categoria_id
        FROM transacoes
        WHERE conta_id = ${conta.id}
        ORDER BY data
      `);

      let saldoCalculado = 0;
      let transacoesCount = 0;

      if (transacoesResult.length > 0 && transacoesResult[0].values.length > 0) {
        const transacoes = transacoesResult[0].values.map((row) => ({
          id: row[0],
          descricao: row[1],
          valor: row[2],
          tipo: row[3],
          data: row[4],
          conta_id: row[5],
          categoria_id: row[6],
        }));

        transacoesCount = transacoes.length;

        // Calcular saldo baseado nas transações
        for (const transacao of transacoes) {
          if (transacao.tipo === 'receita') {
            saldoCalculado += transacao.valor;
          } else {
            saldoCalculado -= transacao.valor;
          }
        }
      }

      const diferenca = Math.abs(conta.saldo - saldoCalculado);
      const status = diferenca < 0.01 ? 'OK' : 'INCONSISTENTE'; // Tolerância de 1 centavo

      resultados.push({
        contaId: conta.id,
        contaNome: conta.nome,
        saldoArmazenado: conta.saldo,
        saldoCalculado,
        diferenca,
        status,
        transacoesCount,
      });

      patrimonioArmazenado += conta.saldo;
      patrimonioCalculado += saldoCalculado;

      // Exibir resultado da conta
      const icone = status === 'OK' ? '✅' : '❌';
      console.log(`\n${icone} Conta #${conta.id} - ${conta.nome} (${conta.tipo})`);
      console.log(`   Saldo armazenado: R$ ${conta.saldo.toFixed(2)}`);
      console.log(`   Saldo calculado:  R$ ${saldoCalculado.toFixed(2)}`);
      console.log(`   Transações:       ${transacoesCount}`);

      if (status === 'INCONSISTENTE') {
        console.log(`   ⚠️  DIFERENÇA: R$ ${diferenca.toFixed(2)}`);
      }
    }

    // 3. Resumo final
    console.log('\n' + '='.repeat(80));
    console.log('📈 RESUMO DO PATRIMÔNIO LÍQUIDO:\n');

    const contasAtivas = contas.filter((c) => c.ativa);
    const contasOK = resultados.filter((r) => r.status === 'OK');
    const contasInconsistentes = resultados.filter((r) => r.status === 'INCONSISTENTE');

    console.log(`Total de contas ativas: ${contasAtivas.length}`);
    console.log(`Contas corretas:        ${contasOK.length} ✅`);
    console.log(`Contas inconsistentes:  ${contasInconsistentes.length} ❌\n`);

    console.log(`Patrimônio armazenado:  R$ ${patrimonioArmazenado.toFixed(2)}`);
    console.log(`Patrimônio calculado:   R$ ${patrimonioCalculado.toFixed(2)}`);

    const diferencaTotal = Math.abs(patrimonioArmazenado - patrimonioCalculado);
    console.log(`Diferença total:        R$ ${diferencaTotal.toFixed(2)}\n`);

    if (contasInconsistentes.length > 0) {
      console.log('⚠️  ATENÇÃO: Foram encontradas inconsistências!\n');
      console.log('Contas com problemas:');
      contasInconsistentes.forEach((r) => {
        console.log(`  - ${r.contaNome}: diferença de R$ ${r.diferenca.toFixed(2)}`);
      });
      console.log('\n💡 Possíveis causas:');
      console.log('  1. Transações foram editadas manualmente no banco de dados');
      console.log('  2. Saldos iniciais foram definidos incorretamente');
      console.log('  3. Triggers SQL não foram executados corretamente');
      console.log('  4. Importação de dados com erro');
      console.log('\n💊 Solução sugerida:');
      console.log('  Execute o script de correção para recalcular todos os saldos.');
    } else {
      console.log('✅ TUDO CORRETO! O patrimônio líquido está consistente com as transações.');
    }

    // 4. Detalhes das últimas transações (para debugging)
    console.log('\n' + '='.repeat(80));
    console.log('📝 ÚLTIMAS 10 TRANSAÇÕES NO SISTEMA:\n');

    const ultimasTransacoesResult = db.exec(`
      SELECT
        t.id,
        t.data,
        t.tipo,
        t.descricao,
        t.valor,
        c.nome as conta_nome,
        cat.nome as categoria_nome
      FROM transacoes t
      JOIN contas c ON t.conta_id = c.id
      JOIN categorias cat ON t.categoria_id = cat.id
      ORDER BY t.data DESC, t.id DESC
      LIMIT 10
    `);

    if (ultimasTransacoesResult.length > 0 && ultimasTransacoesResult[0].values.length > 0) {
      ultimasTransacoesResult[0].values.forEach((row) => {
        const tipoIcon = row[2] === 'receita' ? '💰' : '💸';
        const valorFormatado = row[4].toFixed(2);
        console.log(`${tipoIcon} [${row[1]}] ${row[3]} - R$ ${valorFormatado}`);
        console.log(`   Conta: ${row[5]} | Categoria: ${row[6]}\n`);
      });
    }

    console.log('='.repeat(80));
    console.log('✔️  Verificação concluída!\n');

    return {
      contasAtivas: contasAtivas.length,
      contasOK: contasOK.length,
      contasInconsistentes: contasInconsistentes.length,
      patrimonioArmazenado,
      patrimonioCalculado,
      diferencaTotal,
    };

  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Executar verificação
verificarPatrimonio().catch((error) => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
