// Dev helper: screenshots of a URL at phone and desktop width. Usage: node scripts/shot.mjs <url> <name> [--full]
import { chromium } from '@playwright/test';
const [url, name, ...flags] = process.argv.slice(2);
const full = flags.includes('--full');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [label, width, height] of [['mobile', 390, 844], ['desktop', 1440, 900]]) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('PAGEERROR', e.message));
  page.on('console', (m) => m.type() === 'error' && console.error('CONSOLE', m.text()));
  page.on('requestfailed', (r) => console.error('FAILED', r.url(), r.failure()?.errorText));
  page.on('response', (r) => r.status() >= 400 && console.error('HTTP', r.status(), r.url()));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `.impeccable/review/${name}-${label}.png`, fullPage: full });
  await page.close();
}
await browser.close();
