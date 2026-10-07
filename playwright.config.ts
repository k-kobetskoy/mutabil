/**
 * End-to-end tests (decisions D25, D27): the real pages in a browser, desktop and phone, with axe
 * for accessibility. Locally they reuse a running `pnpm dev` (or start one); CI runs them against
 * the production build. PW_CHANNEL=msedge uses the system Edge instead of a downloaded Chromium.
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3000);
const CI = !!process.env.CI;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // the dev server compiles pages on first hit; one worker keeps that predictable
  workers: CI ? 2 : 1,
  retries: CI ? 1 : 0,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'ro-RO',
    timezoneId: 'Europe/Bucharest',
    channel: process.env.PW_CHANNEL || undefined,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: CI ? 'pnpm start' : 'pnpm dev',
    url: `http://localhost:${PORT}/ro`,
    reuseExistingServer: !CI,
    timeout: 240_000,
    // runners may carry the machine name in HOSTNAME; the standalone server must listen on all
    // interfaces (see scripts/start-standalone.sh)
    env: { HOSTNAME: '0.0.0.0', PORT: String(PORT) },
  },
});
