import { test, expect } from '@playwright/test'
import { launchApp, doLogin, doLogout, TEST_USER } from './helpers/app'
import type { ElectronApplication } from '@playwright/test'

let app: ElectronApplication

const SENHA_NOVA = 'NovaSenha@456'

test.beforeAll(async () => {
  const launched = await launchApp()
  app = launched.app
  await doLogin(launched.page)
})

test.afterAll(async () => {
  await app.close()
})

test('navega para configurações', async () => {
  const page = await app.firstWindow()
  await page.getByRole('link', { name: 'Configurar' }).click()
  await expect(page).toHaveURL(/configurar/, { timeout: 5000 })
})

test('altera senha com sucesso', async () => {
  const page = await app.firstWindow()
  await page.getByLabel('Senha atual').fill(TEST_USER.senha)
  await page.getByLabel('Nova senha').fill(SENHA_NOVA)
  await page.getByLabel('Confirmar nova senha').fill(SENHA_NOVA)
  await page.getByRole('button', { name: 'Alterar senha' }).click()
  await expect(page.locator('[data-sonner-toast], li[data-visible="true"]').first()).toBeVisible({ timeout: 5000 })
})

test('logout e login com nova senha funciona', async () => {
  const page = await app.firstWindow()
  await doLogout(page)

  await page.getByPlaceholder('Seu nome').fill(TEST_USER.nome)
  await page.getByPlaceholder('Sua senha').fill(SENHA_NOVA)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/dashboard/, { timeout: 10000 })
})

test('login com senha antiga falha após alteração', async () => {
  const page = await app.firstWindow()
  await doLogout(page)

  await page.getByPlaceholder('Seu nome').fill(TEST_USER.nome)
  await page.getByPlaceholder('Sua senha').fill(TEST_USER.senha)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.locator('[data-sonner-toast], li[data-visible="true"]').first()).toBeVisible({ timeout: 5000 })
})

// Restaura a senha original para não quebrar outros runs
test('restaura senha original', async () => {
  const page = await app.firstWindow()

  // Faz login com a nova senha
  await page.getByPlaceholder('Seu nome').fill(TEST_USER.nome)
  await page.getByPlaceholder('Sua senha').fill(SENHA_NOVA)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/dashboard/, { timeout: 10000 })

  // Navega para configurar e restaura
  await page.getByRole('link', { name: 'Configurar' }).click()
  await page.getByLabel('Senha atual').fill(SENHA_NOVA)
  await page.getByLabel('Nova senha').fill(TEST_USER.senha)
  await page.getByLabel('Confirmar nova senha').fill(TEST_USER.senha)
  await page.getByRole('button', { name: 'Alterar senha' }).click()
  await expect(page.locator('[data-sonner-toast], li[data-visible="true"]').first()).toBeVisible({ timeout: 5000 })
})
