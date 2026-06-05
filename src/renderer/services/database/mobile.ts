import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite'
import { hashPassword, verifyPassword } from '../auth/hashPassword'
import Decimal from 'decimal.js'
import type {
  Usuario,
  Conta,
  Categoria,
  Orcamento,
  Cartao,
  Parcela,
  TransacaoCartao,
  TransacaoCartaoCompleta,
  Transacao,
  TransacaoCompleta,
  ResumoFinanceiro,
  PaginatedResult,
  Nota,
  ServiceResult
} from '../../../types/database.types'
import type { DatabaseService } from './types'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

// ========== INICIALIZAÇÃO DA CONEXÃO ==========

let dbInstance: SQLiteDBConnection | null = null
let initPromise: Promise<SQLiteDBConnection> | null = null

async function getDb(): Promise<SQLiteDBConnection> {
  if (dbInstance) return dbInstance
  if (!initPromise) initPromise = initializeDb()
  dbInstance = await initPromise
  return dbInstance
}

async function initializeDb(): Promise<SQLiteDBConnection> {
  const sqlite = new SQLiteConnection(CapacitorSQLite)
  await sqlite.checkConnectionsConsistency()

  const isConn = (await sqlite.isConnection('financas', false)).result
  const db = isConn
    ? await sqlite.retrieveConnection('financas', false)
    : await sqlite.createConnection('financas', false, 'no-encryption', 1, false)

  await db.open()
  await runSchema(db)
  await runMigrations(db)
  return db
}

// ========== SCHEMA ==========

async function runSchema(db: SQLiteDBConnection): Promise<void> {
  await db.run('PRAGMA foreign_keys = ON')

  await db.execute(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

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
    );

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
    );

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
    );

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
    );

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
    );

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
    );

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
    );

    CREATE TABLE IF NOT EXISTS notas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      titulo TEXT NOT NULL,
      conteudo TEXT,
      data DATE,
      tipo TEXT CHECK(tipo IN ('lembrete', 'vencimento', 'outro')) DEFAULT 'outro',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes(data);
    CREATE INDEX IF NOT EXISTS idx_transacoes_usuario ON transacoes(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_transacoes_cartao_data ON transacoes_cartao(data);
    CREATE INDEX IF NOT EXISTS idx_transacoes_cartao_cartao ON transacoes_cartao(cartao_id);
    CREATE INDEX IF NOT EXISTS idx_transacoes_cartao_grupo ON transacoes_cartao(grupo_parcelamento);
    CREATE INDEX IF NOT EXISTS idx_orcamentos_usuario ON orcamentos(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_orcamentos_mes_ano ON orcamentos(mes, ano);
    CREATE INDEX IF NOT EXISTS idx_categorias_usuario ON categorias(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_contas_usuario ON contas(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_cartoes_usuario ON cartoes(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_notas_usuario ON notas(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_notas_data ON notas(data);

    CREATE TRIGGER IF NOT EXISTS atualizar_saldo_insert
    AFTER INSERT ON transacoes FOR EACH ROW BEGIN
      UPDATE contas SET saldo = saldo + (CASE WHEN NEW.tipo = 'receita' THEN NEW.valor ELSE -NEW.valor END),
        updated_at = CURRENT_TIMESTAMP WHERE id = NEW.conta_id;
    END;

    CREATE TRIGGER IF NOT EXISTS atualizar_saldo_delete
    AFTER DELETE ON transacoes FOR EACH ROW BEGIN
      UPDATE contas SET saldo = saldo - (CASE WHEN OLD.tipo = 'receita' THEN OLD.valor ELSE -OLD.valor END),
        updated_at = CURRENT_TIMESTAMP WHERE id = OLD.conta_id;
    END;

    CREATE TRIGGER IF NOT EXISTS atualizar_saldo_update
    AFTER UPDATE ON transacoes FOR EACH ROW BEGIN
      UPDATE contas SET saldo = saldo - (CASE WHEN OLD.tipo = 'receita' THEN OLD.valor ELSE -OLD.valor END)
        WHERE id = OLD.conta_id;
      UPDATE contas SET saldo = saldo + (CASE WHEN NEW.tipo = 'receita' THEN NEW.valor ELSE -NEW.valor END),
        updated_at = CURRENT_TIMESTAMP WHERE id = NEW.conta_id;
    END;

    CREATE TRIGGER IF NOT EXISTS atualizar_cartao_insert
    AFTER INSERT ON transacoes_cartao FOR EACH ROW BEGIN
      UPDATE cartoes SET valor = valor + NEW.valor, updated_at = CURRENT_TIMESTAMP WHERE id = NEW.cartao_id;
    END;

    CREATE TRIGGER IF NOT EXISTS atualizar_cartao_delete
    AFTER DELETE ON transacoes_cartao FOR EACH ROW BEGIN
      UPDATE cartoes SET valor = valor - OLD.valor, updated_at = CURRENT_TIMESTAMP WHERE id = OLD.cartao_id;
    END;

    CREATE TRIGGER IF NOT EXISTS atualizar_cartao_update
    AFTER UPDATE ON transacoes_cartao FOR EACH ROW BEGIN
      UPDATE cartoes SET valor = valor - OLD.valor WHERE id = OLD.cartao_id;
      UPDATE cartoes SET valor = valor + NEW.valor, updated_at = CURRENT_TIMESTAMP WHERE id = NEW.cartao_id;
    END;
  `)

  // Migrações de coluna (idempotentes)
  const migrations = [
    `ALTER TABLE usuarios ADD COLUMN password_hash TEXT`,
    `ALTER TABLE contas ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE`,
    `ALTER TABLE categorias ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE`,
    `ALTER TABLE transacoes ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE`,
    `ALTER TABLE orcamentos ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE`,
    `ALTER TABLE cartoes ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE`,
    `ALTER TABLE parcelas ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE`,
    `ALTER TABLE transacoes_cartao ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE`
  ]
  for (const sql of migrations) {
    try {
      await db.run(sql)
    } catch {
      /* coluna já existe */
    }
  }
}

async function runMigrations(db: SQLiteDBConnection): Promise<void> {
  const res = await db.query('SELECT id FROM usuarios LIMIT 1')
  if (!res.values?.length) return

  const uid = Number(res.values[0].id)
  const tables = [
    'contas',
    'categorias',
    'transacoes',
    'orcamentos',
    'cartoes',
    'parcelas',
    'transacoes_cartao'
  ]
  for (const table of tables) {
    await db.run(`UPDATE ${table} SET usuario_id = ? WHERE usuario_id IS NULL`, [uid])
  }
}

// ========== HELPER DE ERRO ==========

function sanitizeError(err: unknown): string {
  const msg = err instanceof Error ? err.message.toLowerCase() : ''
  const map: Record<string, string> = {
    'unique constraint failed': 'Este registro já existe no sistema',
    'not null constraint failed': 'Campos obrigatórios não preenchidos',
    'foreign key constraint failed': 'Registro relacionado não encontrado',
    'check constraint failed': 'Valor inválido para este campo'
  }
  for (const [pattern, friendly] of Object.entries(map)) {
    if (msg.includes(pattern)) return friendly
  }
  return 'Ocorreu um erro ao processar sua solicitação.'
}

async function run<T>(fn: (db: SQLiteDBConnection) => Promise<T>): Promise<ServiceResult<T>> {
  try {
    const db = await getDb()
    const data = await fn(db)
    return { success: true, data }
  } catch (err) {
    return { success: false, error: sanitizeError(err) }
  }
}

// ========== ROW MAPPERS ==========

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toUsuario(r: any): Usuario {
  return {
    id: Number(r.id),
    nome: String(r.nome),
    email: String(r.email),
    avatar: r.avatar ? String(r.avatar) : undefined,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toConta(r: any): Conta {
  return {
    id: Number(r.id),
    usuario_id: Number(r.usuario_id),
    nome: String(r.nome),
    saldo: Number(r.saldo),
    tipo: r.tipo as Conta['tipo'],
    ativa: Number(r.ativa) === 1,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCategoria(r: any): Categoria {
  return {
    id: Number(r.id),
    usuario_id: Number(r.usuario_id),
    nome: String(r.nome),
    tipo: r.tipo as Categoria['tipo'],
    cor: r.cor ?? undefined,
    icone: r.icone ?? undefined,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toOrcamento(r: any): Orcamento {
  return {
    id: Number(r.id),
    usuario_id: Number(r.usuario_id),
    categoria_id: Number(r.categoria_id),
    valor_planejado: Number(r.valor_planejado),
    mes: Number(r.mes),
    ano: Number(r.ano),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCartao(r: any): Cartao {
  return {
    id: Number(r.id),
    usuario_id: Number(r.usuario_id),
    nome: String(r.nome),
    valor: Number(r.valor),
    vencimento: Number(r.vencimento),
    status: r.status as Cartao['status'],
    created_at: String(r.created_at),
    updated_at: String(r.updated_at)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toParcela(r: any): Parcela {
  return {
    id: Number(r.id),
    usuario_id: Number(r.usuario_id),
    descricao: String(r.descricao),
    dia: Number(r.dia),
    cartao_id: Number(r.cartao_id),
    valor_parcela: Number(r.valor_parcela),
    quantidade_parcelas: Number(r.quantidade_parcelas),
    total: Number(r.total),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTransacaoCartao(r: any): TransacaoCartao {
  return {
    id: Number(r.id),
    usuario_id: Number(r.usuario_id),
    descricao: String(r.descricao),
    valor: Number(r.valor),
    data: String(r.data),
    cartao_id: Number(r.cartao_id),
    categoria_id: r.categoria_id != null ? Number(r.categoria_id) : undefined,
    parcelas: Number(r.parcelas),
    parcela_atual: Number(r.parcela_atual),
    grupo_parcelamento: r.grupo_parcelamento ?? undefined,
    observacoes: r.observacoes ?? undefined,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTransacaoCartaoCompleta(r: any): TransacaoCartaoCompleta {
  return {
    ...toTransacaoCartao(r),
    cartao_nome: String(r.cartao_nome),
    cartao_vencimento: Number(r.cartao_vencimento),
    categoria_nome: r.categoria_nome ?? undefined,
    categoria_cor: r.categoria_cor ?? undefined
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTransacao(r: any): Transacao {
  return {
    id: Number(r.id),
    usuario_id: Number(r.usuario_id),
    descricao: String(r.descricao),
    valor: Number(r.valor),
    tipo: r.tipo as Transacao['tipo'],
    data: String(r.data),
    conta_id: Number(r.conta_id),
    categoria_id: Number(r.categoria_id),
    observacoes: r.observacoes ?? undefined,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTransacaoCompleta(r: any): TransacaoCompleta {
  return {
    ...toTransacao(r),
    conta_nome: String(r.conta_nome),
    categoria_nome: String(r.categoria_nome),
    categoria_cor: r.categoria_cor ?? undefined
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toNota(r: any): Nota {
  return {
    id: Number(r.id),
    usuario_id: Number(r.usuario_id),
    titulo: String(r.titulo),
    conteudo: r.conteudo ?? undefined,
    data: r.data ?? undefined,
    tipo: r.tipo as Nota['tipo'],
    created_at: String(r.created_at),
    updated_at: String(r.updated_at)
  }
}

// ========== HELPERS DE CARTÃO ==========

async function recalcularValorCartao(
  db: SQLiteDBConnection,
  cartaoId: number,
  usuarioId: number
): Promise<void> {
  const res = await db.query(
    'SELECT COALESCE(SUM(valor), 0) as total FROM transacoes_cartao WHERE cartao_id = ? AND usuario_id = ?',
    [cartaoId, usuarioId]
  )
  const total = Number(res.values?.[0]?.total ?? 0)
  await db.run(
    'UPDATE cartoes SET valor = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND usuario_id = ?',
    [total, cartaoId, usuarioId]
  )
}

function calcularMesFatura(
  dataTransacao: string,
  diaVencimento: number
): { mes: number; ano: number } {
  const [ano, mes, dia] = dataTransacao.split('-').map(Number)
  const diaFechamento = diaVencimento - 6
  let mesesOffset = 0

  if (diaFechamento <= 0) {
    mesesOffset = dia < diaVencimento ? 0 : 1
  } else {
    mesesOffset = dia > diaFechamento ? 1 : 0
  }

  const dataFatura = new Date(ano, mes - 1 + mesesOffset, 1)
  return { mes: dataFatura.getMonth() + 1, ano: dataFatura.getFullYear() }
}

// ========== IMPLEMENTAÇÃO DatabaseService ==========

export const mobileDatabaseService: DatabaseService = {
  // ---------- AUTH ----------
  auth: {
    checkUserExists: () =>
      run(async (db) => {
        const res = await db.query('SELECT COUNT(*) as count FROM usuarios')
        return Number(res.values?.[0]?.count ?? 0) > 0
      }),

    register: (nome, senha) =>
      run(async (db) => {
        if (!nome?.trim()) throw new Error('Nome é obrigatório')
        if (!senha || senha.length < 4) throw new Error('Senha deve ter pelo menos 4 caracteres')

        const existing = await db.query('SELECT id FROM usuarios WHERE nome = ?', [nome.trim()])
        if (existing.values?.length) throw new Error('Já existe um usuário com esse nome')

        const passwordHash = await hashPassword(senha)
        const email = `${nome.trim().toLowerCase().replace(/\s+/g, '.')}@local`
        await db.run('INSERT INTO usuarios (nome, email, password_hash) VALUES (?, ?, ?)', [
          nome.trim(),
          email,
          passwordHash
        ])
        const row = await db.query('SELECT * FROM usuarios WHERE nome = ?', [nome.trim()])
        return toUsuario(row.values![0])
      }),

    login: (nome, senha) =>
      run(async (db) => {
        const res = await db.query('SELECT * FROM usuarios WHERE nome = ?', [nome?.trim() ?? ''])
        if (!res.values?.length) throw new Error('Nome ou senha incorretos')

        const row = res.values[0]
        const hash: string | null = row.password_hash ?? null
        if (!hash) throw new Error('Nome ou senha incorretos')

        const valid = await verifyPassword(senha, hash)
        if (!valid) throw new Error('Nome ou senha incorretos')

        return toUsuario(row)
      }),

    changePassword: (usuarioId, senhaAtual, novaSenha) =>
      run(async (db) => {
        const res = await db.query('SELECT password_hash FROM usuarios WHERE id = ?', [usuarioId])
        if (!res.values?.length) throw new Error('Usuário não encontrado')

        const hash: string | null = res.values[0].password_hash ?? null
        if (!hash) throw new Error('Usuário sem senha cadastrada')

        const valid = await verifyPassword(senhaAtual, hash)
        if (!valid) throw new Error('Senha atual incorreta')

        if (!novaSenha || novaSenha.length < 4)
          throw new Error('Nova senha deve ter pelo menos 4 caracteres')

        const novoHash = await hashPassword(novaSenha)
        await db.run(
          'UPDATE usuarios SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [novoHash, usuarioId]
        )
      })
  },

  // ---------- USUÁRIO ----------
  usuario: {
    create: (nome, email) =>
      run(async (db) => {
        await db.run('INSERT INTO usuarios (nome, email) VALUES (?, ?)', [nome, email])
        const res = await db.query('SELECT * FROM usuarios WHERE email = ?', [email])
        return toUsuario(res.values![0])
      }),

    get: (id) =>
      run(async (db) => {
        const res = await db.query('SELECT * FROM usuarios WHERE id = ?', [id])
        return res.values?.length ? toUsuario(res.values[0]) : undefined
      }),

    getByEmail: (email) =>
      run(async (db) => {
        const res = await db.query('SELECT * FROM usuarios WHERE email = ?', [email])
        return res.values?.length ? toUsuario(res.values[0]) : undefined
      })
  },

  // ---------- CONTA ----------
  conta: {
    create: (conta) =>
      run(async (db) => {
        await db.run(
          'INSERT INTO contas (usuario_id, nome, saldo, tipo, ativa) VALUES (?, ?, ?, ?, ?)',
          [conta.usuario_id, conta.nome, conta.saldo ?? 0, conta.tipo, conta.ativa ? 1 : 0]
        )
        const res = await db.query('SELECT * FROM contas ORDER BY id DESC LIMIT 1')
        return toConta(res.values![0])
      }),

    list: (usuarioId) =>
      run(async (db) => {
        const res = await db.query('SELECT * FROM contas WHERE usuario_id = ? ORDER BY nome', [
          usuarioId
        ])
        return (res.values ?? []).map(toConta)
      }),

    get: (id, usuarioId) =>
      run(async (db) => {
        const res = await db.query('SELECT * FROM contas WHERE id = ? AND usuario_id = ?', [
          id,
          usuarioId
        ])
        return res.values?.length ? toConta(res.values[0]) : undefined
      }),

    update: (id, usuarioId, updates) =>
      run(async (db) => {
        const allowed = ['nome', 'saldo', 'tipo', 'ativa']
        const entries = Object.entries(updates).filter(([k]) => allowed.includes(k))
        if (!entries.length) return false
        const fields = entries.map(([k]) => `${k} = ?`).join(', ')
        const values = entries.map(([, v]) => v)
        await db.run(
          `UPDATE contas SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND usuario_id = ?`,
          [...values, id, usuarioId]
        )
        return true
      }),

    delete: (id, usuarioId) =>
      run(async (db) => {
        await db.run('DELETE FROM contas WHERE id = ? AND usuario_id = ?', [id, usuarioId])
        return true
      })
  },

  // ---------- CATEGORIA ----------
  categoria: {
    create: (categoria) =>
      run(async (db) => {
        await db.run(
          'INSERT INTO categorias (usuario_id, nome, tipo, cor, icone) VALUES (?, ?, ?, ?, ?)',
          [
            categoria.usuario_id,
            categoria.nome,
            categoria.tipo,
            categoria.cor ?? null,
            categoria.icone ?? null
          ]
        )
        const res = await db.query('SELECT * FROM categorias ORDER BY id DESC LIMIT 1')
        return toCategoria(res.values![0])
      }),

    list: (usuarioId, tipo) =>
      run(async (db) => {
        const sql = tipo
          ? 'SELECT * FROM categorias WHERE usuario_id = ? AND tipo = ? ORDER BY nome'
          : 'SELECT * FROM categorias WHERE usuario_id = ? ORDER BY nome'
        const params = tipo ? [usuarioId, tipo] : [usuarioId]
        const res = await db.query(sql, params)
        return (res.values ?? []).map(toCategoria)
      }),

    get: (id, usuarioId) =>
      run(async (db) => {
        const res = await db.query('SELECT * FROM categorias WHERE id = ? AND usuario_id = ?', [
          id,
          usuarioId
        ])
        return res.values?.length ? toCategoria(res.values[0]) : undefined
      }),

    update: (id, usuarioId, updates) =>
      run(async (db) => {
        const allowed = ['nome', 'tipo', 'cor', 'icone']
        const entries = Object.entries(updates).filter(([k]) => allowed.includes(k))
        if (!entries.length) return false
        const fields = entries.map(([k]) => `${k} = ?`).join(', ')
        const values = entries.map(([, v]) => v)
        await db.run(
          `UPDATE categorias SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND usuario_id = ?`,
          [...values, id, usuarioId]
        )
        return true
      }),

    delete: (id, usuarioId) =>
      run(async (db) => {
        await db.run('DELETE FROM categorias WHERE id = ? AND usuario_id = ?', [id, usuarioId])
        return true
      })
  },

  // ---------- ORÇAMENTO ----------
  orcamento: {
    create: (orcamento) =>
      run(async (db) => {
        await db.run(
          'INSERT INTO orcamentos (usuario_id, categoria_id, valor_planejado, mes, ano) VALUES (?, ?, ?, ?, ?)',
          [
            orcamento.usuario_id,
            orcamento.categoria_id,
            orcamento.valor_planejado,
            orcamento.mes,
            orcamento.ano
          ]
        )
        const res = await db.query('SELECT * FROM orcamentos ORDER BY id DESC LIMIT 1')
        return toOrcamento(res.values![0])
      }),

    list: (usuarioId, mes, ano) =>
      run(async (db) => {
        let sql = 'SELECT * FROM orcamentos WHERE usuario_id = ?'
        const params: (string | number)[] = [usuarioId]
        if (mes !== undefined) {
          sql += ' AND mes = ?'
          params.push(mes)
        }
        if (ano !== undefined) {
          sql += ' AND ano = ?'
          params.push(ano)
        }
        const res = await db.query(sql, params)
        return (res.values ?? []).map(toOrcamento)
      }),

    get: (id, usuarioId) =>
      run(async (db) => {
        const res = await db.query('SELECT * FROM orcamentos WHERE id = ? AND usuario_id = ?', [
          id,
          usuarioId
        ])
        return res.values?.length ? toOrcamento(res.values[0]) : undefined
      }),

    update: (id, usuarioId, updates) =>
      run(async (db) => {
        const allowed = ['categoria_id', 'valor_planejado', 'mes', 'ano']
        const entries = Object.entries(updates).filter(([k]) => allowed.includes(k))
        if (!entries.length) return false
        const fields = entries.map(([k]) => `${k} = ?`).join(', ')
        const values = entries.map(([, v]) => v)
        await db.run(
          `UPDATE orcamentos SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND usuario_id = ?`,
          [...values, id, usuarioId]
        )
        return true
      }),

    delete: (id, usuarioId) =>
      run(async (db) => {
        await db.run('DELETE FROM orcamentos WHERE id = ? AND usuario_id = ?', [id, usuarioId])
        return true
      })
  },

  // ---------- CARTÃO ----------
  cartao: {
    create: (cartao) =>
      run(async (db) => {
        await db.run(
          'INSERT INTO cartoes (usuario_id, nome, valor, vencimento, status) VALUES (?, ?, ?, ?, ?)',
          [
            cartao.usuario_id,
            cartao.nome,
            cartao.valor ?? 0,
            cartao.vencimento,
            cartao.status ?? 'aberta'
          ]
        )
        const res = await db.query('SELECT * FROM cartoes ORDER BY id DESC LIMIT 1')
        return toCartao(res.values![0])
      }),

    list: (usuarioId) =>
      run(async (db) => {
        const res = await db.query('SELECT * FROM cartoes WHERE usuario_id = ? ORDER BY nome', [
          usuarioId
        ])
        return (res.values ?? []).map(toCartao)
      }),

    get: (id, usuarioId) =>
      run(async (db) => {
        const res = await db.query('SELECT * FROM cartoes WHERE id = ? AND usuario_id = ?', [
          id,
          usuarioId
        ])
        return res.values?.length ? toCartao(res.values[0]) : undefined
      }),

    update: (id, usuarioId, updates) =>
      run(async (db) => {
        const allowed = ['nome', 'valor', 'vencimento', 'status']
        const entries = Object.entries(updates).filter(([k]) => allowed.includes(k))
        if (!entries.length) return false
        const fields = entries.map(([k]) => `${k} = ?`).join(', ')
        const values = entries.map(([, v]) => v)
        await db.run(
          `UPDATE cartoes SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND usuario_id = ?`,
          [...values, id, usuarioId]
        )
        return true
      }),

    delete: (id, usuarioId) =>
      run(async (db) => {
        await db.run('DELETE FROM cartoes WHERE id = ? AND usuario_id = ?', [id, usuarioId])
        return true
      })
  },

  // ---------- PARCELA ----------
  parcela: {
    create: (parcela) =>
      run(async (db) => {
        await db.run(
          'INSERT INTO parcelas (usuario_id, descricao, dia, cartao_id, valor_parcela, quantidade_parcelas, total) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            parcela.usuario_id,
            parcela.descricao,
            parcela.dia,
            parcela.cartao_id,
            parcela.valor_parcela,
            parcela.quantidade_parcelas,
            parcela.total
          ]
        )
        const res = await db.query('SELECT * FROM parcelas ORDER BY id DESC LIMIT 1')
        return toParcela(res.values![0])
      }),

    list: (usuarioId) =>
      run(async (db) => {
        const res = await db.query(
          'SELECT * FROM parcelas WHERE usuario_id = ? ORDER BY created_at DESC',
          [usuarioId]
        )
        return (res.values ?? []).map(toParcela)
      }),

    get: (id, usuarioId) =>
      run(async (db) => {
        const res = await db.query('SELECT * FROM parcelas WHERE id = ? AND usuario_id = ?', [
          id,
          usuarioId
        ])
        return res.values?.length ? toParcela(res.values[0]) : undefined
      }),

    update: (id, usuarioId, updates) =>
      run(async (db) => {
        const allowed = [
          'descricao',
          'dia',
          'cartao_id',
          'valor_parcela',
          'quantidade_parcelas',
          'total'
        ]
        const entries = Object.entries(updates).filter(([k]) => allowed.includes(k))
        if (!entries.length) return false
        const fields = entries.map(([k]) => `${k} = ?`).join(', ')
        const values = entries.map(([, v]) => v)
        await db.run(
          `UPDATE parcelas SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND usuario_id = ?`,
          [...values, id, usuarioId]
        )
        return true
      }),

    delete: (id, usuarioId) =>
      run(async (db) => {
        await db.run('DELETE FROM parcelas WHERE id = ? AND usuario_id = ?', [id, usuarioId])
        return true
      })
  },

  // ---------- TRANSAÇÃO DE CARTÃO ----------
  transacaoCartao: {
    create: (transacao) =>
      run(async (db) => {
        await db.run(
          `INSERT INTO transacoes_cartao (usuario_id, descricao, valor, data, cartao_id, categoria_id,
         parcelas, parcela_atual, grupo_parcelamento, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            transacao.usuario_id,
            transacao.descricao,
            transacao.valor,
            transacao.data,
            transacao.cartao_id,
            transacao.categoria_id ?? null,
            transacao.parcelas ?? 1,
            transacao.parcela_atual ?? 1,
            transacao.grupo_parcelamento ?? null,
            transacao.observacoes ?? null
          ]
        )
        await recalcularValorCartao(db, transacao.cartao_id, transacao.usuario_id)
        const res = await db.query('SELECT * FROM transacoes_cartao ORDER BY id DESC LIMIT 1')
        return toTransacaoCartao(res.values![0])
      }),

    createParcelada: (transacao, numeroParcelas) =>
      run(async (db) => {
        const cartaoRes = await db.query('SELECT * FROM cartoes WHERE id = ? AND usuario_id = ?', [
          transacao.cartao_id,
          transacao.usuario_id
        ])
        if (!cartaoRes.values?.length) throw new Error('Cartão não encontrado')
        const cartao = toCartao(cartaoRes.values[0])

        const grupoId = `parcela-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        const valorTotal = new Decimal(transacao.valor)
        const valorBase = valorTotal.div(numeroParcelas).toDecimalPlaces(2, Decimal.ROUND_DOWN)
        const centavosRestantes = valorTotal
          .minus(valorBase.times(numeroParcelas))
          .times(100)
          .toNumber()

        const getValor = (i: number): number =>
          i <= centavosRestantes ? valorBase.plus(0.01).toNumber() : valorBase.toNumber()

        const [ano, mes, dia] = transacao.data.split('-').map(Number)
        const dataCompra = new Date(ano, mes - 1, dia)
        const diaFechamento = cartao.vencimento - 6
        const mesesOffset =
          diaFechamento <= 0 ? (dia < cartao.vencimento ? 0 : 1) : dia > diaFechamento ? 1 : 0

        await db.run('BEGIN TRANSACTION')
        try {
          for (let i = 1; i <= numeroParcelas; i++) {
            const dataParcela = new Date(dataCompra)
            dataParcela.setMonth(dataParcela.getMonth() + mesesOffset + (i - 1))
            const ultimoDia = new Date(
              dataParcela.getFullYear(),
              dataParcela.getMonth() + 1,
              0
            ).getDate()
            dataParcela.setDate(Math.min(dia, ultimoDia))
            const dataStr = [
              dataParcela.getFullYear(),
              String(dataParcela.getMonth() + 1).padStart(2, '0'),
              String(dataParcela.getDate()).padStart(2, '0')
            ].join('-')

            await db.run(
              `INSERT INTO transacoes_cartao (usuario_id, descricao, valor, data, cartao_id, categoria_id,
             parcelas, parcela_atual, grupo_parcelamento, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                transacao.usuario_id,
                `${transacao.descricao} (${i}/${numeroParcelas})`,
                getValor(i),
                dataStr,
                transacao.cartao_id,
                transacao.categoria_id ?? null,
                numeroParcelas,
                i,
                grupoId,
                transacao.observacoes ?? null
              ]
            )
          }
          await recalcularValorCartao(db, transacao.cartao_id, transacao.usuario_id)
          await db.run('COMMIT')
        } catch (err) {
          await db.run('ROLLBACK')
          throw err
        }

        const res = await db.query(
          'SELECT * FROM transacoes_cartao WHERE grupo_parcelamento = ? ORDER BY parcela_atual',
          [grupoId]
        )
        return (res.values ?? []).map(toTransacaoCartao)
      }),

    list: (usuarioId, cartaoId, mes, ano) =>
      run(async (db) => {
        let sql = `
        SELECT tc.*, c.nome as cartao_nome, c.vencimento as cartao_vencimento,
          cat.nome as categoria_nome, cat.cor as categoria_cor
        FROM transacoes_cartao tc
        JOIN cartoes c ON tc.cartao_id = c.id
        LEFT JOIN categorias cat ON tc.categoria_id = cat.id
        WHERE tc.usuario_id = ?
      `
        const params: (string | number)[] = [usuarioId]

        if (cartaoId) {
          sql += ' AND tc.cartao_id = ?'
          params.push(cartaoId)
        }

        if (mes && ano) {
          const mesAnt = mes === 1 ? 12 : mes - 1
          const anoAnt = mes === 1 ? ano - 1 : ano
          const mesProx = mes === 12 ? 1 : mes + 1
          const anoProx = mes === 12 ? ano + 1 : ano
          sql += ` AND (
          (strftime('%Y', tc.data) = ? AND strftime('%m', tc.data) = ?) OR
          (strftime('%Y', tc.data) = ? AND strftime('%m', tc.data) = ?) OR
          (strftime('%Y', tc.data) = ? AND strftime('%m', tc.data) = ?)
        )`
          params.push(
            anoAnt.toString(),
            mesAnt.toString().padStart(2, '0'),
            ano.toString(),
            mes.toString().padStart(2, '0'),
            anoProx.toString(),
            mesProx.toString().padStart(2, '0')
          )
        }

        sql += ' ORDER BY tc.data DESC, tc.created_at DESC'
        const res = await db.query(sql, params)
        let data = (res.values ?? []).map(toTransacaoCartaoCompleta)

        if (mes && ano) {
          data = data.filter((t) => {
            if (t.parcelas > 1) {
              const [y, m] = t.data.split('-').map(Number)
              return m === mes && y === ano
            }
            const f = calcularMesFatura(t.data, t.cartao_vencimento)
            return f.mes === mes && f.ano === ano
          })
        }

        return data
      }),

    get: (id, usuarioId) =>
      run(async (db) => {
        const res = await db.query(
          'SELECT * FROM transacoes_cartao WHERE id = ? AND usuario_id = ?',
          [id, usuarioId]
        )
        return res.values?.length ? toTransacaoCartao(res.values[0]) : undefined
      }),

    update: (id, usuarioId, updates) =>
      run(async (db) => {
        const allowed = [
          'descricao',
          'valor',
          'data',
          'cartao_id',
          'categoria_id',
          'parcelas',
          'parcela_atual',
          'grupo_parcelamento',
          'observacoes'
        ]
        const entries = Object.entries(updates).filter(([k]) => allowed.includes(k))
        if (!entries.length) return false

        const old = await db.query(
          'SELECT cartao_id FROM transacoes_cartao WHERE id = ? AND usuario_id = ?',
          [id, usuarioId]
        )
        if (!old.values?.length) return false
        const oldCartaoId = Number(old.values[0].cartao_id)

        const fields = entries.map(([k]) => `${k} = ?`).join(', ')
        const values = entries.map(([, v]) => v)
        await db.run(
          `UPDATE transacoes_cartao SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND usuario_id = ?`,
          [...values, id, usuarioId]
        )

        await recalcularValorCartao(db, oldCartaoId, usuarioId)
        const newCartaoId = updates.cartao_id
        if (newCartaoId && newCartaoId !== oldCartaoId) {
          await recalcularValorCartao(db, newCartaoId, usuarioId)
        }
        return true
      }),

    delete: (id, usuarioId) =>
      run(async (db) => {
        const res = await db.query(
          'SELECT cartao_id FROM transacoes_cartao WHERE id = ? AND usuario_id = ?',
          [id, usuarioId]
        )
        if (!res.values?.length) return false
        const cartaoId = Number(res.values[0].cartao_id)
        await db.run('DELETE FROM transacoes_cartao WHERE id = ? AND usuario_id = ?', [
          id,
          usuarioId
        ])
        await recalcularValorCartao(db, cartaoId, usuarioId)
        return true
      })
  },

  // ---------- TRANSAÇÃO ----------
  transacao: {
    create: (transacao) =>
      run(async (db) => {
        await db.run(
          'INSERT INTO transacoes (usuario_id, descricao, valor, tipo, data, conta_id, categoria_id, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            transacao.usuario_id,
            transacao.descricao,
            transacao.valor,
            transacao.tipo,
            transacao.data,
            transacao.conta_id,
            transacao.categoria_id,
            transacao.observacoes ?? null
          ]
        )
        const res = await db.query('SELECT * FROM transacoes ORDER BY id DESC LIMIT 1')
        return toTransacao(res.values![0])
      }),

    list: (usuarioId, limit) =>
      run(async (db) => {
        let sql = `
        SELECT t.*, ct.nome as conta_nome, cat.nome as categoria_nome, cat.cor as categoria_cor
        FROM transacoes t
        JOIN contas ct ON t.conta_id = ct.id
        JOIN categorias cat ON t.categoria_id = cat.id
        WHERE t.usuario_id = ?
        ORDER BY t.data DESC, t.created_at DESC
      `
        const params: (string | number)[] = [usuarioId]
        if (limit && limit > 0) {
          sql += ' LIMIT ?'
          params.push(limit)
        }
        const res = await db.query(sql, params)
        return (res.values ?? []).map(toTransacaoCompleta)
      }),

    listPaginated: (usuarioId, page = 1, pageSize = 50) =>
      run(async (db) => {
        const safePage = Math.max(1, page)
        const safeSize = Math.min(Math.max(1, pageSize), 100)
        const offset = (safePage - 1) * safeSize

        const countRes = await db.query(
          'SELECT COUNT(*) as total FROM transacoes WHERE usuario_id = ?',
          [usuarioId]
        )
        const total = Number(countRes.values?.[0]?.total ?? 0)
        const totalPages = Math.ceil(total / safeSize)

        const dataRes = await db.query(
          `SELECT t.*, ct.nome as conta_nome, cat.nome as categoria_nome, cat.cor as categoria_cor
         FROM transacoes t
         JOIN contas ct ON t.conta_id = ct.id
         JOIN categorias cat ON t.categoria_id = cat.id
         WHERE t.usuario_id = ?
         ORDER BY t.data DESC, t.created_at DESC LIMIT ? OFFSET ?`,
          [usuarioId, safeSize, offset]
        )

        const data: PaginatedResult<TransacaoCompleta> = {
          data: (dataRes.values ?? []).map(toTransacaoCompleta),
          pagination: {
            page: safePage,
            pageSize: safeSize,
            total,
            totalPages,
            hasNext: safePage < totalPages,
            hasPrev: safePage > 1
          }
        }
        return data
      }),

    get: (id, usuarioId) =>
      run(async (db) => {
        const res = await db.query('SELECT * FROM transacoes WHERE id = ? AND usuario_id = ?', [
          id,
          usuarioId
        ])
        return res.values?.length ? toTransacao(res.values[0]) : undefined
      }),

    update: (id, usuarioId, updates) =>
      run(async (db) => {
        const allowed = [
          'descricao',
          'valor',
          'tipo',
          'data',
          'conta_id',
          'categoria_id',
          'observacoes'
        ]
        const entries = Object.entries(updates).filter(([k]) => allowed.includes(k))
        if (!entries.length) return false
        const fields = entries.map(([k]) => `${k} = ?`).join(', ')
        const values = entries.map(([, v]) => v)
        await db.run(
          `UPDATE transacoes SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND usuario_id = ?`,
          [...values, id, usuarioId]
        )
        return true
      }),

    delete: (id, usuarioId) =>
      run(async (db) => {
        await db.run('DELETE FROM transacoes WHERE id = ? AND usuario_id = ?', [id, usuarioId])
        return true
      })
  },

  // ---------- NOTA ----------
  nota: {
    create: (nota) =>
      run(async (db) => {
        const tipo = nota.tipo ?? 'outro'
        const res = await db.run(
          'INSERT INTO notas (usuario_id, titulo, conteudo, data, tipo) VALUES (?, ?, ?, ?, ?)',
          [nota.usuario_id, nota.titulo, nota.conteudo ?? null, nota.data ?? null, tipo]
        )
        const lastId = res.changes?.lastId
        const row = await db.query('SELECT * FROM notas WHERE id = ?', [lastId])
        return toNota(row.values![0])
      }),

    list: (usuarioId) =>
      run(async (db) => {
        const res = await db.query(
          `SELECT * FROM notas WHERE usuario_id = ?
         ORDER BY CASE WHEN data IS NULL THEN 1 ELSE 0 END, data ASC, created_at DESC`,
          [usuarioId]
        )
        return (res.values ?? []).map(toNota)
      }),

    update: (id, usuarioId, updates) =>
      run(async (db) => {
        const fields: string[] = []
        const params: unknown[] = []
        if (updates.titulo !== undefined) {
          fields.push('titulo = ?')
          params.push(updates.titulo)
        }
        if (updates.conteudo !== undefined) {
          fields.push('conteudo = ?')
          params.push(updates.conteudo ?? null)
        }
        if (updates.data !== undefined) {
          fields.push('data = ?')
          params.push(updates.data ?? null)
        }
        if (updates.tipo !== undefined) {
          fields.push('tipo = ?')
          params.push(updates.tipo)
        }
        if (!fields.length) return false
        fields.push('updated_at = CURRENT_TIMESTAMP')
        await db.run(`UPDATE notas SET ${fields.join(', ')} WHERE id = ? AND usuario_id = ?`, [
          ...params,
          id,
          usuarioId
        ])
        return true
      }),

    delete: (id, usuarioId) =>
      run(async (db) => {
        await db.run('DELETE FROM notas WHERE id = ? AND usuario_id = ?', [id, usuarioId])
        return true
      })
  },

  // ---------- RELATÓRIO ----------
  relatorio: {
    getResumo: (usuarioId, dataInicio, dataFim) =>
      run(async (db) => {
        let sql = `
        SELECT
          COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) as receita,
          COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) as despesa
        FROM transacoes WHERE usuario_id = ?
      `
        const params: (string | number)[] = [usuarioId]
        if (dataInicio) {
          sql += ' AND data >= ?'
          params.push(dataInicio)
        }
        if (dataFim) {
          sql += ' AND data <= ?'
          params.push(dataFim)
        }

        const res = await db.query(sql, params)
        const r = res.values?.[0] ?? { receita: 0, despesa: 0 }
        const receita = Number(r.receita)
        const despesa = Number(r.despesa)
        const result: ResumoFinanceiro = { receita, despesa, saldo: receita - despesa }
        return result
      })
  },

  // ---------- DATABASE ----------
  database: {
    clear: () =>
      run(async (db) => {
        await db.run('BEGIN TRANSACTION')
        try {
          await db.run('DELETE FROM transacoes_cartao')
          await db.run('DELETE FROM transacoes')
          await db.run('DELETE FROM parcelas')
          await db.run('DELETE FROM orcamentos')
          await db.run('DELETE FROM cartoes')
          await db.run('DELETE FROM categorias')
          await db.run('DELETE FROM contas')
          await db.run(
            `DELETE FROM sqlite_sequence WHERE name IN ('transacoes_cartao','transacoes','parcelas','orcamentos','cartoes','categorias','contas')`
          )
          await db.run('COMMIT')
        } catch (err) {
          await db.run('ROLLBACK')
          throw err
        }
      })
  }
}
