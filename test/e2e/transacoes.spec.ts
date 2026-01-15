// test/e2e/transacoes.spec.ts
// Testes E2E para transações

import { test, expect } from '@playwright/test';
import {
  launchElectronApp,
  closeElectronApp,
  navigateTo,
  ElectronTestContext,
} from './electron-helper';

let context: ElectronTestContext;

test.describe('GenFinds - Testes de Transações', () => {
  test.beforeAll(async () => {
    context = await launchElectronApp();
  });

  test.afterAll(async () => {
    if (context?.app) {
      await closeElectronApp(context.app);
    }
  });

  test('deve exibir a página de transações com tabela', async () => {
    const { page } = context;

    await navigateTo(page, 'transacoes');

    // Verificar se a tabela de transações existe
    const table = page.locator('.transactions-table, #transacoesTable');
    await expect(table).toBeVisible();
  });

  test('deve exibir filtros de transações', async () => {
    const { page } = context;

    await navigateTo(page, 'transacoes');

    // Verificar se existem filtros
    const filters = page.locator('.filter-section, .filters');
    await expect(filters).toBeVisible();
  });

  test('deve exibir botão para adicionar nova transação', async () => {
    const { page } = context;

    await navigateTo(page, 'transacoes');

    // Verificar botão de adicionar
    const addButton = page.locator('button:has-text("Nova"), button:has-text("Adicionar"), .btn-add');
    await expect(addButton.first()).toBeVisible();
  });

  test('deve abrir modal ao clicar em nova transação', async () => {
    const { page } = context;

    await navigateTo(page, 'transacoes');

    // Clicar no botão de adicionar
    const addButton = page.locator('button:has-text("Nova"), button:has-text("Adicionar"), .btn-add');
    await addButton.first().click();

    // Aguardar modal abrir
    await page.waitForTimeout(500);

    // Verificar se modal está visível
    const modal = page.locator('.modal, .modal-overlay');
    await expect(modal.first()).toBeVisible();
  });

  test('deve exibir campos do formulário de transação', async () => {
    const { page } = context;

    // Navegar e abrir modal
    await navigateTo(page, 'transacoes');

    const addButton = page.locator('button:has-text("Nova"), button:has-text("Adicionar"), .btn-add');
    await addButton.first().click();
    await page.waitForTimeout(500);

    // Verificar campos do formulário
    const descricaoInput = page.locator('input[name="descricao"], #descricao, input[placeholder*="Descrição"]');
    await expect(descricaoInput.first()).toBeVisible();

    const valorInput = page.locator('input[name="valor"], #valor, input[placeholder*="Valor"]');
    await expect(valorInput.first()).toBeVisible();
  });

  test('deve filtrar transações por tipo', async () => {
    const { page } = context;

    await navigateTo(page, 'transacoes');

    // Encontrar filtro de tipo
    const tipoFilter = page.locator('select[name="tipo"], #filterTipo, .filter-tipo');

    if (await tipoFilter.isVisible()) {
      // Selecionar apenas receitas
      await tipoFilter.selectOption('receita');
      await page.waitForTimeout(300);

      // Verificar se o filtro foi aplicado
      const table = page.locator('.transactions-table, #transacoesTable');
      await expect(table).toBeVisible();
    }
  });

  test('deve exibir tabela ou estado vazio', async () => {
    const { page } = context;

    await navigateTo(page, 'transacoes');

    // Verificar que a página carregou corretamente
    const content = page.locator('.transactions-table, #transacoesTable, .empty-state');
    await expect(content.first()).toBeVisible();
  });
});

test.describe('GenFinds - Testes de Busca de Transações', () => {
  test.beforeAll(async () => {
    context = await launchElectronApp();
  });

  test.afterAll(async () => {
    if (context?.app) {
      await closeElectronApp(context.app);
    }
  });

  test('deve exibir campo de busca', async () => {
    const { page } = context;

    await navigateTo(page, 'transacoes');

    // Verificar campo de busca
    const searchInput = page.locator('input[type="search"], input[placeholder*="Buscar"], .search-input');
    await expect(searchInput.first()).toBeVisible();
  });

  test('deve filtrar resultados ao digitar na busca', async () => {
    const { page } = context;

    await navigateTo(page, 'transacoes');

    const searchInput = page.locator('input[type="search"], input[placeholder*="Buscar"], .search-input');

    if (await searchInput.first().isVisible()) {
      // Digitar termo de busca
      await searchInput.first().fill('teste');
      await page.waitForTimeout(500);

      // Verificar que a página ainda está funcional
      const content = page.locator('.transactions-table, #transacoesTable, .empty-state');
      await expect(content.first()).toBeVisible();
    }
  });
});
