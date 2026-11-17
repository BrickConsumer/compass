import { defineConfig } from '@playwright/test';

/** Set by GitHub Actions. A CI runner has no graphics card and is slower than a laptop. */
const ci = !!process.env.CI;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  // a test left as test.only would quietly skip every other test
  forbidOnly: ci,
  reporter: ci ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1320, height: 900 },
    // PW_CHANNEL=chrome runs the suite in an installed Chrome, so no test browser has to be downloaded
    channel: process.env.PW_CHANNEL,
    // with no graphics card, Chrome only draws WebGL in software when told it may; without this the sea would stay a still picture
    launchOptions: ci ? { args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : undefined,
  },
  webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: !ci, timeout: 120_000 },
});
