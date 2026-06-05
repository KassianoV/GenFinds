import { bcrypt as hashBcryptFn, bcryptVerify } from 'hash-wasm'

const COST_FACTOR = 12
const SALT_BYTES = 16

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  return hashBcryptFn({ password, salt, costFactor: COST_FACTOR, outputType: 'encoded' })
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptVerify({ password, hash })
}
