// Full-page screenshots of the main screens at 1440 and 390 px, for layout review.
//   pnpm shots                       all screens
//   pnpm shots landing rezultat      only these
// Needs a running server (pnpm dev) on BASE_URL (default http://localhost:3000).
// PW_CHANNEL=msedge uses the system Edge instead of a downloaded Chromium.
// Output: test-results/shots/<name>-d.png (desktop) and <name>-m.png (phone).
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = path.resolve('test-results/shots');

// A detailed draft with every step answered: items listed one by one, crates, an onsite survey,
// so the result leads with the guaranteed maximum and the survey step shows the crates path.
const ORDER = {
  v: 1,
  mode: 'detailed',
  taskType: 'apartment',
  size: { presetId: 'apartament-2-camere' },
  from: {
    zoneId: 'gheorgheni',
    floor: 4,
    elevator: 'medium',
    furnitureInLift: 'yes',
    carry: 'lt10',
    parking: 'atEntrance',
    stairs: 'normal',
  },
  to: { zoneId: 'zorilor', floor: 6, elevator: 'large', furnitureInLift: 'yes', carry: '10to30', parking: 'nearby', stairs: 'normal' },
  inventory: {
    mode: 'list',
    items: {
      'wardrobe-2-door': 1,
      'bed-double-frame': 1,
      'mattress-double': 1,
      'sofa-3-seat': 1,
      'dining-table': 1,
      'dining-chair': 4,
      tv: 1,
      'washing-machine': 1,
      'fridge-standard': 1,
      desk: 1,
      'kallax-2x4': 2,
    },
    boxes: 35,
    kallaxInserts: 8,
  },
  packing: { who: 'self', containers: 'crates', mattressBagsDouble: 1, tvProtection: 1 },
  assembly: { items: { 'wardrobe-2-door': 1, 'bed-double-frame': 1 } },
  protection: { level: 'basic' },
  survey: { method: 'onsite' },
  schedule: { date: inTwoWeeks(), slot: 'morning' },
};

const PAGES = {
  landing: '/ro',
  explain: '/ro', // landing with "Ce include prețul?" opened
  en: '/en',
  tarife: '/ro/tarife',
  vizita: '/ro/vizita', // after submitting the empty form, so errors show
  'ce-mutam': '/ro/estimare/ce-mutam',
  acces: '/ro/estimare/acces',
  'ce-transportam': '/ro/estimare/ce-transportam',
  servicii: '/ro/estimare/servicii',
  evaluare: '/ro/estimare/evaluare',
  data: '/ro/estimare/data',
  rezultat: '/ro/estimare/rezultat',
  contact: '/ro/estimare/trimite',
};

function inTwoWeeks() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(PAGES);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
for (const [suffix, viewport, mobile] of [
  ['d', { width: 1440, height: 900 }, false],
  ['m', { width: 390, height: 844 }, true],
]) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, locale: 'ro-RO' });
  await ctx.addInitScript((o) => {
    localStorage.setItem('mutabil:draft', JSON.stringify({ state: { order: o, savedAt: Date.now() }, version: 1 }));
  }, ORDER);
  const page = await ctx.newPage();
  for (const name of names) {
    const url = PAGES[name];
    if (!url) throw new Error(`unknown screen "${name}"; known: ${Object.keys(PAGES).join(', ')}`);
    await page.goto(BASE + url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    if (name === 'vizita') await page.getByRole('button', { name: /Programează vizita/ }).click();
    if (name === 'explain')
      await page
        .getByRole('button', { name: /Ce include/ })
        .first()
        .click();
    await page.waitForTimeout(400);
    const file = path.join(OUT, `${name}-${suffix}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);
  }
  await ctx.close();
}
await browser.close();
