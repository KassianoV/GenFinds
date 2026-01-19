// src/database/database.ts

import initSqlJs, { Database, QueryExecResult, SqlValue } from 'sql.js';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import * as bcrypt from 'bcrypt';
import {
  Usuario,
  Conta,
  Categoria,
  Orcamento,
  Cartao,
  Parcela,
  TransacaoCartao,
  TransacaoCartaoCompleta,
  Transacao,
  ResumoFinanceiro,
  TransacaoCompleta,
  PaginationParams,
  PaginatedResult,
} from '../types/database.types';

// Interface para cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class DatabaseManager {
  private db!: Database;
  private dbPath: string;
  private cache: Map<string, CacheEntry<any>>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private saveTimeout: NodeJS.Timeout | null = null;
  private readonly SAVE_DEBOUNCE_MS = 1000; // 1 segundo

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'financas.db');
    this.cache = new Map();
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
    // Habilitar foreign keys no SQLite
    this.db.run('PRAGMA foreign_keys = ON');

    this.db.run(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        avatar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migração: adicionar coluna password_hash se não existir
    try {
      this.db.run(`ALTER TABLE usuarios ADD COLUMN password_hash TEXT`);
    } catch (error) {
      // Coluna já existe, ignorar erro
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS contas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        nome TEXT NOT NULL,
        saldo REAL DEFAULT 0,
        tipo TEXT CHECK(tipo IN ('corrente', 'poupanca', 'investimento', 'carteira')) NOT NULL,
        ativa BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);

    // Migração: adicionar coluna usuario_id em contas se não existir
    try {
      this.db.run(`ALTER TABLE contas ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE`);
    } catch (error) {
      // Coluna já existe, ignorar erro
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        nome TEXT NOT NULL,
        tipo TEXT CHECK(tipo IN ('receita', 'despesa')) NOT NULL,
        cor TEXT,
        icone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        UNIQUE(usuario_id, nome, tipo)
      )
    `);

    // Migração: adicionar coluna usuario_id em categorias se não existir
    try {
      this.db.run(`ALTER TABLE categorias ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE`);
    } catch (error) {
      // Coluna já existe, ignorar erro
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS orcamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        categoria_id INTEGER NOT NULL,
        valor_planejado REAL NOT NULL,
        mes INTEGER CHECK(mes BETWEEN 1 AND 12) NOT NULL,
        ano INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE,
        UNIQUE(usuario_id, categoria_id, mes, ano)
      )
    `);

    // Migração: adicionar coluna usuario_id em orcamentos se não existir
    try {
      this.db.run(`ALTER TABLE orcamentos ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE`);
    } catch (error) {
      // Coluna já existe, ignorar erro
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS transacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        descricao TEXT NOT NULL,
        valor REAL NOT NULL,
        tipo TEXT CHECK(tipo IN ('receita', 'despesa')) NOT NULL,
        data DATE NOT NULL,
        conta_id INTEGER NOT NULL,
        categoria_id INTEGER NOT NULL,
        observacoes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (conta_id) REFERENCES contas(id) ON DELETE CASCADE,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
      )
    `);

    // Migração: adicionar coluna usuario_id em transacoes se não existir
    try {
      this.db.run(`ALTER TABLE transacoes ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE`);
    } catch (error) {
      // Coluna já existe, ignorar erro
    }

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes(data)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_transacoes_usuario ON transacoes(usuario_id)`);

    // Tabela de Cartões de Crédito
    this.db.run(`
      CREATE TABLE IF NOT EXISTS cartoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        nome TEXT NOT NULL,
        valor REAL DEFAULT 0,
        vencimento INTEGER CHECK(vencimento BETWEEN 1 AND 31) NOT NULL,
        status TEXT CHECK(status IN ('aberta', 'fechada', 'paga', 'pendente')) DEFAULT 'aberta',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);

    // Migração: adicionar coluna usuario_id em cartoes se não existir
    try {
      this.db.run(`ALTER TABLE cartoes ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE`);
    } catch (error) {
      // Coluna já existe, ignorar erro
    }

    // Tabela de Parcelas
    this.db.run(`
      CREATE TABLE IF NOT EXISTS parcelas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        descricao TEXT NOT NULL,
        dia INTEGER CHECK(dia BETWEEN 1 AND 31) NOT NULL,
        cartao_id INTEGER NOT NULL,
        valor_parcela REAL NOT NULL,
        quantidade_parcelas INTEGER NOT NULL,
        total REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (cartao_id) REFERENCES cartoes(id) ON DELETE CASCADE
      )
    `);

    // Migração: adicionar coluna usuario_id em parcelas se não existir
    try {
      this.db.run(`ALTER TABLE parcelas ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE`);
    } catch (error) {
      // Coluna já existe, ignorar erro
    }

    // Tabela de Transações de Cartão
    this.db.run(`
      CREATE TABLE IF NOT EXISTS transacoes_cartao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        descricao TEXT NOT NULL,
        valor REAL NOT NULL,
        data DATE NOT NULL,
        cartao_id INTEGER NOT NULL,
        categoria_id INTEGER,
        parcelas INTEGER DEFAULT 1,
        parcela_atual INTEGER DEFAULT 1,
        grupo_parcelamento TEXT,
        observacoes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (cartao_id) REFERENCES cartoes(id) ON DELETE CASCADE,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
      )
    `);

    // Migração: adicionar coluna usuario_id em transacoes_cartao se não existir
    try {
      this.db.run(`ALTER TABLE transacoes_cartao ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE`);
    } catch (error) {
      // Coluna já existe, ignorar erro
    }

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_transacoes_cartao_data ON transacoes_cartao(data)`);
    this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_transacoes_cartao_cartao ON transacoes_cartao(cartao_id)`
    );
    this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_transacoes_cartao_grupo ON transacoes_cartao(grupo_parcelamento)`
    );

    // ========== ÍNDICES ADICIONAIS PARA PERFORMANCE ==========
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_orcamentos_usuario ON orcamentos(usuario_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_orcamentos_categoria ON orcamentos(categoria_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_orcamentos_mes_ano ON orcamentos(mes, ano)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_categorias_usuario ON categorias(usuario_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_categorias_tipo ON categorias(tipo)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_contas_usuario ON contas(usuario_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_cartoes_usuario ON cartoes(usuario_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_transacoes_cartao_usuario ON transacoes_cartao(usuario_id)`);

    // ========== MIGRAÇÃO DE DADOS EXISTENTES ==========
    this.runMigrations();

    // ========== TRIGGERS PARA GESTÃO AUTOMÁTICA DE SALDO ==========

    // Trigger: Atualizar saldo quando inserir transação
    this.db.run(`
      CREATE TRIGGER IF NOT EXISTS atualizar_saldo_insert
      AFTER INSERT ON transacoes
      FOR EACH ROW
      BEGIN
        UPDATE contas
        SET saldo = saldo + (CASE WHEN NEW.tipo = 'receita' THEN NEW.valor ELSE -NEW.valor END),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.conta_id;
      END;
    `);

    // Trigger: Reverter saldo quando deletar transação
    this.db.run(`
      CREATE TRIGGER IF NOT EXISTS atualizar_saldo_delete
      AFTER DELETE ON transacoes
      FOR EACH ROW
      BEGIN
        UPDATE contas
        SET saldo = saldo - (CASE WHEN OLD.tipo = 'receita' THEN OLD.valor ELSE -OLD.valor END),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.conta_id;
      END;
    `);

    // Trigger: Ajustar saldo quando atualizar transação
    this.db.run(`
      CREATE TRIGGER IF NOT EXISTS atualizar_saldo_update
      AFTER UPDATE ON transacoes
      FOR EACH ROW
      BEGIN
        -- Reverter o saldo da transação antiga
        UPDATE contas
        SET saldo = saldo - (CASE WHEN OLD.tipo = 'receita' THEN OLD.valor ELSE -OLD.valor END)
        WHERE id = OLD.conta_id;

        -- Aplicar o saldo da transação nova
        UPDATE contas
        SET saldo = saldo + (CASE WHEN NEW.tipo = 'receita' THEN NEW.valor ELSE -NEW.valor END),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.conta_id;
      END;
    `);

    // ========== TRIGGERS PARA GESTÃO AUTOMÁTICA DE VALOR DO CARTÃO ==========

    // Trigger: Atualizar valor do cartão quando inserir transação de cartão
    this.db.run(`
      CREATE TRIGGER IF NOT EXISTS atualizar_cartao_insert
      AFTER INSERT ON transacoes_cartao
      FOR EACH ROW
      BEGIN
        UPDATE cartoes
        SET valor = valor + NEW.valor,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.cartao_id;
      END;
    `);

    // Trigger: Reverter valor do cartão quando deletar transação de cartão
    this.db.run(`
      CREATE TRIGGER IF NOT EXISTS atualizar_cartao_delete
      AFTER DELETE ON transacoes_cartao
      FOR EACH ROW
      BEGIN
        UPDATE cartoes
        SET valor = valor - OLD.valor,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.cartao_id;
      END;
    `);

    // Trigger: Ajustar valor do cartão quando atualizar transação de cartão
    this.db.run(`
      CREATE TRIGGER IF NOT EXISTS atualizar_cartao_update
      AFTER UPDATE ON transacoes_cartao
      FOR EACH ROW
      BEGIN
        -- Reverter valor da transação antiga
        UPDATE cartoes
        SET valor = valor - OLD.valor
        WHERE id = OLD.cartao_id;

        -- Aplicar valor da transação nova
        UPDATE cartoes
        SET valor = valor + NEW.valor,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.cartao_id;
      END;
    `);
  }

  /**
   * Save com debounce - agenda um save assíncrono após SAVE_DEBOUNCE_MS
   * Se já houver um save agendado, cancela o anterior e agenda um novo
   */
  private save(): void {
    // Cancela save anterior se existir
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Agenda novo save
    this.saveTimeout = setTimeout(() => {
      this.saveNow();
      this.saveTimeout = null;
    }, this.SAVE_DEBOUNCE_MS);
  }

  /**
   * Save imediato e síncrono - usado quando precisamos garantir persistência
   */
  private saveNow(): void {
    const data = this.db.export();
    // Garantir que o diretório existe
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.dbPath, data);
  }

  /**
   * Força o save de qualquer operação pendente (usado antes de fechar app)
   */
  flush(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.saveNow();
  }

  // ========== MÉTODOS DE CACHE ==========

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  private invalidateCache(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  // ========== MIGRAÇÃO DE DADOS ==========

  /**
   * Executa migrações para garantir que dados existentes tenham usuario_id preenchido.
   * Preenche usuario_id NULL com o primeiro usuário do sistema.
   */
  private runMigrations(): void {
    // Verificar se existe algum usuário no sistema
    const usuarioResult = this.db.exec('SELECT id FROM usuarios LIMIT 1');
    if (usuarioResult.length === 0 || usuarioResult[0].values.length === 0) {
      // Não há usuários, não há o que migrar
      return;
    }

    const usuarioPadraoId = Number(usuarioResult[0].values[0][0]);

    // Migrar contas sem usuario_id
    this.db.run(
      'UPDATE contas SET usuario_id = ? WHERE usuario_id IS NULL',
      [usuarioPadraoId]
    );

    // Migrar categorias sem usuario_id
    this.db.run(
      'UPDATE categorias SET usuario_id = ? WHERE usuario_id IS NULL',
      [usuarioPadraoId]
    );

    // Migrar transacoes sem usuario_id
    this.db.run(
      'UPDATE transacoes SET usuario_id = ? WHERE usuario_id IS NULL',
      [usuarioPadraoId]
    );

    // Migrar orcamentos sem usuario_id
    this.db.run(
      'UPDATE orcamentos SET usuario_id = ? WHERE usuario_id IS NULL',
      [usuarioPadraoId]
    );

    // Migrar cartoes sem usuario_id
    this.db.run(
      'UPDATE cartoes SET usuario_id = ? WHERE usuario_id IS NULL',
      [usuarioPadraoId]
    );

    // Migrar parcelas sem usuario_id
    this.db.run(
      'UPDATE parcelas SET usuario_id = ? WHERE usuario_id IS NULL',
      [usuarioPadraoId]
    );

    // Migrar transacoes_cartao sem usuario_id
    this.db.run(
      'UPDATE transacoes_cartao SET usuario_id = ? WHERE usuario_id IS NULL',
      [usuarioPadraoId]
    );
  }

  // ========== MÉTODOS DE TRANSAÇÃO SQL ==========

  /**
   * Inicia uma transação SQL
   */
  private beginTransaction(): void {
    this.db.run('BEGIN TRANSACTION');
  }

  /**
   * Confirma (commit) uma transação SQL
   */
  private commit(): void {
    this.db.run('COMMIT');
  }

  /**
   * Reverte (rollback) uma transação SQL
   */
  private rollback(): void {
    this.db.run('ROLLBACK');
  }

  /**
   * Executa uma operação dentro de uma transação SQL
   * Se a operação falhar, faz rollback automaticamente
   */
  private executeInTransaction<T>(operation: () => T): T {
    this.beginTransaction();
    try {
      const result = operation();
      this.commit();
      this.save();
      return result;
    } catch (error) {
      this.rollback();
      throw error;
    }
  }

  // ========== MÉTODOS DE USUÁRIO ==========

  createUsuario(nome: string, email: string): Usuario {
    // Validações de campos obrigatórios
    if (!nome || nome.trim() === '') {
      throw new Error('Nome é obrigatório');
    }
    if (!email || email.trim() === '') {
      throw new Error('Email é obrigatório');
    }

    this.db.run('INSERT INTO usuarios (nome, email) VALUES (?, ?)', [nome, email]);
    this.save();
    return this.getUsuarioByEmail(email)!;
  }

  /**
   * Garante que existe um usuário padrão no sistema
   * Se não existir nenhum usuário, cria um usuário padrão
   */
  ensureDefaultUser(): Usuario {
    const result = this.db.exec('SELECT * FROM usuarios LIMIT 1');

    if (result.length === 0 || result[0].values.length === 0) {
      // Não existe usuário, criar um padrão
      this.db.run('INSERT INTO usuarios (nome, email) VALUES (?, ?)', [
        'Usuário',
        'usuario@genfinds.local'
      ]);
      this.save();
      return this.getUsuarioByEmail('usuario@genfinds.local')!;
    }

    // Retornar o primeiro usuário encontrado
    return this.rowToUsuario(result[0]);
  }

  /**
   * Obtém o usuário padrão do sistema
   */
  getDefaultUser(): Usuario {
    return this.ensureDefaultUser();
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

  /**
   * Busca usuário pelo nome
   */
  getUsuarioByNome(nome: string): Usuario | undefined {
    const result = this.db.exec('SELECT * FROM usuarios WHERE nome = ?', [nome]);
    if (result.length === 0 || result[0].values.length === 0) return undefined;
    return this.rowToUsuario(result[0]);
  }

  /**
   * Verifica se existe algum usuário cadastrado no sistema
   */
  existeUsuarioCadastrado(): boolean {
    const result = this.db.exec('SELECT COUNT(*) as count FROM usuarios');
    if (result.length === 0 || result[0].values.length === 0) return false;
    const count = Number(result[0].values[0][0]);
    return count > 0;
  }

  /**
   * Cria um novo usuário com senha hasheada
   */
  createUsuarioComSenha(nome: string, senha: string): Usuario {
    // Validações
    if (!nome || nome.trim() === '') {
      throw new Error('Nome é obrigatório');
    }
    if (!senha || senha.length < 4) {
      throw new Error('Senha deve ter pelo menos 4 caracteres');
    }

    // Verificar se já existe usuário com esse nome
    const existente = this.getUsuarioByNome(nome.trim());
    if (existente) {
      throw new Error('Já existe um usuário com esse nome');
    }

    // Hash da senha com bcrypt
    const saltRounds = 10;
    const passwordHash = bcrypt.hashSync(senha, saltRounds);

    // Usar nome como email para simplificar (email é unique no banco)
    const email = `${nome.trim().toLowerCase().replace(/\s+/g, '.')}@local`;

    this.db.run(
      'INSERT INTO usuarios (nome, email, password_hash) VALUES (?, ?, ?)',
      [nome.trim(), email, passwordHash]
    );
    this.save();

    return this.getUsuarioByNome(nome.trim())!;
  }

  /**
   * Autentica um usuário verificando nome e senha
   */
  autenticarUsuario(nome: string, senha: string): Usuario | null {
    if (!nome || !senha) {
      return null;
    }

    const usuario = this.getUsuarioByNome(nome.trim());
    if (!usuario) {
      return null;
    }

    // Buscar o hash da senha do banco
    const result = this.db.exec(
      'SELECT password_hash FROM usuarios WHERE nome = ?',
      [nome.trim()]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    const passwordHash = result[0].values[0][0] as string | null;

    // Se não tem senha, não pode autenticar
    if (!passwordHash) {
      return null;
    }

    // Verificar senha com bcrypt
    const senhaValida = bcrypt.compareSync(senha, passwordHash);

    if (!senhaValida) {
      return null;
    }

    return usuario;
  }

  /**
   * Altera a senha de um usuário
   */
  alterarSenha(usuarioId: number, senhaAtual: string, novaSenha: string): boolean {
    // Buscar usuário
    const usuario = this.getUsuario(usuarioId);
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    // Verificar senha atual
    const result = this.db.exec(
      'SELECT password_hash FROM usuarios WHERE id = ?',
      [usuarioId]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      throw new Error('Usuário não encontrado');
    }

    const passwordHash = result[0].values[0][0] as string | null;

    if (!passwordHash) {
      throw new Error('Usuário sem senha cadastrada');
    }

    // Verificar se senha atual está correta
    const senhaValida = bcrypt.compareSync(senhaAtual, passwordHash);
    if (!senhaValida) {
      throw new Error('Senha atual incorreta');
    }

    // Validar nova senha
    if (!novaSenha || novaSenha.length < 4) {
      throw new Error('Nova senha deve ter pelo menos 4 caracteres');
    }

    // Hash da nova senha
    const saltRounds = 10;
    const novoHash = bcrypt.hashSync(novaSenha, saltRounds);

    // Atualizar no banco
    this.db.run(
      'UPDATE usuarios SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [novoHash, usuarioId]
    );
    this.save();

    return true;
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
      updated_at: String(row[cols.indexOf('updated_at')]),
    };
  }

  // ========== MÉTODOS DE CONTA ==========

  createConta(conta: Omit<Conta, 'id' | 'created_at' | 'updated_at'>): Conta {
    // Validações de campos obrigatórios
    if (!conta.usuario_id) {
      throw new Error('Usuário é obrigatório');
    }
    if (!conta.nome || conta.nome.trim() === '') {
      throw new Error('Nome da conta é obrigatório');
    }

    this.db.run(
      'INSERT INTO contas (usuario_id, nome, saldo, tipo, ativa) VALUES (?, ?, ?, ?, ?)',
      [conta.usuario_id, conta.nome, conta.saldo, conta.tipo, conta.ativa ? 1 : 0]
    );
    this.save();

    // Invalidar cache de contas
    this.invalidateCache(`contas_${conta.usuario_id}`);

    const result = this.db.exec('SELECT * FROM contas ORDER BY id DESC LIMIT 1');
    return this.rowToConta(result[0]);
  }

  getContas(usuarioId: number): Conta[] {
    // Tentar buscar do cache
    const cacheKey = `contas_${usuarioId}`;
    const cached = this.getCached<Conta[]>(cacheKey);
    if (cached) return cached;

    // Se não estiver em cache, buscar do banco
    const result = this.db.exec('SELECT * FROM contas WHERE usuario_id = ? ORDER BY nome', [usuarioId]);
    const data =
      result.length === 0
        ? []
        : result[0].values.map((row: SqlValue[]) =>
            this.rowToContaFromArray(row, result[0].columns)
          );

    // Armazenar em cache
    this.setCache(cacheKey, data);

    return data;
  }

  getConta(id: number, usuarioId: number): Conta | undefined {
    const result = this.db.exec('SELECT * FROM contas WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
    if (result.length === 0 || result[0].values.length === 0) return undefined;
    return this.rowToConta(result[0]);
  }

  updateConta(id: number, usuarioId: number, updates: Partial<Conta>): boolean {
    const allowedFields = ['nome', 'saldo', 'tipo', 'ativa'];

    const validUpdates = Object.entries(updates).filter(
      ([key]) => allowedFields.includes(key) && key !== 'id' && key !== 'usuario_id'
    );

    if (validUpdates.length === 0) {
      return false;
    }

    const fields = validUpdates.map(([key]) => `${key} = ?`).join(', ');
    const values = validUpdates.map(([, value]) => value);

    this.db.run(`UPDATE contas SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND usuario_id = ?`, [
      ...values,
      id,
      usuarioId,
    ] as SqlValue[]);
    this.save();

    // Invalidar cache de contas
    this.invalidateCache(`contas_${usuarioId}`);

    return true;
  }

  deleteConta(id: number, usuarioId: number): boolean {
    this.db.run('DELETE FROM contas WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
    this.save();

    // Invalidar cache de contas
    this.invalidateCache(`contas_${usuarioId}`);

    return true;
  }

  private rowToConta(result: QueryExecResult): Conta {
    const row = result.values[0];
    return this.rowToContaFromArray(row, result.columns);
  }

  private rowToContaFromArray(row: SqlValue[], cols: string[]): Conta {
    return {
      id: Number(row[cols.indexOf('id')]),
      usuario_id: Number(row[cols.indexOf('usuario_id')]),
      nome: String(row[cols.indexOf('nome')]),
      saldo: Number(row[cols.indexOf('saldo')]),
      tipo: String(row[cols.indexOf('tipo')]) as
        | 'corrente'
        | 'poupanca'
        | 'investimento'
        | 'carteira',
      ativa: Number(row[cols.indexOf('ativa')]) === 1,
      created_at: String(row[cols.indexOf('created_at')]),
      updated_at: String(row[cols.indexOf('updated_at')]),
    };
  }

  // ========== MÉTODOS DE CARTÃO ==========

  createCartao(cartao: Omit<Cartao, 'id' | 'created_at' | 'updated_at'>): Cartao {
    // Validações de campos obrigatórios
    if (!cartao.usuario_id) {
      throw new Error('Usuário é obrigatório');
    }
    if (!cartao.nome || cartao.nome.trim() === '') {
      throw new Error('Nome do cartão é obrigatório');
    }
    if (cartao.vencimento < 1 || cartao.vencimento > 31) {
      throw new Error('Data de vencimento deve ser entre 1 e 31');
    }

    this.db.run(
      'INSERT INTO cartoes (usuario_id, nome, valor, vencimento, status) VALUES (?, ?, ?, ?, ?)',
      [cartao.usuario_id, cartao.nome, cartao.valor, cartao.vencimento, cartao.status]
    );
    this.save();

    // Invalidar cache de cartões
    this.invalidateCache(`cartoes_${cartao.usuario_id}`);

    const result = this.db.exec('SELECT * FROM cartoes ORDER BY id DESC LIMIT 1');
    return this.rowToCartao(result[0]);
  }

  getCartoes(usuarioId: number): Cartao[] {
    // Tentar buscar do cache
    const cacheKey = `cartoes_${usuarioId}`;
    const cached = this.getCached<Cartao[]>(cacheKey);
    if (cached) return cached;

    // Se não estiver em cache, buscar do banco
    const result = this.db.exec('SELECT * FROM cartoes WHERE usuario_id = ? ORDER BY nome', [usuarioId]);
    const data =
      result.length === 0
        ? []
        : result[0].values.map((row: SqlValue[]) =>
            this.rowToCartaoFromArray(row, result[0].columns)
          );

    // Armazenar em cache
    this.setCache(cacheKey, data);

    return data;
  }

  getCartao(id: number, usuarioId: number): Cartao | undefined {
    const result = this.db.exec('SELECT * FROM cartoes WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
    if (result.length === 0 || result[0].values.length === 0) return undefined;
    return this.rowToCartao(result[0]);
  }

  updateCartao(id: number, usuarioId: number, updates: Partial<Cartao>): boolean {
    const allowedFields = ['nome', 'valor', 'vencimento', 'status'];

    const validUpdates = Object.entries(updates).filter(
      ([key]) => allowedFields.includes(key) && key !== 'id' && key !== 'usuario_id'
    );

    if (validUpdates.length === 0) {
      return false;
    }

    const fields = validUpdates.map(([key]) => `${key} = ?`).join(', ');
    const values = validUpdates.map(([, value]) => value);

    this.db.run(`UPDATE cartoes SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND usuario_id = ?`, [
      ...values,
      id,
      usuarioId,
    ] as SqlValue[]);
    this.save();

    // Invalidar cache de cartões
    this.invalidateCache(`cartoes_${usuarioId}`);

    return true;
  }

  deleteCartao(id: number, usuarioId: number): boolean {
    this.db.run('DELETE FROM cartoes WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
    this.save();

    // Invalidar cache de cartões
    this.invalidateCache(`cartoes_${usuarioId}`);

    return true;
  }

  private rowToCartao(result: QueryExecResult): Cartao {
    const row = result.values[0];
    return this.rowToCartaoFromArray(row, result.columns);
  }

  private rowToCartaoFromArray(row: SqlValue[], cols: string[]): Cartao {
    return {
      id: Number(row[cols.indexOf('id')]),
      usuario_id: Number(row[cols.indexOf('usuario_id')]),
      nome: String(row[cols.indexOf('nome')]),
      valor: Number(row[cols.indexOf('valor')]),
      vencimento: Number(row[cols.indexOf('vencimento')]),
      status: String(row[cols.indexOf('status')]) as 'aberta' | 'fechada' | 'paga' | 'pendente',
      created_at: String(row[cols.indexOf('created_at')]),
      updated_at: String(row[cols.indexOf('updated_at')]),
    };
  }

  // Recalcular valor total do cartão baseado em todas as suas transações
  recalcularValorCartao(cartaoId: number, usuarioId: number): void {
    // Buscar todas as transações do cartão
    const result = this.db.exec(
      'SELECT SUM(valor) as total FROM transacoes_cartao WHERE cartao_id = ? AND usuario_id = ?',
      [cartaoId, usuarioId]
    );

    let valorTotal = 0;
    if (result.length > 0 && result[0].values.length > 0) {
      const total = result[0].values[0][0];
      valorTotal = total ? Number(total) : 0;
    }

    // Atualizar o valor do cartão
    this.db.run(
      'UPDATE cartoes SET valor = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND usuario_id = ?',
      [valorTotal, cartaoId, usuarioId]
    );
    this.save();

    // Invalidar cache de cartões
    this.invalidateCache(`cartoes_${usuarioId}`);
  }

  // ========== MÉTODOS DE PARCELA ==========

  createParcela(parcela: Omit<Parcela, 'id' | 'created_at' | 'updated_at'>): Parcela {
    // Validações de campos obrigatórios
    if (!parcela.usuario_id) {
      throw new Error('Usuário é obrigatório');
    }
    if (!parcela.descricao || parcela.descricao.trim() === '') {
      throw new Error('Descrição é obrigatória');
    }
    if (parcela.dia < 1 || parcela.dia > 31) {
      throw new Error('Dia deve ser entre 1 e 31');
    }
    if (parcela.quantidade_parcelas < 1) {
      throw new Error('Quantidade de parcelas deve ser maior que 0');
    }

    this.db.run(
      'INSERT INTO parcelas (usuario_id, descricao, dia, cartao_id, valor_parcela, quantidade_parcelas, total) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        parcela.usuario_id,
        parcela.descricao,
        parcela.dia,
        parcela.cartao_id,
        parcela.valor_parcela,
        parcela.quantidade_parcelas,
        parcela.total,
      ]
    );
    this.save();

    // Invalidar cache de parcelas
    this.invalidateCache(`parcelas_${parcela.usuario_id}`);

    const result = this.db.exec('SELECT * FROM parcelas ORDER BY id DESC LIMIT 1');
    return this.rowToParcela(result[0]);
  }

  getParcelas(usuarioId: number): Parcela[] {
    // Tentar buscar do cache
    const cacheKey = `parcelas_${usuarioId}`;
    const cached = this.getCached<Parcela[]>(cacheKey);
    if (cached) return cached;

    // Se não estiver em cache, buscar do banco
    const result = this.db.exec(
      'SELECT * FROM parcelas WHERE usuario_id = ? ORDER BY created_at DESC',
      [usuarioId]
    );
    const data =
      result.length === 0
        ? []
        : result[0].values.map((row: SqlValue[]) =>
            this.rowToParcelaFromArray(row, result[0].columns)
          );

    // Armazenar em cache
    this.setCache(cacheKey, data);

    return data;
  }

  getParcela(id: number, usuarioId: number): Parcela | undefined {
    const result = this.db.exec('SELECT * FROM parcelas WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
    if (result.length === 0 || result[0].values.length === 0) return undefined;
    return this.rowToParcela(result[0]);
  }

  updateParcela(id: number, usuarioId: number, updates: Partial<Parcela>): boolean {
    const allowedFields = [
      'descricao',
      'dia',
      'cartao_id',
      'valor_parcela',
      'quantidade_parcelas',
      'total',
    ];

    const validUpdates = Object.entries(updates).filter(
      ([key]) => allowedFields.includes(key) && key !== 'id' && key !== 'usuario_id'
    );

    if (validUpdates.length === 0) {
      return false;
    }

    const fields = validUpdates.map(([key]) => `${key} = ?`).join(', ');
    const values = validUpdates.map(([, value]) => value);

    this.db.run(`UPDATE parcelas SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND usuario_id = ?`, [
      ...values,
      id,
      usuarioId,
    ] as SqlValue[]);
    this.save();

    // Invalidar cache de parcelas
    this.invalidateCache(`parcelas_${usuarioId}`);

    return true;
  }

  deleteParcela(id: number, usuarioId: number): boolean {
    this.db.run('DELETE FROM parcelas WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
    this.save();

    // Invalidar cache de parcelas
    this.invalidateCache(`parcelas_${usuarioId}`);

    return true;
  }

  private rowToParcela(result: QueryExecResult): Parcela {
    const row = result.values[0];
    return this.rowToParcelaFromArray(row, result.columns);
  }

  private rowToParcelaFromArray(row: SqlValue[], cols: string[]): Parcela {
    return {
      id: Number(row[cols.indexOf('id')]),
      usuario_id: Number(row[cols.indexOf('usuario_id')]),
      descricao: String(row[cols.indexOf('descricao')]),
      dia: Number(row[cols.indexOf('dia')]),
      cartao_id: Number(row[cols.indexOf('cartao_id')]),
      valor_parcela: Number(row[cols.indexOf('valor_parcela')]),
      quantidade_parcelas: Number(row[cols.indexOf('quantidade_parcelas')]),
      total: Number(row[cols.indexOf('total')]),
      created_at: String(row[cols.indexOf('created_at')]),
      updated_at: String(row[cols.indexOf('updated_at')]),
    };
  }

  // ========== MÉTODOS DE TRANSAÇÃO DE CARTÃO ==========

  createTransacaoCartao(
    transacao: Omit<TransacaoCartao, 'id' | 'created_at' | 'updated_at'>
  ): TransacaoCartao {
    // Validações
    if (!transacao.usuario_id) {
      throw new Error('Usuário é obrigatório');
    }
    if (!transacao.descricao || transacao.descricao.trim() === '') {
      throw new Error('Descrição é obrigatória');
    }
    if (transacao.parcelas < 1) {
      throw new Error('Parcelas deve ser maior que 0');
    }
    if (transacao.parcela_atual < 1 || transacao.parcela_atual > transacao.parcelas) {
      throw new Error('Parcela atual inválida');
    }

    this.db.run(
      `INSERT INTO transacoes_cartao (usuario_id, descricao, valor, data, cartao_id, categoria_id,
       parcelas, parcela_atual, grupo_parcelamento, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transacao.usuario_id,
        transacao.descricao,
        transacao.valor,
        transacao.data,
        transacao.cartao_id,
        transacao.categoria_id || null,
        transacao.parcelas,
        transacao.parcela_atual,
        transacao.grupo_parcelamento || null,
        transacao.observacoes || null,
      ] as SqlValue[]
    );

    this.save();

    // Recalcular valor total do cartão
    this.recalcularValorCartao(transacao.cartao_id, transacao.usuario_id);

    // Invalidar cache
    this.invalidateCache(`cartoes_${transacao.usuario_id}`);
    this.invalidateCache(`transacoes_cartao_${transacao.usuario_id}`);

    const result = this.db.exec('SELECT * FROM transacoes_cartao ORDER BY id DESC LIMIT 1');
    return this.rowToTransacaoCartao(result[0]);
  }

  createTransacaoParcelada(
    transacao: Omit<
      TransacaoCartao,
      'id' | 'created_at' | 'updated_at' | 'parcela_atual' | 'grupo_parcelamento'
    >,
    numeroParcelas: number
  ): TransacaoCartao[] {
    // Validação de campos obrigatórios
    if (!transacao.usuario_id) {
      throw new Error('Usuário é obrigatório');
    }

    const grupoId = `parcela-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const valorParcela = transacao.valor / numeroParcelas;

    // Parse da data como data LOCAL para evitar problemas de timezone
    const [ano, mes, dia] = transacao.data.split('-').map(Number);
    const dataCompra = new Date(ano, mes - 1, dia); // mes - 1 porque mês em JS é 0-11
    const transacoesCriadas: TransacaoCartao[] = [];

    // Buscar dados do cartão para obter o dia de vencimento
    const cartao = this.getCartao(transacao.cartao_id, transacao.usuario_id);
    if (!cartao) {
      throw new Error('Cartão não encontrado');
    }

    const diaVencimento = cartao.vencimento;
    const diaFechamento = diaVencimento - 6; // 6 dias antes do vencimento
    const diaCompra = dia; // Usar o dia original da string

    // Determinar se a compra entra na fatura do mês atual ou do próximo mês
    // Se a compra foi feita DEPOIS do fechamento, ela entra no próximo mês
    let mesesOffset = 0;

    // Se o dia de fechamento é negativo (ex: vencimento dia 5, fechamento dia -1)
    // isso significa que o fechamento é no final do mês anterior
    if (diaFechamento <= 0) {
      // Fechamento no mês anterior
      // Se estamos no início do mês (antes do vencimento), a compra entra no mês atual
      if (diaCompra < diaVencimento) {
        mesesOffset = 0; // Entra na fatura do mês atual
      } else {
        mesesOffset = 1; // Entra na fatura do próximo mês
      }
    } else {
      // Fechamento no mesmo mês
      // Se a compra foi feita depois do fechamento, entra no próximo mês
      if (diaCompra > diaFechamento) {
        mesesOffset = 1; // Entra na fatura do próximo mês
      } else {
        mesesOffset = 0; // Entra na fatura do mês atual
      }
    }

    for (let i = 1; i <= numeroParcelas; i++) {
      // Calcular data de cada parcela
      // A primeira parcela começa no mês determinado pelo offset
      // As demais parcelas seguem mês a mês
      const dataParcela = new Date(dataCompra);
      dataParcela.setMonth(dataParcela.getMonth() + mesesOffset + (i - 1));

      // IMPORTANTE: Mantém o dia ORIGINAL da compra
      // NÃO ajustamos para o dia de vencimento do cartão
      // A lógica de fechamento determinará em qual fatura a parcela aparece

      // Garantir que o dia não ultrapasse o último dia do mês
      // (exemplo: compra dia 31, mas o mês seguinte só tem 30 dias)
      const ultimoDiaDoMes = new Date(dataParcela.getFullYear(), dataParcela.getMonth() + 1, 0).getDate();
      const diaFinal = Math.min(diaCompra, ultimoDiaDoMes);
      dataParcela.setDate(diaFinal);

      // Formatar data como YYYY-MM-DD usando componentes locais (não UTC)
      const anoFinal = dataParcela.getFullYear();
      const mesFinal = String(dataParcela.getMonth() + 1).padStart(2, '0');
      const diaFinalStr = String(dataParcela.getDate()).padStart(2, '0');
      const dataParcelaStr = `${anoFinal}-${mesFinal}-${diaFinalStr}`;

      const parcelaData = {
        ...transacao,
        valor: valorParcela,
        data: dataParcelaStr,
        parcelas: numeroParcelas,
        parcela_atual: i,
        grupo_parcelamento: grupoId,
        descricao: `${transacao.descricao} (${i}/${numeroParcelas})`,
      };

      const created = this.createTransacaoCartao(parcelaData);
      transacoesCriadas.push(created);
    }

    return transacoesCriadas;
  }

  /**
   * Calcula o mês e ano da fatura em que uma transação deve aparecer,
   * considerando o dia de fechamento do cartão (6 dias antes do vencimento).
   *
   * @param dataTransacao Data real da transação
   * @param diaVencimento Dia do vencimento do cartão (1-31)
   * @returns { mes: number, ano: number } - Mês (1-12) e ano da fatura
   */
  private calcularMesFatura(dataTransacao: string, diaVencimento: number): { mes: number; ano: number } {
    // Parse da data como data LOCAL para evitar problemas de timezone
    const [ano, mes, dia] = dataTransacao.split('-').map(Number);

    const diaFechamento = diaVencimento - 6; // 6 dias antes do vencimento
    const diaCompra = dia;
    const mesCompra = mes; // 1-12
    const anoCompra = ano;

    // Determinar se a compra entra na fatura do mês atual ou do próximo mês
    // Mesma lógica usada nas compras parceladas
    let mesesOffset = 0;

    if (diaFechamento <= 0) {
      // Fechamento no mês anterior
      // Se estamos no início do mês (antes do vencimento), a compra entra no mês atual
      if (diaCompra < diaVencimento) {
        mesesOffset = 0; // Entra na fatura do mês atual
      } else {
        mesesOffset = 1; // Entra na fatura do próximo mês
      }
    } else {
      // Fechamento no mesmo mês
      // Se a compra foi feita depois do fechamento, entra no próximo mês
      if (diaCompra > diaFechamento) {
        mesesOffset = 1; // Entra na fatura do próximo mês
      } else {
        mesesOffset = 0; // Entra na fatura do mês atual
      }
    }

    // Calcular mês e ano da fatura
    const dataFatura = new Date(anoCompra, mesCompra - 1 + mesesOffset, 1);
    return {
      mes: dataFatura.getMonth() + 1, // 1-12
      ano: dataFatura.getFullYear(),
    };
  }

  getTransacoesCartao(
    usuarioId: number,
    cartaoId?: number,
    mes?: number,
    ano?: number
  ): TransacaoCartaoCompleta[] {
    const cacheKey = `transacoes_cartao_${usuarioId}:${cartaoId || 'all'}:${mes || 'all'}:${ano || 'all'}`;

    // Tentar buscar do cache
    const cached = this.getCached<TransacaoCartaoCompleta[]>(cacheKey);
    if (cached) return cached;

    let query = `
      SELECT
        tc.*,
        c.nome as cartao_nome,
        c.vencimento as cartao_vencimento,
        cat.nome as categoria_nome,
        cat.cor as categoria_cor
      FROM transacoes_cartao tc
      JOIN cartoes c ON tc.cartao_id = c.id
      LEFT JOIN categorias cat ON tc.categoria_id = cat.id
      WHERE tc.usuario_id = ?
    `;

    const params: SqlValue[] = [usuarioId];

    if (cartaoId) {
      query += ' AND tc.cartao_id = ?';
      params.push(cartaoId);
    }

    // Se mes e ano foram especificados, buscar um range mais amplo
    // (mês anterior e seguinte) para depois filtrar corretamente
    if (mes && ano) {
      const mesAnterior = mes === 1 ? 12 : mes - 1;
      const anoAnterior = mes === 1 ? ano - 1 : ano;
      const mesSeguinte = mes === 12 ? 1 : mes + 1;
      const anoSeguinte = mes === 12 ? ano + 1 : ano;

      query += ` AND (
        (strftime('%Y', tc.data) = ? AND strftime('%m', tc.data) = ?) OR
        (strftime('%Y', tc.data) = ? AND strftime('%m', tc.data) = ?) OR
        (strftime('%Y', tc.data) = ? AND strftime('%m', tc.data) = ?)
      )`;
      params.push(
        anoAnterior.toString(), mesAnterior.toString().padStart(2, '0'),
        ano.toString(), mes.toString().padStart(2, '0'),
        anoSeguinte.toString(), mesSeguinte.toString().padStart(2, '0')
      );
    }

    query += ' ORDER BY tc.data DESC, tc.created_at DESC';

    const result = this.db.exec(query, params);
    let data: TransacaoCartaoCompleta[] =
      result.length === 0
        ? []
        : result[0].values.map((row: SqlValue[]) =>
            this.rowToTransacaoCartaoCompletaFromArray(row, result[0].columns)
          );

    // Se mes e ano foram especificados, filtrar baseado no dia de fechamento do cartão
    if (mes && ano) {
      data = data.filter((transacao) => {
        const mesFatura = this.calcularMesFatura(transacao.data, transacao.cartao_vencimento);
        return mesFatura.mes === mes && mesFatura.ano === ano;
      });
    }

    // Armazenar em cache
    this.setCache(cacheKey, data);

    return data;
  }

  getTransacaoCartao(id: number, usuarioId: number): TransacaoCartao | undefined {
    const result = this.db.exec('SELECT * FROM transacoes_cartao WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
    if (result.length === 0 || result[0].values.length === 0) return undefined;
    return this.rowToTransacaoCartao(result[0]);
  }

  updateTransacaoCartao(id: number, usuarioId: number, updates: Partial<TransacaoCartao>): boolean {
    const allowedFields = [
      'descricao',
      'valor',
      'data',
      'cartao_id',
      'categoria_id',
      'parcelas',
      'parcela_atual',
      'grupo_parcelamento',
      'observacoes',
    ];

    const validUpdates = Object.entries(updates).filter(
      ([key]) => allowedFields.includes(key) && key !== 'id' && key !== 'usuario_id'
    );

    if (validUpdates.length === 0) {
      return false;
    }

    // Buscar cartao_id antes de atualizar
    const transacao = this.getTransacaoCartao(id, usuarioId);
    if (!transacao) {
      return false;
    }

    const fields = validUpdates.map(([key]) => `${key} = ?`).join(', ');
    const values = validUpdates.map(([, value]) => value);

    this.db.run(
      `UPDATE transacoes_cartao SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND usuario_id = ?`,
      [...values, id, usuarioId] as SqlValue[]
    );

    this.save();

    // Recalcular valor total do cartão (usar o cartão original e o novo se mudou)
    this.recalcularValorCartao(transacao.cartao_id, usuarioId);
    if (updates.cartao_id && updates.cartao_id !== transacao.cartao_id) {
      this.recalcularValorCartao(updates.cartao_id, usuarioId);
    }

    // Invalidar cache
    this.invalidateCache(`cartoes_${usuarioId}`);
    this.invalidateCache(`transacoes_cartao_${usuarioId}`);

    return true;
  }

  deleteTransacaoCartao(id: number, usuarioId: number): boolean {
    // Buscar cartao_id antes de deletar
    const transacao = this.getTransacaoCartao(id, usuarioId);
    if (!transacao) {
      return false;
    }

    this.db.run('DELETE FROM transacoes_cartao WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
    this.save();

    // Recalcular valor total do cartão
    this.recalcularValorCartao(transacao.cartao_id, usuarioId);

    // Invalidar cache
    this.invalidateCache(`cartoes_${usuarioId}`);
    this.invalidateCache(`transacoes_cartao_${usuarioId}`);

    return true;
  }

  private rowToTransacaoCartao(result: QueryExecResult): TransacaoCartao {
    const row = result.values[0];
    return this.rowToTransacaoCartaoFromArray(row, result.columns);
  }

  private rowToTransacaoCartaoFromArray(row: SqlValue[], cols: string[]): TransacaoCartao {
    return {
      id: Number(row[cols.indexOf('id')]),
      usuario_id: Number(row[cols.indexOf('usuario_id')]),
      descricao: String(row[cols.indexOf('descricao')]),
      valor: Number(row[cols.indexOf('valor')]),
      data: String(row[cols.indexOf('data')]),
      cartao_id: Number(row[cols.indexOf('cartao_id')]),
      categoria_id: row[cols.indexOf('categoria_id')] ? Number(row[cols.indexOf('categoria_id')]) : undefined,
      parcelas: Number(row[cols.indexOf('parcelas')]),
      parcela_atual: Number(row[cols.indexOf('parcela_atual')]),
      grupo_parcelamento: row[cols.indexOf('grupo_parcelamento')]
        ? String(row[cols.indexOf('grupo_parcelamento')])
        : undefined,
      observacoes: row[cols.indexOf('observacoes')] ? String(row[cols.indexOf('observacoes')]) : undefined,
      created_at: String(row[cols.indexOf('created_at')]),
      updated_at: String(row[cols.indexOf('updated_at')]),
    };
  }

  private rowToTransacaoCartaoCompletaFromArray(
    row: SqlValue[],
    cols: string[]
  ): TransacaoCartaoCompleta {
    return {
      ...this.rowToTransacaoCartaoFromArray(row, cols),
      cartao_nome: String(row[cols.indexOf('cartao_nome')]),
      cartao_vencimento: Number(row[cols.indexOf('cartao_vencimento')]),
      categoria_nome: row[cols.indexOf('categoria_nome')]
        ? String(row[cols.indexOf('categoria_nome')])
        : undefined,
      categoria_cor: row[cols.indexOf('categoria_cor')]
        ? String(row[cols.indexOf('categoria_cor')])
        : undefined,
    };
  }

  // ========== MÉTODOS DE CATEGORIA ==========

  createCategoria(categoria: Omit<Categoria, 'id' | 'created_at' | 'updated_at'>): Categoria {
    // Validações de campos obrigatórios
    if (!categoria.usuario_id) {
      throw new Error('Usuário é obrigatório');
    }
    if (!categoria.nome || categoria.nome.trim() === '') {
      throw new Error('Nome da categoria é obrigatório');
    }

    this.db.run(
      'INSERT INTO categorias (usuario_id, nome, tipo, cor, icone) VALUES (?, ?, ?, ?, ?)',
      [
        categoria.usuario_id,
        categoria.nome,
        categoria.tipo,
        categoria.cor ?? null,
        categoria.icone ?? null,
      ]
    );
    this.save();

    // Invalidar cache de categorias
    this.invalidateCache(`categorias_${categoria.usuario_id}`);

    const result = this.db.exec('SELECT * FROM categorias ORDER BY id DESC LIMIT 1');
    return this.rowToCategoria(result[0]);
  }

  getCategorias(usuarioId: number, tipo?: 'receita' | 'despesa'): Categoria[] {
    // Tentar buscar do cache
    const cacheKey = `categorias_${usuarioId}:${tipo || 'all'}`;
    const cached = this.getCached<Categoria[]>(cacheKey);
    if (cached) return cached;

    // Se não estiver em cache, buscar do banco
    let query = 'SELECT * FROM categorias WHERE usuario_id = ?';
    const params: SqlValue[] = [usuarioId];

    if (tipo) {
      query += ' AND tipo = ?';
      params.push(tipo);
    }

    query += ' ORDER BY nome';

    const result = this.db.exec(query, params);
    const data =
      result.length === 0
        ? []
        : result[0].values.map((row: SqlValue[]) =>
            this.rowToCategoriaFromArray(row, result[0].columns)
          );

    // Armazenar em cache
    this.setCache(cacheKey, data);

    return data;
  }

  getCategoria(id: number, usuarioId: number): Categoria | undefined {
    const result = this.db.exec('SELECT * FROM categorias WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
    if (result.length === 0 || result[0].values.length === 0) return undefined;
    return this.rowToCategoria(result[0]);
  }

  updateCategoria(id: number, usuarioId: number, updates: Partial<Categoria>): boolean {
    // Whitelist de campos que podem ser atualizados
    const allowedFields = ['nome', 'tipo', 'cor', 'icone'];

    const validUpdates = Object.entries(updates).filter(
      ([key]) => allowedFields.includes(key) && key !== 'id' && key !== 'usuario_id'
    );

    if (validUpdates.length === 0) {
      return false;
    }

    const fields = validUpdates.map(([key]) => `${key} = ?`).join(', ');
    const values = validUpdates.map(([, value]) => value);

    this.db.run(`UPDATE categorias SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND usuario_id = ?`, [
      ...values,
      id,
      usuarioId,
    ] as SqlValue[]);
    this.save();

    // Invalidar cache de categorias
    this.invalidateCache(`categorias_${usuarioId}`);

    return true;
  }

  deleteCategoria(id: number, usuarioId: number): boolean {
    this.db.run('DELETE FROM categorias WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
    this.save();

    // Invalidar cache de categorias
    this.invalidateCache(`categorias_${usuarioId}`);

    return true;
  }

  private rowToCategoria(result: QueryExecResult): Categoria {
    const row = result.values[0];
    return this.rowToCategoriaFromArray(row, result.columns);
  }

  private rowToCategoriaFromArray(row: SqlValue[], cols: string[]): Categoria {
    const corValue = row[cols.indexOf('cor')];
    const iconeValue = row[cols.indexOf('icone')];

    return {
      id: Number(row[cols.indexOf('id')]),
      usuario_id: Number(row[cols.indexOf('usuario_id')]),
      nome: String(row[cols.indexOf('nome')]),
      tipo: String(row[cols.indexOf('tipo')]) as 'receita' | 'despesa',
      cor: corValue !== null ? String(corValue) : undefined,
      icone: iconeValue !== null ? String(iconeValue) : undefined,
      created_at: String(row[cols.indexOf('created_at')]),
      updated_at: String(row[cols.indexOf('updated_at')]),
    };
  }

  // ========== MÉTODOS DE ORÇAMENTO ==========

  createOrcamento(orcamento: Omit<Orcamento, 'id' | 'created_at' | 'updated_at'>): Orcamento {
    // Validação de campos obrigatórios
    if (!orcamento.usuario_id) {
      throw new Error('Usuário é obrigatório');
    }

    this.db.run(
      'INSERT INTO orcamentos (usuario_id, categoria_id, valor_planejado, mes, ano) VALUES (?, ?, ?, ?, ?)',
      [
        orcamento.usuario_id,
        orcamento.categoria_id,
        orcamento.valor_planejado,
        orcamento.mes,
        orcamento.ano,
      ]
    );
    this.save();

    // Invalidar cache de orçamentos
    this.invalidateCache(`orcamentos_${orcamento.usuario_id}`);

    const result = this.db.exec('SELECT * FROM orcamentos ORDER BY id DESC LIMIT 1');
    return this.rowToOrcamento(result[0]);
  }

  getOrcamentos(usuarioId: number, mes?: number, ano?: number): Orcamento[] {
    // Tentar buscar do cache
    const cacheKey = `orcamentos_${usuarioId}:${mes || 'all'}:${ano || 'all'}`;
    const cached = this.getCached<Orcamento[]>(cacheKey);
    if (cached) return cached;

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
    const data = result.length === 0
      ? []
      : result[0].values.map((row: SqlValue[]) =>
          this.rowToOrcamentoFromArray(row, result[0].columns)
        );

    // Armazenar em cache
    this.setCache(cacheKey, data);

    return data;
  }

  getOrcamento(id: number, usuarioId: number): Orcamento | undefined {
    const result = this.db.exec('SELECT * FROM orcamentos WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
    if (result.length === 0 || result[0].values.length === 0) return undefined;
    return this.rowToOrcamento(result[0]);
  }

  updateOrcamento(id: number, usuarioId: number, updates: Partial<Orcamento>): boolean {
    // Whitelist de campos que podem ser atualizados
    const allowedFields = ['categoria_id', 'valor_planejado', 'mes', 'ano'];

    const validUpdates = Object.entries(updates).filter(
      ([key]) => allowedFields.includes(key) && key !== 'id' && key !== 'usuario_id'
    );

    if (validUpdates.length === 0) {
      return false;
    }

    const fields = validUpdates.map(([key]) => `${key} = ?`).join(', ');
    const values = validUpdates.map(([, value]) => value);

    this.db.run(`UPDATE orcamentos SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND usuario_id = ?`, [
      ...values,
      id,
      usuarioId,
    ] as SqlValue[]);
    this.save();

    // Invalidar cache de orçamentos
    this.invalidateCache(`orcamentos_${usuarioId}`);

    return true;
  }

  deleteOrcamento(id: number, usuarioId: number): boolean {
    this.db.run('DELETE FROM orcamentos WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
    this.save();

    // Invalidar cache de orçamentos
    this.invalidateCache(`orcamentos_${usuarioId}`);

    return true;
  }

  private rowToOrcamento(result: QueryExecResult): Orcamento {
    const row = result.values[0];
    return this.rowToOrcamentoFromArray(row, result.columns);
  }

  private rowToOrcamentoFromArray(row: SqlValue[], cols: string[]): Orcamento {
    return {
      id: Number(row[cols.indexOf('id')]),
      usuario_id: Number(row[cols.indexOf('usuario_id')]),
      categoria_id: Number(row[cols.indexOf('categoria_id')]),
      valor_planejado: Number(row[cols.indexOf('valor_planejado')]),
      mes: Number(row[cols.indexOf('mes')]),
      ano: Number(row[cols.indexOf('ano')]),
      created_at: String(row[cols.indexOf('created_at')]),
      updated_at: String(row[cols.indexOf('updated_at')]),
    };
  }

  // ========== MÉTODOS DE TRANSAÇÃO ==========

  createTransacao(transacao: Omit<Transacao, 'id' | 'created_at' | 'updated_at'>): Transacao {
    // Validação de campos obrigatórios
    if (!transacao.usuario_id) {
      throw new Error('Usuário é obrigatório');
    }

    return this.executeInTransaction(() => {
      this.db.run(
        'INSERT INTO transacoes (usuario_id, descricao, valor, tipo, data, conta_id, categoria_id, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          transacao.usuario_id,
          transacao.descricao,
          transacao.valor,
          transacao.tipo,
          transacao.data,
          transacao.conta_id,
          transacao.categoria_id,
          transacao.observacoes || null,
        ]
      );

      // O saldo é atualizado automaticamente pelo TRIGGER atualizar_saldo_insert
      // Invalidar cache de contas para refletir a mudança de saldo
      this.invalidateCache(`contas_${transacao.usuario_id}`);
      this.invalidateCache(`transacoes_${transacao.usuario_id}`);

      const result = this.db.exec('SELECT * FROM transacoes ORDER BY id DESC LIMIT 1');
      return this.rowToTransacao(result[0]);
    });
  }

  getTransacoes(usuarioId: number, limit?: number): TransacaoCompleta[] {
    // Tentar buscar do cache
    const cacheKey = `transacoes_${usuarioId}:${limit || 'all'}`;
    const cached = this.getCached<TransacaoCompleta[]>(cacheKey);
    if (cached) return cached;

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

    const params: SqlValue[] = [usuarioId];

    if (limit !== undefined && limit > 0) {
      const safeLimit = Math.floor(Math.max(1, limit));
      query += ` LIMIT ?`;
      params.push(safeLimit);
    }

    const result = this.db.exec(query, params);
    const data = result.length === 0
      ? []
      : result[0].values.map((row: SqlValue[]) =>
          this.rowToTransacaoCompletaFromArray(row, result[0].columns)
        );

    // Armazenar em cache
    this.setCache(cacheKey, data);

    return data;
  }

  getTransacoesPaginated(
    usuarioId: number,
    pagination: PaginationParams
  ): PaginatedResult<TransacaoCompleta> {
    const { page = 1, pageSize = 50 } = pagination;

    // Validar e limitar pageSize
    const safePageSize = Math.min(Math.max(1, pageSize), 100); // Máximo 100 por página
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * safePageSize;

    // Query para contar total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM transacoes t
      WHERE t.usuario_id = ?
    `;

    const countResult = this.db.exec(countQuery, [usuarioId]);
    const total = (countResult[0]?.values[0]?.[0] as number) || 0;
    const totalPages = Math.ceil(total / safePageSize);

    // Query para buscar dados paginados
    const dataQuery = `
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
      LIMIT ? OFFSET ?
    `;

    const dataResult = this.db.exec(dataQuery, [usuarioId, safePageSize, offset]);
    const data =
      dataResult.length === 0
        ? []
        : dataResult[0].values.map((row: SqlValue[]) =>
            this.rowToTransacaoCompletaFromArray(row, dataResult[0].columns)
          );

    return {
      data,
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        total,
        totalPages,
        hasNext: safePage < totalPages,
        hasPrev: safePage > 1,
      },
    };
  }

  getTransacao(id: number, usuarioId: number): Transacao | undefined {
    const result = this.db.exec('SELECT * FROM transacoes WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
    if (result.length === 0 || result[0].values.length === 0) return undefined;
    return this.rowToTransacao(result[0]);
  }

  updateTransacao(id: number, usuarioId: number, updates: Partial<Transacao>): boolean {
    // Whitelist de campos que podem ser atualizados
    const allowedFields = [
      'descricao',
      'valor',
      'tipo',
      'data',
      'conta_id',
      'categoria_id',
      'observacoes',
    ];

    const validUpdates = Object.entries(updates).filter(
      ([key]) => allowedFields.includes(key) && key !== 'id' && key !== 'usuario_id'
    );

    if (validUpdates.length === 0) {
      return false;
    }

    return this.executeInTransaction(() => {
      const fields = validUpdates.map(([key]) => `${key} = ?`).join(', ');
      const values = validUpdates.map(([, value]) => value);

      // O saldo é atualizado automaticamente pelo TRIGGER atualizar_saldo_update
      this.db.run(`UPDATE transacoes SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND usuario_id = ?`, [
        ...values,
        id,
        usuarioId,
      ] as SqlValue[]);

      // Invalidar cache de contas e transações para refletir a mudança
      this.invalidateCache(`contas_${usuarioId}`);
      this.invalidateCache(`transacoes_${usuarioId}`);

      return true;
    });
  }

  deleteTransacao(id: number, usuarioId: number): boolean {
    return this.executeInTransaction(() => {
      // O saldo é atualizado automaticamente pelo TRIGGER atualizar_saldo_delete
      this.db.run('DELETE FROM transacoes WHERE id = ? AND usuario_id = ?', [id, usuarioId]);

      // Invalidar cache de contas e transações para refletir a mudança
      this.invalidateCache(`contas_${usuarioId}`);
      this.invalidateCache(`transacoes_${usuarioId}`);

      return true;
    });
  }

  private rowToTransacao(result: QueryExecResult): Transacao {
    const row = result.values[0];
    return this.rowToTransacaoFromArray(row, result.columns);
  }

  private rowToTransacaoFromArray(row: SqlValue[], cols: string[]): Transacao {
    return {
      id: Number(row[cols.indexOf('id')]),
      usuario_id: Number(row[cols.indexOf('usuario_id')]),
      descricao: String(row[cols.indexOf('descricao')]),
      valor: Number(row[cols.indexOf('valor')]),
      tipo: String(row[cols.indexOf('tipo')]) as 'receita' | 'despesa',
      data: String(row[cols.indexOf('data')]),
      conta_id: Number(row[cols.indexOf('conta_id')]),
      categoria_id: Number(row[cols.indexOf('categoria_id')]),
      observacoes: row[cols.indexOf('observacoes')]
        ? String(row[cols.indexOf('observacoes')])
        : undefined,
      created_at: String(row[cols.indexOf('created_at')]),
      updated_at: String(row[cols.indexOf('updated_at')]),
    };
  }

  private rowToTransacaoCompletaFromArray(row: SqlValue[], cols: string[]): TransacaoCompleta {
    return {
      ...this.rowToTransacaoFromArray(row, cols),
      conta_nome: String(row[cols.indexOf('conta_nome')]),
      categoria_nome: String(row[cols.indexOf('categoria_nome')]),
      categoria_cor: row[cols.indexOf('categoria_cor')]
        ? String(row[cols.indexOf('categoria_cor')])
        : undefined,
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
      saldo: receita - despesa,
    };
  }

  /**
   * Limpa todos os dados do banco de dados, mantendo a estrutura das tabelas.
   * Remove transações, contas, categorias, cartões, parcelas e orçamentos.
   */
  clearAllData(): void {
    this.executeInTransaction(() => {
      // Ordem importante: deletar tabelas dependentes primeiro
      this.db.run('DELETE FROM transacoes_cartao');
      this.db.run('DELETE FROM transacoes');
      this.db.run('DELETE FROM parcelas');
      this.db.run('DELETE FROM orcamentos');
      this.db.run('DELETE FROM cartoes');
      this.db.run('DELETE FROM categorias');
      this.db.run('DELETE FROM contas');

      // Resetar os auto-incrementos
      this.db.run("DELETE FROM sqlite_sequence WHERE name IN ('transacoes_cartao', 'transacoes', 'parcelas', 'orcamentos', 'cartoes', 'categorias', 'contas')");

      // Limpar todo o cache
      this.clearCache();

      return true;
    });
  }

  close(): void {
    this.save();
    this.db.close();
  }
}
