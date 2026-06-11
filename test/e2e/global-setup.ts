import initSqlJs from 'sql.js'
import * as bcrypt from 'bcrypt'
import { rmSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import os from 'os'

const TEST_USER = { nome: 'Teste', senha: 'Ts@0128&' }

export default async function globalSetup(): Promise<void> {
  const appData = process.env.APPDATA ?? join(os.homedir(), 'AppData', 'Roaming')
  const dbDir = join(appData, 'genfinds')
  const dbPath = join(dbDir, 'financas.db')

  // 1. Remove banco existente
  if (existsSync(dbPath)) {
    rmSync(dbPath)
    console.log(`\n[E2E Setup] Banco removido: ${dbPath}`)
  }

  // 2. Cria novo banco com o usuário de teste diretamente (sem UI)
  //    Usa a mesma biblioteca (sql.js + bcrypt) que o app usa internamente
  const SQL = await initSqlJs()
  const db = new SQL.Database()

  db.run(`
    CREATE TABLE usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const passwordHash = bcrypt.hashSync(TEST_USER.senha, 12)
  const email = `${TEST_USER.nome.trim().toLowerCase()}@local`

  db.run('INSERT INTO usuarios (nome, email, password_hash) VALUES (?, ?, ?)', [
    TEST_USER.nome,
    email,
    passwordHash,
  ])

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }
  writeFileSync(dbPath, db.export())
  db.close()

  console.log(`\n[E2E Setup] Usuário "${TEST_USER.nome}" pré-criado em ${dbPath}`)
  console.log('[E2E Setup] Pronto — app iniciará em modo LOGIN.\n')
}
