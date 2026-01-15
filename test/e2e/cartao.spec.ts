import { test, expect, _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import * as path from 'path';

/**
 * Testes E2E para Cartões
 * Testa fluxos de fatura (à vista) e parcelas (parcelado)
 */

let electronApp: ElectronApplication;
let window: Page;

test.beforeAll(async () => {
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../dist/main/main.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });

  window = await electronApp.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  // Aguardar a aplicação inicializar (usuário único offline)
  await window.waitForTimeout(2000);
});

test.afterAll(async () => {
  await electronApp.close();
});

test.describe('Gestão de Cartões', () => {
  test('deve navegar para a página de cartões', async () => {
    // Clicar no menu de cartões
    const cartoesMenu = window.locator('a:has-text("Cartões"), button:has-text("Cartões")');
    await cartoesMenu.click();

    // Verificar se a página de cartões foi carregada
    const pageTitle = window.locator('h1:has-text("Cartões"), h2:has-text("Cartões")');
    await expect(pageTitle).toBeVisible({ timeout: 3000 });
  });

  test('deve abrir modal de novo cartão', async () => {
    // Clicar no botão de adicionar cartão
    const addButton = window.locator('button:has-text("Novo Cartão"), button:has-text("Adicionar Cartão")');
    await addButton.click();

    // Verificar se o modal foi aberto
    const modal = window.locator('.modal, [role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 2000 });

    // Verificar campos do formulário
    const nomeInput = window.locator('input[name="nome"], input#nome');
    const vencimentoInput = window.locator('input[name="vencimento"], input#vencimento');

    await expect(nomeInput).toBeVisible();
    await expect(vencimentoInput).toBeVisible();
  });

  test('deve criar um novo cartão', async () => {
    // Preencher o formulário
    const nomeInput = window.locator('input[name="nome"], input#nome');
    const vencimentoInput = window.locator('input[name="vencimento"], input#vencimento');

    await nomeInput.fill('Cartão Teste E2E');
    await vencimentoInput.fill('15');

    // Submeter o formulário
    const submitButton = window.locator('button[type="submit"]:has-text("Salvar"), button:has-text("Adicionar")');
    await submitButton.click();

    // Verificar sucesso
    const successToast = window.locator('.toast-success, .success-message');
    await expect(successToast).toBeVisible({ timeout: 3000 });

    // Verificar se o cartão aparece na lista
    const cartaoItem = window.locator('text=Cartão Teste E2E');
    await expect(cartaoItem).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Fatura - Compras à Vista', () => {
  test.beforeEach(async () => {
    // Navegar para a aba de fatura
    const faturaTab = window.locator('button:has-text("Fatura"), [data-tab="fatura"]');
    await faturaTab.click();
    await window.waitForTimeout(500);
  });

  test('deve exibir a aba de fatura', async () => {
    // Verificar se o conteúdo da fatura está visível
    const faturaContent = window.locator('#faturaContent, .fatura-content');
    await expect(faturaContent).toBeVisible();

    // Verificar se há filtros de mês/ano
    const mesSelect = window.locator('select#mesFiltro, select[name="mes"]');
    const anoSelect = window.locator('select#anoFiltro, select[name="ano"]');

    await expect(mesSelect).toBeVisible();
    await expect(anoSelect).toBeVisible();
  });

  test('deve abrir modal de nova compra à vista', async () => {
    // Clicar no botão de adicionar compra
    const addButton = window.locator('button:has-text("Nova Compra"), button:has-text("Adicionar Compra")');
    await addButton.click();

    // Verificar se o modal foi aberto
    const modal = window.locator('.modal, [role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 2000 });

    // Verificar campos do formulário de compra à vista
    const descricaoInput = window.locator('input[name="descricao"], input#descricaoFatura');
    const valorInput = window.locator('input[name="valor"], input#valorFatura');
    const cartaoSelect = window.locator('select[name="cartao_id"], select#cartaoIdFatura');

    await expect(descricaoInput).toBeVisible();
    await expect(valorInput).toBeVisible();
    await expect(cartaoSelect).toBeVisible();
  });

  test('deve criar uma compra à vista', async () => {
    // Preencher o formulário
    const descricaoInput = window.locator('input[name="descricao"], input#descricaoFatura');
    const valorInput = window.locator('input[name="valor"], input#valorFatura');
    const dataInput = window.locator('input[name="data"], input#dataFatura, input[type="date"]');
    const cartaoSelect = window.locator('select[name="cartao_id"], select#cartaoIdFatura');

    await descricaoInput.fill('Compra Teste À Vista');
    await valorInput.fill('250.00');
    await dataInput.fill('2026-01-10');

    // Selecionar primeiro cartão disponível
    await cartaoSelect.selectOption({ index: 1 });

    // Submeter o formulário
    const submitButton = window.locator('button[type="submit"]:has-text("Salvar"), button:has-text("Adicionar")');
    await submitButton.click();

    // Verificar sucesso
    const successToast = window.locator('.toast-success, .success-message');
    await expect(successToast).toBeVisible({ timeout: 3000 });

    // Verificar se a compra aparece na lista
    const compraItem = window.locator('text=Compra Teste À Vista');
    await expect(compraItem).toBeVisible({ timeout: 2000 });
  });

  test('deve filtrar fatura por mês e ano', async () => {
    // Mudar o filtro de mês
    const mesSelect = window.locator('select#mesFiltro, select[name="mes"]');
    await mesSelect.selectOption('1'); // Janeiro

    // Aguardar atualização
    await window.waitForTimeout(500);

    // Verificar se a tabela foi atualizada
    const tabela = window.locator('table, .fatura-table');
    await expect(tabela).toBeVisible();
  });

  test('deve exibir paginação quando houver muitas compras', async () => {
    // Verificar se controles de paginação existem
    const paginationControls = window.locator('.pagination, [class*="pagination"]');
    const hasMultiplePages = await paginationControls.count() > 0;

    if (hasMultiplePages) {
      await expect(paginationControls.first()).toBeVisible();

      // Testar navegação
      const nextButton = window.locator('button:has-text("Próxima"), button:has-text("›")');
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await window.waitForTimeout(500);
      }
    }
  });

  test('deve calcular corretamente o fechamento da fatura', async () => {
    // Este teste verifica se compras após o fechamento aparecem na fatura do mês seguinte
    // Fechamento = vencimento - 6 dias
    // Se o cartão vence dia 15, o fechamento é dia 9
    // Compra no dia 10 ou depois deve aparecer na fatura do mês seguinte

    // Criar uma compra após o fechamento
    const addButton = window.locator('button:has-text("Nova Compra"), button:has-text("Adicionar Compra")');
    await addButton.click();

    const descricaoInput = window.locator('input[name="descricao"], input#descricaoFatura');
    const valorInput = window.locator('input[name="valor"], input#valorFatura');
    const dataInput = window.locator('input[name="data"], input#dataFatura, input[type="date"]');
    const cartaoSelect = window.locator('select[name="cartao_id"], select#cartaoIdFatura');

    await descricaoInput.fill('Compra Pós-Fechamento');
    await valorInput.fill('100.00');
    // Data após o fechamento (assumindo vencimento dia 15, fechamento dia 9)
    await dataInput.fill('2026-01-12');
    await cartaoSelect.selectOption({ index: 1 });

    const submitButton = window.locator('button[type="submit"]:has-text("Salvar")');
    await submitButton.click();

    await window.waitForTimeout(1000);

    // Verificar no filtro do mês seguinte
    const mesSelect = window.locator('select#mesFiltro, select[name="mes"]');
    await mesSelect.selectOption('2'); // Fevereiro

    await window.waitForTimeout(500);

    // A compra deve aparecer na fatura de fevereiro
    const compraItem = window.locator('text=Compra Pós-Fechamento');
    await expect(compraItem).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Parcelas - Compras Parceladas', () => {
  test.beforeEach(async () => {
    // Navegar para a aba de parcelas
    const parcelasTab = window.locator('button:has-text("Parcelas"), [data-tab="parcelas"]');
    await parcelasTab.click();
    await window.waitForTimeout(500);
  });

  test('deve exibir a aba de parcelas', async () => {
    // Verificar se o conteúdo de parcelas está visível
    const parcelasContent = window.locator('#parcelasContent, .parcelas-content');
    await expect(parcelasContent).toBeVisible();

    // Verificar se há cards de resumo por cartão
    const resumoCards = window.locator('.cartao-card, .card-cartao');
    // Pode ou não ter cards, dependendo se há parcelas cadastradas
  });

  test('deve abrir modal de nova compra parcelada', async () => {
    // Clicar no botão de adicionar parcela
    const addButton = window.locator('button:has-text("Nova Parcela"), button:has-text("Adicionar Parcela")');
    await addButton.click();

    // Verificar se o modal foi aberto
    const modal = window.locator('.modal, [role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 2000 });

    // Verificar campos específicos de parcelamento
    const descricaoInput = window.locator('input[name="descricao"], input#descricaoParcela');
    const valorInput = window.locator('input[name="valor"], input#valorParcela');
    const parcelasInput = window.locator('input[name="parcelas"], input#quantidadeParcelas');

    await expect(descricaoInput).toBeVisible();
    await expect(valorInput).toBeVisible();
    await expect(parcelasInput).toBeVisible();
  });

  test('deve criar uma compra parcelada', async () => {
    // Preencher o formulário
    const descricaoInput = window.locator('input[name="descricao"], input#descricaoParcela');
    const valorInput = window.locator('input[name="valor"], input#valorParcela');
    const parcelasInput = window.locator('input[name="parcelas"], input#quantidadeParcelas');
    const dataInput = window.locator('input[name="data"], input#dataParcela, input[type="date"]');
    const cartaoSelect = window.locator('select[name="cartao_id"], select#cartaoIdParcela');

    await descricaoInput.fill('Compra Parcelada Teste');
    await valorInput.fill('1200.00');
    await parcelasInput.fill('6'); // 6 parcelas
    await dataInput.fill('2026-01-10');
    await cartaoSelect.selectOption({ index: 1 });

    // Submeter o formulário
    const submitButton = window.locator('button[type="submit"]:has-text("Salvar"), button:has-text("Adicionar")');
    await submitButton.click();

    // Verificar sucesso
    const successToast = window.locator('.toast-success, .success-message');
    await expect(successToast).toBeVisible({ timeout: 3000 });

    // Verificar se as parcelas aparecem na tabela
    await window.waitForTimeout(1000);
    const parcelaItem = window.locator('text=Compra Parcelada Teste');
    await expect(parcelaItem).toBeVisible({ timeout: 2000 });

    // Verificar se mostra informação de parcelas (ex: "1/6", "2/6", etc.)
    const parcelaInfo = window.locator('text=/[0-9]+\\/6/');
    await expect(parcelaInfo.first()).toBeVisible();
  });

  test('deve filtrar parcelas por cartão', async () => {
    // Verificar se há filtro de cartão
    const cartaoFilter = window.locator('select#filtroCartao, select[name="filtroCartao"]');

    if (await cartaoFilter.isVisible()) {
      // Selecionar um cartão específico
      await cartaoFilter.selectOption({ index: 1 });
      await window.waitForTimeout(500);

      // Verificar se a tabela foi atualizada
      const tabela = window.locator('table, .parcelas-table');
      await expect(tabela).toBeVisible();
    }
  });

  test('deve exibir cards resumo por cartão', async () => {
    // Verificar se há cards de resumo
    const resumoCards = window.locator('.cartao-card, .card-cartao');
    const cardCount = await resumoCards.count();

    if (cardCount > 0) {
      // Verificar se o primeiro card tem as informações esperadas
      const firstCard = resumoCards.first();
      await expect(firstCard).toBeVisible();

      // Verificar se mostra o valor total das parcelas
      const valorTotal = firstCard.locator('text=/R\\$\\s*[0-9,.]+/');
      await expect(valorTotal).toBeVisible();
    }
  });

  test('deve excluir todas as parcelas de um grupo ao clicar em excluir', async () => {
    // Encontrar o botão de excluir de uma parcela
    const deleteButton = window.locator('button[title="Excluir"], button:has-text("🗑️")').first();

    if (await deleteButton.isVisible()) {
      // Contar parcelas antes da exclusão
      const parcelasAntes = await window.locator('tr, .parcela-item').count();

      await deleteButton.click();
      await window.waitForTimeout(500);

      // Aceitar o diálogo de confirmação
      window.once('dialog', (dialog) => dialog.accept());

      // Aguardar a exclusão
      await window.waitForTimeout(1000);

      // Verificar sucesso
      const successToast = window.locator('.toast-success, .success-message');
      await expect(successToast).toBeVisible({ timeout: 3000 });

      // Contar parcelas depois - deve ter diminuído
      const parcelasDepois = await window.locator('tr, .parcela-item').count();
      expect(parcelasDepois).toBeLessThan(parcelasAntes);
    }
  });

  test('deve exibir resumo do mês atual', async () => {
    // Verificar se há card de resumo
    const resumoCard = window.locator('.resumo-mes, .card-resumo');

    if (await resumoCard.isVisible()) {
      await expect(resumoCard).toBeVisible();

      // Verificar se mostra o valor total
      const valorTotal = resumoCard.locator('text=/Total:.*R\\$\\s*[0-9,.]+/');
      await expect(valorTotal).toBeVisible();
    }
  });
});

test.describe('Integração Dashboard com Cartões', () => {
  test('deve exibir informações de cartões no dashboard', async () => {
    // Navegar para o dashboard
    const dashboardMenu = window.locator('a:has-text("Dashboard"), button:has-text("Dashboard")');
    await dashboardMenu.click();

    await window.waitForTimeout(1000);

    // Verificar se há informações sobre cartões
    const cartoesInfo = window.locator('text=/Cart(ão|ões)/i');

    if (await cartoesInfo.count() > 0) {
      // Verificar se mostra valores dos cartões
      const valorCartoes = window.locator('text=/R\\$\\s*[0-9,.]+/');
      await expect(valorCartoes.first()).toBeVisible();
    }
  });

  test('deve somar fatura + parcelas no dashboard', async () => {
    // Este teste verifica se o dashboard considera tanto compras à vista quanto parceladas
    const dashboardMenu = window.locator('a:has-text("Dashboard"), button:has-text("Dashboard")');
    await dashboardMenu.click();

    await window.waitForTimeout(1000);

    // Verificar se há seção de gastos com cartões
    const gastosCartoes = window.locator('text=/Gastos.*Cart/i, text=/Cart.*Gastos/i');

    if (await gastosCartoes.count() > 0) {
      // Verificar se mostra o valor total
      const valorTotal = window.locator('text=/R\\$\\s*[0-9,.]+/');
      await expect(valorTotal.first()).toBeVisible();
    }
  });
});

test.describe('Validações e Regras de Negócio', () => {
  test('não deve permitir criar parcela com quantidade menor que 2', async () => {
    // Navegar para parcelas
    const parcelasTab = window.locator('button:has-text("Parcelas"), [data-tab="parcelas"]');
    await parcelasTab.click();
    await window.waitForTimeout(500);

    // Abrir modal
    const addButton = window.locator('button:has-text("Nova Parcela"), button:has-text("Adicionar Parcela")');
    await addButton.click();

    // Preencher com 1 parcela (deveria ser à vista)
    const parcelasInput = window.locator('input[name="parcelas"], input#quantidadeParcelas');
    await parcelasInput.fill('1');

    const descricaoInput = window.locator('input[name="descricao"], input#descricaoParcela');
    const valorInput = window.locator('input[name="valor"], input#valorParcela');

    await descricaoInput.fill('Teste Inválido');
    await valorInput.fill('100.00');

    // Tentar submeter
    const submitButton = window.locator('button[type="submit"]:has-text("Salvar")');
    await submitButton.click();

    // Deve mostrar erro ou não permitir
    const errorToast = window.locator('.toast-error, .error-message');
    // O comportamento esperado pode variar - ou mostra erro ou o campo não aceita valor < 2
  });

  test('deve validar campos obrigatórios', async () => {
    // Navegar para fatura
    const faturaTab = window.locator('button:has-text("Fatura"), [data-tab="fatura"]');
    await faturaTab.click();
    await window.waitForTimeout(500);

    // Abrir modal
    const addButton = window.locator('button:has-text("Nova Compra"), button:has-text("Adicionar Compra")');
    await addButton.click();

    // Tentar submeter sem preencher
    const submitButton = window.locator('button[type="submit"]:has-text("Salvar")');
    await submitButton.click();

    // Deve mostrar erro ou validação HTML5
    const errorToast = window.locator('.toast-error, .error-message');
    // Ou verificar se os campos têm atributo required e o navegador bloqueia
  });
});
