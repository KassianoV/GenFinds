// test/e2e/app.spec.ts
// Testes E2E para a aplicação GenFinds

import { test, expect } from '@playwright/test';
import {
  launchElectronApp,
  closeElectronApp,
  navigateTo,
  waitForElement,
  ElectronTestContext,
} from './electron-helper';

let context: ElectronTestContext;

test.describe('GenFinds - Testes de Inicialização', () => {
  test.beforeAll(async () => {
    context = await launchElectronApp();
  });

  test.afterAll(async () => {
    if (context?.app) {
      await closeElectronApp(context.app);
    }
  });

  test('deve iniciar a aplicação corretamente', async () => {
    const { page } = context;

    // Verificar título da janela
    const title = await page.title();
    expect(title).toContain('Genfins');
  });

  test('deve exibir o header com o nome do app', async () => {
    const { page } = context;

    // Verificar se o header está visível
    const appName = page.locator('.app-name');
    await expect(appName).toBeVisible();
    await expect(appName).toHaveText('GenFins');
  });

  test('deve exibir a sidebar com menu de navegação', async () => {
    const { page } = context;

    // Verificar se a sidebar está visível
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();

    // Verificar itens do menu
    const navItems = page.locator('.nav-item');
    const count = await navItems.count();
    expect(count).toBeGreaterThanOrEqual(4); // Dashboard, Transação, Cartão, Relatório
  });

  test('deve exibir a versão do app', async () => {
    const { page } = context;

    const version = page.locator('.app-version');
    await expect(version).toBeVisible();
    const versionText = await version.textContent();
    expect(versionText).toMatch(/v\d+\.\d+\.\d+/); // Ex: v1.6.4
  });
});

test.describe('GenFinds - Testes de Navegação', () => {
  test.beforeAll(async () => {
    context = await launchElectronApp();
  });

  test.afterAll(async () => {
    if (context?.app) {
      await closeElectronApp(context.app);
    }
  });

  test('deve navegar para a página Dashboard', async () => {
    const { page } = context;

    await navigateTo(page, 'dashboard');

    // Verificar se a página Dashboard está visível
    const dashboardPage = page.locator('#dashboard-page');
    await expect(dashboardPage).toBeVisible();

    // Verificar cards de resumo
    const summaryCards = page.locator('.summary-card-dash');
    const count = await summaryCards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('deve navegar para a página Transações', async () => {
    const { page } = context;

    await navigateTo(page, 'transacoes');

    // Verificar se a página Transações está visível
    const transacoesPage = page.locator('#transacoes-page');
    await expect(transacoesPage).toBeVisible();
  });

  test('deve navegar para a página Cartão', async () => {
    const { page } = context;

    await navigateTo(page, 'cartao');

    // Verificar se a página Cartão está visível
    const cartaoPage = page.locator('#cartao-page');
    await expect(cartaoPage).toBeVisible();
  });

  test('deve navegar para a página Relatório', async () => {
    const { page } = context;

    await navigateTo(page, 'relatorio');

    // Verificar se a página Relatório está visível
    const relatorioPage = page.locator('#relatorio-page');
    await expect(relatorioPage).toBeVisible();
  });

  test('deve navegar para a página Configurar', async () => {
    const { page } = context;

    await navigateTo(page, 'configurar');

    // Verificar se a página Configurar está visível
    const configurarPage = page.locator('#configurar-page');
    await expect(configurarPage).toBeVisible();
  });

  test('deve destacar o item de menu ativo', async () => {
    const { page } = context;

    // Navegar para Dashboard
    await navigateTo(page, 'dashboard');

    // Verificar se o item está ativo
    const activeItem = page.locator('.nav-item.active[data-page="dashboard"]');
    await expect(activeItem).toBeVisible();
  });
});

test.describe('GenFinds - Testes de Dashboard', () => {
  test.beforeAll(async () => {
    context = await launchElectronApp();
  });

  test.afterAll(async () => {
    if (context?.app) {
      await closeElectronApp(context.app);
    }
  });

  test('deve exibir o card de Patrimônio Líquido', async () => {
    const { page } = context;

    await navigateTo(page, 'dashboard');

    const patrimonioCard = page.locator('#dashSaldoTotal');
    await expect(patrimonioCard).toBeVisible();

    // Verificar formato de moeda
    const text = await patrimonioCard.textContent();
    expect(text).toMatch(/R\$\s*[\d.,]+/);
  });

  test('deve exibir o card de Receita Mensal', async () => {
    const { page } = context;

    const receitaCard = page.locator('#dashReceitaMes');
    await expect(receitaCard).toBeVisible();
  });

  test('deve exibir o card de Despesas Mensal', async () => {
    const { page } = context;

    const despesaCard = page.locator('#dashDespesaMes');
    await expect(despesaCard).toBeVisible();
  });

  test('deve exibir o gráfico de evolução mensal', async () => {
    const { page } = context;

    const chart = page.locator('#dashboardChart');
    await expect(chart).toBeVisible();
  });

  test('deve exibir seção de últimas transações', async () => {
    const { page } = context;

    const recentSection = page.locator('.dashboard-recent');
    await expect(recentSection).toBeVisible();
  });
});
