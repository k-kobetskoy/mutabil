import { expect, type Page } from '@playwright/test';
import type { OrderInput } from '@/contract/order';

/** A detailed-mode draft with every step answered, items listed (so the guaranteed maximum shows). */
export const FULL_ORDER: OrderInput = {
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
  inventory: { mode: 'list', items: { 'wardrobe-2-door': 1, 'bed-double-frame': 1, 'sofa-3-seat': 1, 'dining-table': 1 } },
  packing: { who: 'self', containers: 'own' },
  protection: { level: 'basic' },
  survey: { method: 'remote' },
  schedule: { date: nextWeekday(), slot: 'morning' },
};

function nextWeekday(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Saves a draft the way the order store does, before the app reads it. */
export async function seedDraft(page: Page, order: OrderInput) {
  await page.goto('/ro/tarife');
  await page.evaluate((o) => {
    localStorage.setItem('mutabil:draft', JSON.stringify({ state: { order: o, savedAt: Date.now() }, version: 1 }));
  }, order);
}

/** Opens a react-aria Select by its visible label and picks an option. */
export async function pick(page: Page, label: string, option: RegExp, nth = 0) {
  // the trigger's name is "<value or placeholder> <label>"; the label ends it
  await page
    .getByRole('button', { name: new RegExp(`(^| )${label}$`) })
    .nth(nth)
    .click();
  await page.getByRole('option', { name: option }).first().click();
}

/** The one visible element among copies laid out for desktop and phone. */
export function visible(page: Page, role: 'link' | 'button', name: RegExp) {
  return page.getByRole(role, { name }).locator('visible=true').first();
}

export async function expectOnPath(page: Page, path: RegExp) {
  await expect(page).toHaveURL(path);
}
