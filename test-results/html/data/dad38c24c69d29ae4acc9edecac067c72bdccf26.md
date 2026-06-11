# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: transacao.spec.ts >> navega para tela de transações
- Location: test\e2e\transacao.spec.ts:17:5

# Error details

```
Error: page.waitForURL: Target page, context or browser has been closed
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Test source

```ts
  1  | import { _electron as electron } from '@playwright/test'
  2  | import type { ElectronApplication, Page } from '@playwright/test'
  3  | import path from 'path'
  4  | 
  5  | const DIST_MAIN = path.join(process.cwd(), 'dist-electron/main/index.js')
  6  | 
  7  | export const TEST_USER = { nome: 'Teste', senha: 'Ts@0128&' }
  8  | 
  9  | export async function launchApp(): Promise<{ app: ElectronApplication; page: Page }> {
  10 |   const app = await electron.launch({ args: [DIST_MAIN] })
  11 |   const page = await app.firstWindow()
  12 |   await page.waitForLoadState('domcontentloaded')
  13 |   await page.waitForSelector('form', { timeout: 10000 })
  14 |   return { app, page }
  15 | }
  16 | 
  17 | export async function doLogin(page: Page, nome = TEST_USER.nome, senha = TEST_USER.senha): Promise<void> {
  18 |   await page.waitForSelector('form', { timeout: 10000 })
  19 | 
  20 |   const isRegisterMode = await page
  21 |     .getByPlaceholder('Mínimo 8 caracteres')
  22 |     .isVisible()
  23 |     .catch(() => false)
  24 | 
  25 |   if (isRegisterMode) {
  26 |     await page.getByPlaceholder('Seu nome').fill(nome)
  27 |     await page.getByPlaceholder('Mínimo 8 caracteres').fill(senha)
  28 |     await page.getByPlaceholder('Repita a senha').fill(senha)
  29 |     await page.getByRole('button', { name: /criar conta/i }).click()
  30 |   } else {
  31 |     await page.getByPlaceholder('Seu nome').fill(nome)
  32 |     await page.getByPlaceholder('Sua senha').fill(senha)
  33 |     await page.getByRole('button', { name: 'Entrar' }).click()
  34 |   }
  35 | 
> 36 |   await page.waitForURL(/dashboard/, { timeout: 10000 })
     |              ^ Error: page.waitForURL: Target page, context or browser has been closed
  37 | }
  38 | 
  39 | export async function doLogout(page: Page): Promise<void> {
  40 |   await page.getByRole('link', { name: /configurar/i }).click()
  41 |   await page.waitForURL(/configurar/, { timeout: 5000 })
  42 |   await page.getByRole('button', { name: 'Sair da conta' }).click()
  43 |   await page.waitForSelector('form', { timeout: 8000 })
  44 | }
  45 | 
```