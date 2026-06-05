import { hashPassword, verifyPassword } from '../auth/hashPassword'
import type {
  Usuario,
  ServiceResult,
  PaginatedResult,
  TransacaoCompleta,
  ResumoFinanceiro,
} from '../../../types/database.types'
import type { DatabaseService } from './types'

const STORAGE_KEY = 'genfinds-web-db'

interface WebDb {
  usuarios: Array<{
    id: number
    nome: string
    email: string
    password_hash: string
    created_at: string
    updated_at: string
  }>
  nextId: number
}

function loadDb(): WebDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as WebDb
  } catch {}
  return { usuarios: [], nextId: 1 }
}

function saveDb(db: WebDb): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

function ok<T>(data: T): ServiceResult<T> {
  return { success: true, data }
}

function toUsuario(r: WebDb['usuarios'][0]): Usuario {
  return {
    id: r.id,
    nome: r.nome,
    email: r.email,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }
}

const emptyPage: PaginatedResult<TransacaoCompleta> = {
  data: [],
  pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
}

const emptyResumo: ResumoFinanceiro = { receita: 0, despesa: 0, saldo: 0 }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function noop(): Promise<ServiceResult<any>> {
  return Promise.resolve(ok(undefined))
}

export const webDatabaseService: DatabaseService = {
  auth: {
    checkUserExists: async (): Promise<ServiceResult<boolean>> => {
      return ok(loadDb().usuarios.length > 0)
    },

    register: async (nome: string, senha: string): Promise<ServiceResult<Usuario>> => {
      if (!nome?.trim()) return { success: false, error: 'Nome é obrigatório' }
      if (!senha || senha.length < 4)
        return { success: false, error: 'Senha deve ter pelo menos 4 caracteres' }
      const db = loadDb()
      if (db.usuarios.find((u) => u.nome.toLowerCase() === nome.trim().toLowerCase())) {
        return { success: false, error: 'Já existe um usuário com esse nome' }
      }
      const now = new Date().toISOString()
      const password_hash = await hashPassword(senha)
      const user = {
        id: db.nextId++,
        nome: nome.trim(),
        email: `${nome.trim().toLowerCase().replace(/\s+/g, '.')}@local`,
        password_hash,
        created_at: now,
        updated_at: now,
      }
      db.usuarios.push(user)
      saveDb(db)
      return ok(toUsuario(user))
    },

    login: async (nome: string, senha: string): Promise<ServiceResult<Usuario>> => {
      const db = loadDb()
      const user = db.usuarios.find(
        (u) => u.nome.toLowerCase() === (nome?.trim() ?? '').toLowerCase(),
      )
      if (!user) return { success: false, error: 'Nome ou senha incorretos' }
      const valid = await verifyPassword(senha, user.password_hash)
      if (!valid) return { success: false, error: 'Nome ou senha incorretos' }
      return ok(toUsuario(user))
    },

    changePassword: async (
      usuarioId: number,
      senhaAtual: string,
      novaSenha: string,
    ): Promise<ServiceResult<void>> => {
      const db = loadDb()
      const user = db.usuarios.find((u) => u.id === usuarioId)
      if (!user) return { success: false, error: 'Usuário não encontrado' }
      const valid = await verifyPassword(senhaAtual, user.password_hash)
      if (!valid) return { success: false, error: 'Senha atual incorreta' }
      if (!novaSenha || novaSenha.length < 4)
        return { success: false, error: 'Nova senha deve ter pelo menos 4 caracteres' }
      user.password_hash = await hashPassword(novaSenha)
      user.updated_at = new Date().toISOString()
      saveDb(db)
      return ok(undefined)
    },
  },

  usuario: {
    create: async (nome, email) => {
      const db = loadDb()
      const now = new Date().toISOString()
      const user = { id: db.nextId++, nome, email, password_hash: '', created_at: now, updated_at: now }
      db.usuarios.push(user)
      saveDb(db)
      return ok(toUsuario(user))
    },
    get: async (id) => {
      const user = loadDb().usuarios.find((u) => u.id === id)
      return ok(user ? toUsuario(user) : undefined)
    },
    getByEmail: async (email) => {
      const user = loadDb().usuarios.find((u) => u.email === email)
      return ok(user ? toUsuario(user) : undefined)
    },
  },

  conta: {
    create: noop,
    list: async () => ok([]),
    get: async () => ok(undefined),
    update: async () => ok(false),
    delete: async () => ok(false),
  },

  categoria: {
    create: noop,
    list: async () => ok([]),
    get: async () => ok(undefined),
    update: async () => ok(false),
    delete: async () => ok(false),
  },

  orcamento: {
    create: noop,
    list: async () => ok([]),
    get: async () => ok(undefined),
    update: async () => ok(false),
    delete: async () => ok(false),
  },

  cartao: {
    create: noop,
    list: async () => ok([]),
    get: async () => ok(undefined),
    update: async () => ok(false),
    delete: async () => ok(false),
  },

  parcela: {
    create: noop,
    list: async () => ok([]),
    get: async () => ok(undefined),
    update: async () => ok(false),
    delete: async () => ok(false),
  },

  transacaoCartao: {
    create: noop,
    createParcelada: async () => ok([]),
    list: async () => ok([]),
    get: async () => ok(undefined),
    update: async () => ok(false),
    delete: async () => ok(false),
  },

  transacao: {
    create: noop,
    list: async () => ok([]),
    listPaginated: async () => ok(emptyPage),
    get: async () => ok(undefined),
    update: async () => ok(false),
    delete: async () => ok(false),
  },

  nota: {
    create: noop,
    list: async () => ok([]),
    update: async () => ok(false),
    delete: async () => ok(false),
  },

  relatorio: {
    getResumo: async () => ok(emptyResumo),
  },

  database: {
    clear: async () => {
      const db = loadDb()
      db.usuarios = []
      db.nextId = 1
      saveDb(db)
      return ok(undefined)
    },
  },
}
