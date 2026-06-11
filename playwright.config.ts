import { defineConfig } from '@playwright/test'

export default defineConfig({
  globalSetup: './test/e2e/global-setup.ts',
  testDir: './test/e2e',
  timeout: 30000,
  workers: 1,
  fullyParallel: false,
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 10000,
  },
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['list'],
  ],
  outputDir: 'test-results/artifacts',
})
