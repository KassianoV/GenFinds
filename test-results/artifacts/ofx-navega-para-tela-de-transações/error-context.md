# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ofx.spec.ts >> navega para tela de transações
- Location: test\e2e\ofx.spec.ts:20:5

# Error details

```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - button [ref=e4]:
      - img [ref=e5]
    - generic [ref=e11]:
      - generic [ref=e12]:
        - img "GenFinds" [ref=e13]
        - generic [ref=e14]:
          - heading "GenFinds" [level=1] [ref=e15]
          - paragraph [ref=e16]: Entre na sua conta
      - generic [ref=e17]:
        - generic [ref=e18]:
          - text: Nome
          - textbox "Nome" [ref=e19]:
            - /placeholder: Seu nome
            - text: Teste
        - generic [ref=e20]:
          - text: Senha
          - generic [ref=e21]:
            - textbox "Senha" [ref=e22]:
              - /placeholder: Sua senha
              - text: Ts@0128&
            - button [ref=e23]:
              - img [ref=e24]
        - button "Entrar" [ref=e27]
        - paragraph [ref=e28]:
          - text: Não tem conta?
          - button "Criar conta" [ref=e29]
  - region "Notifications alt+T"
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
     |              ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
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