import { test, expect } from '@playwright/test'
import { launchApp, TEST_USER } from './helpers/app'
import type { ElectronApplication } from '@playwright/test'

let app: ElectronApplication

test.beforeAll(async () => {
  const launched = await launchApp()
  app = launched.app
})

test.afterAll(async () => {
  await app.close()
})

test('exibe form de autenticação ao iniciar', async () => {
  const page = await app.firstWindow()
  await expect(page.getByPlaceholder('Seu nome')).toBeVisible({ timeout: 5000 })
})

test('campos vazios exibem erros de validação', async () => {
  const page = await app.firstWindow()
  const isLoginMode = await page.getByPlaceholder('Sua senha').isVisible().catch(() => false)
  if (!isLoginMode) return

  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.locator('.text-destructive').first()).toBeVisible({ timeout: 3000 })
})

test('senha errada exibe toast de erro', async () => {
  const page = await app.firstWindow()
  const isLoginMode = await page.getByPlaceholder('Sua senha').isVisible().catch(() => false)
  if (!isLoginMode) return

  await page.getByPlaceholder('Seu nome').fill(TEST_USER.nome)
  await page.getByPlaceholder('Sua senha').fill('senhaerrada99')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.locator('[data-sonner-toast], li[data-visible="true"]').first()).toBeVisible({ timeout: 5000 })
})

// Deve ser o último — muda o estado do app para logado
test('login válido redireciona ao dashboard', async () => {
  const page = await app.firstWindow()
  await page.waitForSelector('form', { timeout: 5000 })

  const isRegisterMode = await page.getByPlaceholder('Mínimo 8 caracteres').isVisible().catch(() => false)

  if (isRegisterMode) {
    await page.getByPlaceholder('Seu nome').fill(TEST_USER.nome)
    await page.getByPlaceholder('Mínimo 8 caracteres').fill(TEST_USER.senha)
    await page.getByPlaceholder('Repita a senha').fill(TEST_USER.senha)
    await page.getByRole('button', { name: /criar conta/i }).click()
  } else {
    await page.getByPlaceholder('Seu nome').fill(TEST_USER.nome)
    await page.getByPlaceholder('Sua senha').fill(TEST_USER.senha)
    await page.getByRole('button', { name: 'Entrar' }).click()
  }

  await expect(page).toHaveURL(/dashboard/, { timeout: 10000 })
})
