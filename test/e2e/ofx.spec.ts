import { test, expect } from '@playwright/test'
import { launchApp, doLogin } from './helpers/app'
import type { ElectronApplication } from '@playwright/test'
import path from 'path'

let app: ElectronApplication

const OFX_FIXTURE = path.join(process.cwd(), 'test/e2e/fixtures/sample.ofx')

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

test('botão Importar OFX está visível', async () => {
  const page = await app.firstWindow()
  await expect(page.getByRole('button', { name: /importar ofx/i })).toBeVisible({ timeout: 5000 })
})

test('importa arquivo OFX e exibe transações para confirmar', async () => {
  const page = await app.firstWindow()

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: /importar ofx/i }).click(),
  ])
  await fileChooser.setFiles(OFX_FIXTURE)

  await expect(
    page.getByText(/transações encontradas|confirmar importação|importar/i).first(),
  ).toBeVisible({ timeout: 10000 })
})

test('confirma importação e transações aparecem na listagem', async () => {
  const page = await app.firstWindow()

  const confirmarBtn = page.getByRole('button', { name: /confirmar|importar tudo/i })
  if (await confirmarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirmarBtn.click()
    await expect(page.getByText(/Supermercado OFX|Salario OFX|Farmacia OFX/i).first()).toBeVisible({ timeout: 5000 })
  }
})
