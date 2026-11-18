import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  // PW_CHANNEL=chrome runs the suite in an installed Chrome, so no test browser has to be downloaded
  use: { baseURL: 'http://localhost:5173', viewport: { width: 1320, height: 900 }, channel: process.env.PW_CHANNEL },
  webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true },
});
