import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45_000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4400',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://127.0.0.1:4400',
      reuseExistingServer: true,
    },
    {
      command: 'npx vite build --logLevel error && npm run preview',
      url: 'http://127.0.0.1:4401',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
