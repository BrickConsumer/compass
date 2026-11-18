import { defineConfig } from '@playwright/test';

/** Set by GitHub Actions. A CI runner has no graphics card and is slower than a laptop. */
const ci = !!process.env.CI;

/**
 * The tests have a dev server of their own, on its own port, started fresh for each run.
 * They used to borrow the one already open on 5173. Under five browsers at once that server has been seen to crash
 * part-way through a run, and every test after it then failed at once. A fresh server on another port cannot be the
 * one a person has open, and is never one that has been running for hours.
 */
const PORT = 5174, URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  // a test left as test.only would quietly skip every other test
  forbidOnly: ci,
  reporter: ci ? [['github'], ['list']] : 'list',
  use: {
    baseURL: URL,
    viewport: { width: 1320, height: 900 },
    // PW_THEME=dark runs the whole suite as a device set to dark would see the app, which is how the dark theme is held to the same tests
    colorScheme: process.env.PW_THEME === 'dark' ? 'dark' : 'light',
    // PW_CHANNEL=chrome runs the suite in an installed Chrome, so no test browser has to be downloaded
    channel: process.env.PW_CHANNEL,
    // with no graphics card, Chrome only draws WebGL in software when told it may; without this the sea would stay a still picture
    launchOptions: ci ? { args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : undefined,
  },
  webServer: { command: `npm run dev -- --port ${PORT}`, url: URL, reuseExistingServer: false, timeout: 120_000 },
});
