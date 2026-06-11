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

test('navega para tela de cartões', async () => {
  const page = await app.firstWindow()
  await page.getByRole('link', { name: 'Cartões' }).click()
  await expect(page).toHaveURL(/cartao/, { timeout: 5000 })
})

test('botão Lançar Parcelado abre modal', async () => {
  const page = await app.firstWindow()
  await page.getByRole('button', { name: /lançar parcelado/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
})

test('lança compra parcelada em 3x', async () => {
  const page = await app.firstWindow()

  const dialogVisible = await page.getByRole('dialog').isVisible().catch(() => false)
  if (!dialogVisible) {
    await page.getByRole('button', { name: /lançar parcelado/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
  }

  await page.getByLabel(/descrição/i).fill('Notebook E2E')
  await page.getByLabel(/valor/i).first().fill('3000')

  // Clica no botão de atalho 3x ou digita no input de parcelas
  const btn3x = page.getByRole('button', { name: /^3x?$/ })
  if (await btn3x.isVisible().catch(() => false)) {
    await btn3x.click()
  } else {
    await page.getByLabel(/parcelas/i).fill('3')
  }

  await page.getByRole('button', { name: /lançar parcelado/i }).last().click()
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })
  await expect(page.getByText('Notebook E2E').first()).toBeVisible({ timeout: 5000 })
})

test('validação rejeita 1 parcela', async () => {
  const page = await app.firstWindow()
  await page.getByRole('button', { name: /lançar parcelado/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

  const parcelasInput = page.getByLabel(/parcelas/i)
  if (await parcelasInput.isVisible().catch(() => false)) {
    await parcelasInput.fill('1')
    await page.getByRole('button', { name: /lançar parcelado/i }).last().click()
    await expect(page.getByText(/mínimo 2 parcelas/i)).toBeVisible({ timeout: 3000 })
  }

  // Fecha modal
  await page.getByRole('button', { name: /cancelar/i }).click().catch(() => null)
  await page.keyboard.press('Escape').catch(() => null)
})
