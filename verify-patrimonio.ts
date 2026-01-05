// Script de verificação de patrimônio líquido
// Verifica se os saldos das contas estão consistentes com as transações

import initSqlJs, { Database } from 'sql.js';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

interface Conta {
  id: number;
  nome: string;
  saldo: number;
  tipo: string;
  ativa: boolean;
  usuario_id: number;
}

interface Transacao {
  id: number;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  data: string;
  conta_id: number;
  categoria_id: number;
}

interface VerificacaoResult {
  contaId: number;
  contaNome: string;
  saldoArmazenado: number;
  saldoCalculado: number;
  diferenca: number;
  status: 'OK' | 'INCONSISTENTE';
  transacoesCount: number;
}

async function verificarPatrimonio() {
  console.log('🔍 INICIANDO VERIFICAÇÃO DE PATRIMÔNIO LÍQUIDO\n');
  console.log('='.repeat(80));

  // Inicializar banco de dados
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'financas.db');

  if (!fs.existsSync(dbPath)) {
    console.error('❌ Erro: Banco de dados não encontrado em:', dbPath);
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  try {
    // 1. Buscar todas as contas
    console.log('\n📊 CONTAS CADASTRADAS:');
    console.log('-'.repeat(80));

    const contasResult = db.exec('SELECT * FROM contas ORDER BY id');

    if (contasResult.length === 0 || contasResult[0].values.length === 0) {
      console.log('⚠️  Nenhuma conta encontrada no banco de dados.');
      return;
    }

    const contas: Conta[] = contasResult[0].values.map((row) => ({
      id: row[0] as number,
      nome: row[1] as string,
      saldo: row[2] as number,
      tipo: row[3] as string,
      ativa: Boolean(row[4]),
      usuario_id: row[5] as number,
    }));

    // 2. Para cada conta, verificar transações
    const resultados: VerificacaoResult[] = [];
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
        const transacoes: Transacao[] = transacoesResult[0].values.map((row) => ({
          id: row[0] as number,
          descricao: row[1] as string,
          valor: row[2] as number,
          tipo: row[3] as 'receita' | 'despesa',
          data: row[4] as string,
          conta_id: row[5] as number,
          categoria_id: row[6] as number,
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
        const valorFormatado = (row[4] as number).toFixed(2);
        console.log(`${tipoIcon} [${row[1]}] ${row[3]} - R$ ${valorFormatado}`);
        console.log(`   Conta: ${row[5]} | Categoria: ${row[6]}\n`);
      });
    }

    console.log('='.repeat(80));
    console.log('✔️  Verificação concluída!\n');

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
