import { _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import path from 'path'

const DIST_MAIN = path.join(process.cwd(), 'dist-electron/main/index.js')

export const TEST_USER = { nome: 'Teste', senha: 'Ts@0128&' }

export async function launchApp(): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({ args: [DIST_MAIN] })
  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForSelector('form', { timeout: 10000 })
  return { app, page }
}

export async function doLogin(page: Page, nome = TEST_USER.nome, senha = TEST_USER.senha): Promise<void> {
  await page.waitForSelector('form', { timeout: 10000 })

  const isRegisterMode = await page
    .getByPlaceholder('Mínimo 8 caracteres')
    .isVisible()
    .catch(() => false)

  if (isRegisterMode) {
    await page.getByPlaceholder('Seu nome').fill(nome)
    await page.getByPlaceholder('Mínimo 8 caracteres').fill(senha)
    await page.getByPlaceholder('Repita a senha').fill(senha)
    await page.getByRole('button', { name: /criar conta/i }).click()
  } else {
    await page.getByPlaceholder('Seu nome').fill(nome)
    await page.getByPlaceholder('Sua senha').fill(senha)
    await page.getByRole('button', { name: 'Entrar' }).click()
  }

  await page.waitForURL(/dashboard/, { timeout: 10000 })
}

export async function doLogout(page: Page): Promise<void> {
  await page.getByRole('link', { name: /configurar/i }).click()
  await page.waitForURL(/configurar/, { timeout: 5000 })
  await page.getByRole('button', { name: 'Sair da conta' }).click()
  await page.waitForSelector('form', { timeout: 8000 })
}
