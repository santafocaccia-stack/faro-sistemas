import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false, // secuencial para no crear datos sucios en paralelo
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'e2e/report', open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
  },

  projects: [
    /* Setup: login una vez y guarda la sesión */
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    /* Suite principal — reutiliza la sesión del setup */
    {
      name: 'gesto',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/session.json',
      },
      dependencies: ['setup'],
    },
  ],
});
