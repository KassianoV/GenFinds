import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração do Playwright para testes E2E do GenFinds
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Diretório onde os testes estão localizados
  testDir: './test/e2e',

  // Timeout para cada teste (30 segundos)
  timeout: 30 * 1000,

  // Timeout para assertions (5 segundos)
  expect: {
    timeout: 5000,
  },

  // Executar testes em paralelo
  fullyParallel: true,

  // Falhar o build se houver testes marcados com .only()
  forbidOnly: !!process.env.CI,

  // Número de tentativas em caso de falha (0 = sem retry)
  retries: process.env.CI ? 2 : 0,

  // Número de workers (processos paralelos)
  workers: process.env.CI ? 1 : undefined,

  // Reporter: lista para desenvolvimento, html para CI
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  // Configurações compartilhadas para todos os testes
  use: {
    // URL base para testes (não aplicável para Electron)
    // baseURL: 'http://localhost:3000',

    // Coletar traces em caso de falha
    trace: 'on-first-retry',

    // Screenshot em caso de falha
    screenshot: 'only-on-failure',

    // Vídeo em caso de falha
    video: 'retain-on-failure',

    // Timeout para ações (10 segundos)
    actionTimeout: 10 * 1000,
  },

  // Configurar diferentes browsers/devices para testes
  projects: [
    {
      name: 'electron',
      use: {
        ...devices['Desktop Chrome'],
        // Configurações específicas do Electron serão adicionadas nos testes
      },
    },
  ],

  // Pasta para artefatos de teste
  outputDir: 'test-results/artifacts',
});
