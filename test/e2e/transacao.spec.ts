import { test, expect } from '@playwright/test'
import { launchApp, doLogin } from './helpers/app'
import type { ElectronApplication } from '@playwright/test'

let app: ElectronApplication

test.beforeAll(async () => {
  const launched = await launchApp()
  app = launched.app
  await doLogin(launched.page)
})

test.afterAll(async () => {
  await app.close()
})

test('navega para tela de transações', async () => {
  const page = await app.firstWindow()
  await page.getByRole('link', { name: 'Transações' }).click()
  await expect(page).toHaveURL(/transacoes/, { timeout: 5000 })
})

test('botão Nova abre modal de nova transação', async () => {
  const page = await app.firstWindow()
  await page.getByRole('button', { name: 'Nova' }).click()
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
})

test('cria transação de despesa e aparece na listagem', async () => {
  const page = await app.firstWindow()

  // Abre modal (pode já estar aberto do teste anterior)
  const dialogVisible = await page.getByRole('dialog').isVisible().catch(() => false)
  if (!dialogVisible) {
    await page.getByRole('button', { name: 'Nova' }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
  }

  await page.getByRole('button', { name: 'Despesa' }).click()
  await page.getByPlaceholder('Ex: Supermercado, Salário...').fill('Mercado E2E')
  await page.getByLabel('Valor (R$)').fill('150')
  await page.getByRole('button', { name: 'Criar transação' }).click()

  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })
  await expect(page.getByText('Mercado E2E')).toBeVisible({ timeout: 5000 })
})

test('transação criada aparece no dashboard', async () => {
  const page = await app.firstWindow()
  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page.getByText('Mercado E2E')).toBeVisible({ timeout: 5000 })
})
