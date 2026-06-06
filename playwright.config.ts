import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.spec.ts',
  outputDir: 'e2e/test-results',
  globalSetup: 'e2e/global-setup.ts',
  globalTeardown: 'e2e/global-teardown.ts',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 1,
  fullyParallel: false,

  use: {
    baseURL: 'http://localhost:3000',
    storageState: '.auth/state.json',
    testIdAttribute: 'data-test-id',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev:local',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
});
