# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> login válido redireciona ao dashboard
- Location: test\e2e\login.spec.ts:42:5

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /dashboard/
Received string:  "file:///E:/Documentos%20importantes/Projeto/Projeto%20-%20GenFinds/dist/index.html#/auth"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    23 × unexpected value "file:///E:/Documentos%20importantes/Projeto/Projeto%20-%20GenFinds/dist/index.html#/auth"

```

```yaml
- button:
  - img
- img "GenFinds"
- heading "GenFinds" [level=1]
- paragraph: Entre na sua conta
- text: Nome
- textbox "Nome":
  - /placeholder: Seu nome
  - text: Teste
- text: Senha
- textbox "Senha":
  - /placeholder: Sua senha
  - text: Ts@0128&
- button:
  - img
- button "Entrar"
- paragraph:
  - text: Não tem conta?
  - button "Criar conta"
- region "Notifications alt+T"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | import { launchApp, TEST_USER } from './helpers/app'
  3  | import type { ElectronApplication } from '@playwright/test'
  4  | 
  5  | let app: ElectronApplication
  6  | 
  7  | test.beforeAll(async () => {
  8  |   const launched = await launchApp()
  9  |   app = launched.app
  10 | })
  11 | 
  12 | test.afterAll(async () => {
  13 |   await app.close()
  14 | })
  15 | 
  16 | test('exibe form de autenticação ao iniciar', async () => {
  17 |   const page = await app.firstWindow()
  18 |   await expect(page.getByPlaceholder('Seu nome')).toBeVisible({ timeout: 5000 })
  19 | })
  20 | 
  21 | test('campos vazios exibem erros de validação', async () => {
  22 |   const page = await app.firstWindow()
  23 |   const isLoginMode = await page.getByPlaceholder('Sua senha').isVisible().catch(() => false)
  24 |   if (!isLoginMode) return
  25 | 
  26 |   await page.getByRole('button', { name: 'Entrar' }).click()
  27 |   await expect(page.locator('.text-destructive').first()).toBeVisible({ timeout: 3000 })
  28 | })
  29 | 
  30 | test('senha errada exibe toast de erro', async () => {
  31 |   const page = await app.firstWindow()
  32 |   const isLoginMode = await page.getByPlaceholder('Sua senha').isVisible().catch(() => false)
  33 |   if (!isLoginMode) return
  34 | 
  35 |   await page.getByPlaceholder('Seu nome').fill(TEST_USER.nome)
  36 |   await page.getByPlaceholder('Sua senha').fill('senhaerrada99')
  37 |   await page.getByRole('button', { name: 'Entrar' }).click()
  38 |   await expect(page.locator('[data-sonner-toast], li[data-visible="true"]').first()).toBeVisible({ timeout: 5000 })
  39 | })
  40 | 
  41 | // Deve ser o último — muda o estado do app para logado
  42 | test('login válido redireciona ao dashboard', async () => {
  43 |   const page = await app.firstWindow()
  44 |   await page.waitForSelector('form', { timeout: 5000 })
  45 | 
  46 |   const isRegisterMode = await page.getByPlaceholder('Mínimo 8 caracteres').isVisible().catch(() => false)
  47 | 
  48 |   if (isRegisterMode) {
  49 |     await page.getByPlaceholder('Seu nome').fill(TEST_USER.nome)
  50 |     await page.getByPlaceholder('Mínimo 8 caracteres').fill(TEST_USER.senha)
  51 |     await page.getByPlaceholder('Repita a senha').fill(TEST_USER.senha)
  52 |     await page.getByRole('button', { name: /criar conta/i }).click()
  53 |   } else {
  54 |     await page.getByPlaceholder('Seu nome').fill(TEST_USER.nome)
  55 |     await page.getByPlaceholder('Sua senha').fill(TEST_USER.senha)
  56 |     await page.getByRole('button', { name: 'Entrar' }).click()
  57 |   }
  58 | 
> 59 |   await expect(page).toHaveURL(/dashboard/, { timeout: 10000 })
     |                      ^ Error: expect(page).toHaveURL(expected) failed
  60 | })
  61 | 
```