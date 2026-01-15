// test/e2e/electron-helper.ts
// Helper para iniciar aplicação Electron nos testes E2E

import { _electron as electron, ElectronApplication, Page } from '@playwright/test';
import * as path from 'path';

export interface ElectronTestContext {
  app: ElectronApplication;
  page: Page;
}

/**
 * Inicia a aplicação Electron para testes
 */
export async function launchElectronApp(): Promise<ElectronTestContext> {
  // Caminho para o main.js compilado
  const mainPath = path.join(__dirname, '../../dist/main/main.js');

  // Iniciar aplicação Electron
  const app = await electron.launch({
    args: [mainPath],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });

  // Aguardar a janela principal abrir
  const page = await app.firstWindow();

  // Aguardar o app carregar completamente
  await page.waitForLoadState('domcontentloaded');

  // Aguardar um pouco mais para garantir que o app inicializou
  await page.waitForTimeout(1000);

  return { app, page };
}

/**
 * Fecha a aplicação Electron
 */
export async function closeElectronApp(app: ElectronApplication): Promise<void> {
  await app.close();
}

/**
 * Helper para aguardar elemento estar visível
 */
export async function waitForElement(page: Page, selector: string, timeout = 5000): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Helper para clicar em elemento de navegação
 */
export async function navigateTo(page: Page, pageName: string): Promise<void> {
  const navButton = page.locator(`[data-page="${pageName}"]`);
  await navButton.click();
  await page.waitForTimeout(300); // Aguardar transição
}

/**
 * Helper para preencher campo de texto
 */
export async function fillInput(page: Page, selector: string, value: string): Promise<void> {
  const input = page.locator(selector);
  await input.fill(value);
}

/**
 * Helper para selecionar opção de dropdown
 */
export async function selectOption(page: Page, selector: string, value: string): Promise<void> {
  const select = page.locator(selector);
  await select.selectOption(value);
}

/**
 * Helper para verificar se toast de sucesso apareceu
 */
export async function expectSuccessToast(page: Page): Promise<void> {
  const toast = page.locator('.toast.success');
  await toast.waitFor({ state: 'visible', timeout: 5000 });
}

/**
 * Helper para verificar se toast de erro apareceu
 */
export async function expectErrorToast(page: Page): Promise<void> {
  const toast = page.locator('.toast.error');
  await toast.waitFor({ state: 'visible', timeout: 5000 });
}

/**
 * Helper para fechar modal
 */
export async function closeModal(page: Page): Promise<void> {
  const closeButton = page.locator('.modal-close, .btn-cancel');
  if (await closeButton.isVisible()) {
    await closeButton.first().click();
    await page.waitForTimeout(300);
  }
}

/**
 * Helper para confirmar dialog
 */
export async function confirmDialog(page: Page): Promise<void> {
  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });
}
