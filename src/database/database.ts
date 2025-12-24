// src/database/database.ts

import initSqlJs, { Database, QueryExecResult, SqlValue } from 'sql.js';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import {
  Usuario,
  Conta,
  Categoria,
  Orcamento,
  Transacao,
  ResumoFinanceiro,
  TransacaoCompleta
} from '../types/database.types';

export class DatabaseManager {
  private db!: Database;
  private dbPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'financas.db');
  }

  async init(): Promise<void> {
    const SQL = await initSqlJs();
    
    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    this.initDatabase();
    this.save();
  }

  private initDatabase(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        avatar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS contas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        saldo REAL DEFAULT 0,
        tipo TEXT CHECK(tipo IN ('corrente', 'poupanca', 'investimento', 'carteira')) NOT NULL,
        ativa BOOLEAN DEFAULT 1,
        usuario_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        tipo TEXT CHECK(tipo IN ('receita', 'despesa')) NOT NULL,
        cor TEXT,
        icone TEXT,
        usuario_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        UNIQUE(nome, tipo, usuario_id)
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS orcamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoria_id INTEGER NOT NULL,
        valor_planejado REAL NOT NULL,
        mes INTEGER CHECK(mes BETWEEN 1 AND 12) NOT NULL,
        ano INTEGER NOT NULL,
        usuario_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        UNIQUE(categoria_id, mes, ano)
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS transacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        descricao TEXT NOT NULL,
        valor REAL NOT NULL,
        tipo TEXT CHECK(tipo IN ('receita', 'despesa')) NOT NULL,
        data DATE NOT NULL,
        conta_id INTEGER NOT NULL,
        categoria_id INTEGER NOT NULL,
        usuario_id INTEGER NOT NULL,
        observacoes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conta_id) REFERENCES contas(id) ON DELETE CASCADE,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes(data)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_transacoes_usuario ON transacoes(usuario_id)`);
  }

  private save(): void {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  // ========== MÉTODOS DE USUÁRIO ==========
  
  createUsuario(nome: string, email: string): Usuario {
    this.db.run('INSERT INTO usuarios (nome, email) VALUES (?, ?)', [nome, email]);
    this.save();
    return this.getUsuarioByEmail(email)!;
  }

  getUsuario(id: number): Usuario | undefined {
    const result = this.db.exec('SELECT * FROM usuarios WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return undefined;
    return this.rowToUsuario(result[0]);
  }

  getUsuarioByEmail(email: string): Usuario | undefined {
    const result = this.db.exec('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (result.length === 0 || result[0].values.length === 0) return undefined;
    return this.rowToUsuario(result[0]);
  }

  private rowToUsuario(result: QueryExecResult): Usuario {
    const row = result.values[0];
    const cols = result.columns;
    return {
      id: Number(row[cols.indexOf('id')]),
      nome: String(row[cols.indexOf('nome')]),
      email: String(row[cols.indexOf('email')]),
      avatar: row[cols.indexOf('avatar')] ? String(row[cols.indexOf('avatar')]) : undefined,
      created_at: String(row[cols.indexOf('created_at')]),
      updated_at: String(row[cols.indexOf('updated_at')])
    };
  }

  // ========== MÉTODOS DE CONTA ==========

  createConta(conta: Omit<Conta, 'id' | 'created_at' | 'updated_at'>): Conta {
    this.db.run(
      'INSERT INTO contas (nome, saldo, tipo, ativa, usuario_id) VALUES (?, ?, ?, ?, ?)',
      [conta.nome, conta.saldo, conta.tipo, conta.ativa ? 1 : 0, conta.usuario_id]
    );
    this.save();
    
    const result = this.db.exec('SELECT * FROM contas ORDER BY id DESC LIMIT 1');
    return this.rowToConta(result[0]);
  }

  getContas(usuarioId: number): Conta[] {
    const result = this.db.exec('SELECT * FROM contas WHERE usuario_id = ? ORDER BY nome', [usuarioId]);
    if (result.length === 0) return [];
    return result[0].values.map((row: SqlValue[]) => this.rowToContaFromArray(row, result[0].columns));
  }

  getConta(id: number): Conta | undefined {
    const result = this.db.exec('SELECT * FROM contas WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return undefined;
    return this.rowToConta(result[0]);
  }

  updateConta(id: number, updates: Partial<Conta>): boolean {
    const fields = Object.keys(updates).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');
    const values = Object.entries(updates).filter(([k]) => k !== 'id').map(([, v]) => v);
    
    this.db.run(`UPDATE contas SET ${fields} WHERE id = ?`, [...values, id] as SqlValue[]);
    this.save();
    return true;
  }

  deleteConta(id: number): boolean {
    this.db.run('DELETE FROM contas WHERE id = ?', [id]);
    this.save();
    return true;
  }

  private rowToConta(result: QueryExecResult): Conta {
    const row = result.values[0];
    return this.rowToContaFromArray(row, result.columns);
  }

  private rowToContaFromArray(row: SqlValue[], cols: string[]): Conta {
    return {
      id: Number(row[cols.indexOf('id')]),
      nome: String(row[cols.indexOf('nome')]),
      saldo: Number(row[cols.indexOf('saldo')]),
      tipo: String(row[cols.indexOf('tipo')]) as 'corrente' | 'poupanca' | 'investimento' | 'carteira',
      ativa: Number(row[cols.indexOf('ativa')]) === 1,
      usuario_id: Number(row[cols.indexOf('usuario_id')]),
      created_at: String(row[cols.indexOf('created_at')]),
      updated_at: String(row[cols.indexOf('updated_at')])
    };
  }

  // ========== MÉTODOS DE CATEGORIA ==========

  createCategoria(categoria: Omit<Categoria, 'id' | 'created_at' | 'updated_at'>): Categoria {
    this.db.run(
      'INSERT INTO categorias (nome, tipo, cor, icone, usuario_id) VALUES (?, ?, ?, ?, ?)',
      [categoria.nome, categoria.tipo, categoria.cor || null, categoria.icone || null, categoria.usuario_id]
    );
    this.save();
    
    const result = this.db.exec('SELECT * FROM categorias ORDER BY id DESC LIMIT 1');
    return this.rowToCategoria(result[0]);
  }

  getCategorias(usuarioId: number, tipo?: 'receita' | 'despesa'): Categoria[] {
    let query = 'SELECT * FROM categorias WHERE usuario_id = ?';
    const params: SqlValue[] = [usuarioId];
    
    if (tipo) {
      query += ' AND tipo = ?';
      params.push(tipo);
    }
    
    query += ' ORDER BY nome';
    
    const result = this.db.exec(query, params);
    if (result.length === 0) return [];
    return result[0].values.map((row: SqlValue[]) => this.rowToCategoriaFromArray(row, result[0].columns));
  }

  getCategoria(id: number): Categoria | undefined {
    const result = this.db.exec('SELECT * FROM categorias WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return undefined;
    return this.rowToCategoria(result[0]);
  }

  updateCategoria(id: number, updates: Partial<Categoria>): boolean {
    const fields = Object.keys(updates).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');
    const values = Object.entries(updates).filter(([k]) => k !== 'id').map(([, v]) => v);
    
    this.db.run(`UPDATE categorias SET ${fields} WHERE id = ?`, [...values, id] as SqlValue[]);
    this.save();
    return true;
  }

  deleteCategoria(id: number): boolean {
    this.db.run('DELETE FROM categorias WHERE id = ?', [id]);
    this.save();
    return true;
  }

  private rowToCategoria(result: QueryExecResult): Categoria {
    const row = result.values[0];
    return this.rowToCategoriaFromArray(row, result.columns);
  }

  private rowToCategoriaFromArray(row: SqlValue[], cols: string[]): Categoria {
    return {
      id: Number(row[cols.indexOf('id')]),
      nome: String(row[cols.indexOf('nome')]),
      tipo: String(row[cols.indexOf('tipo')]) as 'receita' | 'despesa',
      cor: row[cols.indexOf('cor')] ? String(row[cols.indexOf('cor')]) : undefined,
      icone: row[cols.indexOf('icone')] ? String(row[cols.indexOf('icone')]) : undefined,
      usuario_id: Number(row[cols.indexOf('usuario_id')]),
      created_at: String(row[cols.indexOf('created_at')]),
      updated_at: String(row[cols.indexOf('updated_at')])
    };
  }

  // ========== MÉTODOS DE ORÇAMENTO ==========

  createOrcamento(orcamento: Omit<Orcamento, 'id' | 'created_at' | 'updated_at'>): Orcamento {
    this.db.run(
      'INSERT INTO orcamentos (categoria_id, valor_planejado, mes, ano, usuario_id) VALUES (?, ?, ?, ?, ?)',
      [orcamento.categoria_id, orcamento.valor_planejado, orcamento.mes, orcamento.ano, orcamento.usuario_id]
    );
    this.save();
    
    const result = this.db.exec('SELECT * FROM orcamentos ORDER BY id DESC LIMIT 1');
    return this.rowToOrcamento(result[0]);
  }

  getOrcamentos(usuarioId: number, mes?: number, ano?: number): Orcamento[] {
    let query = 'SELECT * FROM orcamentos WHERE usuario_id = ?';
    const params: SqlValue[] = [usuarioId];
    
    if (mes !== undefined) {
      query += ' AND mes = ?';
      params.push(mes);
    }
    
    if (ano !== undefined) {
      query += ' AND ano = ?';
      params.push(ano);
    }
    
    const result = this.db.exec(query, params);
    if (result.length === 0) return [];
    return result[0].values.map((row: SqlValue[]) => this.rowToOrcamentoFromArray(row, result[0].columns));
  }

  getOrcamento(id: number): Orcamento | undefined {
    const result = this.db.exec('SELECT * FROM orcamentos WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return undefined;
    return this.rowToOrcamento(result[0]);
  }

  updateOrcamento(id: number, updates: Partial<Orcamento>): boolean {
    const fields = Object.keys(updates).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');
    const values = Object.entries(updates).filter(([k]) => k !== 'id').map(([, v]) => v);
    
    this.db.run(`UPDATE orcamentos SET ${fields} WHERE id = ?`, [...values, id] as SqlValue[]);
    this.save();
    return true;
  }

  deleteOrcamento(id: number): boolean {
    this.db.run('DELETE FROM orcamentos WHERE id = ?', [id]);
    this.save();
    return true;
  }

  private rowToOrcamento(result: QueryExecResult): Orcamento {
    const row = result.values[0];
    return this.rowToOrcamentoFromArray(row, result.columns);
  }

  private rowToOrcamentoFromArray(row: SqlValue[], cols: string[]): Orcamento {
    return {
      id: Number(row[cols.indexOf('id')]),
      categoria_id: Number(row[cols.indexOf('categoria_id')]),
      valor_planejado: Number(row[cols.indexOf('valor_planejado')]),
      mes: Number(row[cols.indexOf('mes')]),
      ano: Number(row[cols.indexOf('ano')]),
      usuario_id: Number(row[cols.indexOf('usuario_id')]),
      created_at: String(row[cols.indexOf('created_at')]),
      updated_at: String(row[cols.indexOf('updated_at')])
    };
  }

  // ========== MÉTODOS DE TRANSAÇÃO ==========

  createTransacao(transacao: Omit<Transacao, 'id' | 'created_at' | 'updated_at'>): Transacao {
    this.db.run(
      'INSERT INTO transacoes (descricao, valor, tipo, data, conta_id, categoria_id, usuario_id, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [transacao.descricao, transacao.valor, transacao.tipo, transacao.data, transacao.conta_id, transacao.categoria_id, transacao.usuario_id, transacao.observacoes || null]
    );
    
    const conta = this.getConta(transacao.conta_id);
    if (conta) {
      const novoSaldo = transacao.tipo === 'receita' 
        ? conta.saldo + transacao.valor 
        : conta.saldo - transacao.valor;
      this.updateConta(conta.id, { saldo: novoSaldo });
    }
    
    this.save();
    
    const result = this.db.exec('SELECT * FROM transacoes ORDER BY id DESC LIMIT 1');
    return this.rowToTransacao(result[0]);
  }

  getTransacoes(usuarioId: number, limit?: number): TransacaoCompleta[] {
    let query = `
      SELECT 
        t.*,
        ct.nome as conta_nome,
        cat.nome as categoria_nome,
        cat.cor as categoria_cor
      FROM transacoes t
      JOIN contas ct ON t.conta_id = ct.id
      JOIN categorias cat ON t.categoria_id = cat.id
      WHERE t.usuario_id = ?
      ORDER BY t.data DESC, t.created_at DESC
    `;
    
    if (limit) {
      query += ` LIMIT ${limit}`;
    }
    
    const result = this.db.exec(query, [usuarioId]);
    if (result.length === 0) return [];
    return result[0].values.map((row: SqlValue[]) => this.rowToTransacaoCompletaFromArray(row, result[0].columns));
  }

  getTransacao(id: number): Transacao | undefined {
    const result = this.db.exec('SELECT * FROM transacoes WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return undefined;
    return this.rowToTransacao(result[0]);
  }

  updateTransacao(id: number, updates: Partial<Transacao>): boolean {
    const fields = Object.keys(updates).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');
    const values = Object.entries(updates).filter(([k]) => k !== 'id').map(([, v]) => v);
    
    this.db.run(`UPDATE transacoes SET ${fields} WHERE id = ?`, [...values, id] as SqlValue[]);
    this.save();
    return true;
  }

  deleteTransacao(id: number): boolean {
    const transacao = this.getTransacao(id);
    
    if (transacao) {
      const conta = this.getConta(transacao.conta_id);
      if (conta) {
        const novoSaldo = transacao.tipo === 'receita' 
          ? conta.saldo - transacao.valor 
          : conta.saldo + transacao.valor;
        this.updateConta(conta.id, { saldo: novoSaldo });
      }
    }
    
    this.db.run('DELETE FROM transacoes WHERE id = ?', [id]);
    this.save();
    return true;
  }

  private rowToTransacao(result: QueryExecResult): Transacao {
    const row = result.values[0];
    return this.rowToTransacaoFromArray(row, result.columns);
  }

  private rowToTransacaoFromArray(row: SqlValue[], cols: string[]): Transacao {
    return {
      id: Number(row[cols.indexOf('id')]),
      descricao: String(row[cols.indexOf('descricao')]),
      valor: Number(row[cols.indexOf('valor')]),
      tipo: String(row[cols.indexOf('tipo')]) as 'receita' | 'despesa',
      data: String(row[cols.indexOf('data')]),
      conta_id: Number(row[cols.indexOf('conta_id')]),
      categoria_id: Number(row[cols.indexOf('categoria_id')]),
      usuario_id: Number(row[cols.indexOf('usuario_id')]),
      observacoes: row[cols.indexOf('observacoes')] ? String(row[cols.indexOf('observacoes')]) : undefined,
      created_at: String(row[cols.indexOf('created_at')]),
      updated_at: String(row[cols.indexOf('updated_at')])
    };
  }

  private rowToTransacaoCompletaFromArray(row: SqlValue[], cols: string[]): TransacaoCompleta {
    return {
      ...this.rowToTransacaoFromArray(row, cols),
      conta_nome: String(row[cols.indexOf('conta_nome')]),
      categoria_nome: String(row[cols.indexOf('categoria_nome')]),
      categoria_cor: row[cols.indexOf('categoria_cor')] ? String(row[cols.indexOf('categoria_cor')]) : undefined
    };
  }

  // ========== MÉTODOS DE RELATÓRIO ==========

  getResumoFinanceiro(usuarioId: number, dataInicio?: string, dataFim?: string): ResumoFinanceiro {
    let query = `
      SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) as receita,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) as despesa
      FROM transacoes 
      WHERE usuario_id = ?
    `;
    
    const params: SqlValue[] = [usuarioId];
    
    if (dataInicio) {
      query += ' AND data >= ?';
      params.push(dataInicio);
    }
    
    if (dataFim) {
      query += ' AND data <= ?';
      params.push(dataFim);
    }
    
    const result = this.db.exec(query, params);
    
    if (result.length === 0 || result[0].values.length === 0) {
      return { receita: 0, despesa: 0, saldo: 0 };
    }
    
    const row = result[0].values[0];
    const receita = Number(row[0]);
    const despesa = Number(row[1]);
    
    return {
      receita,
      despesa,
      saldo: receita - despesa
    };
  }

  close(): void {
    this.save();
    this.db.close();
  }
}