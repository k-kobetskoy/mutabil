import { expect, test, type Page } from '@playwright/test';
import { FULL_ORDER, pick, seedDraft, visible } from './helpers';

const next = (page: Page) => page.getByRole('button', { name: 'Continuă' }).click();

test.describe('detailed estimate (D1–D3, D36–D38)', () => {
  test('from the landing link to a sent request, answering every step', async ({ page }) => {
    await page.goto('/ro');
    await page.getByRole('link', { name: /Sau fă o estimare exactă/ }).click();

    // 1. what — the landing link already chose the detailed mode (no second question)
    await expect(page).toHaveURL(/\/ro\/estimare\/ce-mutam/);
    await page.getByRole('radio', { name: /^Apartament$/ }).check({ force: true });
    await page.getByRole('radio', { name: /Apartament 2 camere/ }).check({ force: true });
    await next(page);

    // 2. access
    await expect(page).toHaveURL(/\/ro\/estimare\/acces/);
    await pick(page, 'Cartier sau localitate', /^Mănăștur/, 0);
    await pick(page, 'Cartier sau localitate', /^Zorilor/, 1);
    const floors = page.getByRole('textbox', { name: 'Etaj' });
    await floors.nth(0).fill('0');
    await floors.nth(1).fill('0');
    await next(page);

    // 3. items: "by rooms" is already chosen
    await expect(page).toHaveURL(/\/ro\/estimare\/ce-transportam/);
    await expect(page.getByRole('radio', { name: /După numărul de camere/ })).toBeChecked();
    await next(page);

    // 4. services: defaults
    await expect(page).toHaveURL(/\/ro\/estimare\/servicii/);
    await next(page);

    // 5. survey: one question, each answer with its own range
    await expect(page).toHaveURL(/\/ro\/estimare\/evaluare/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vrei un preț maxim garantat?');
    await page.getByRole('radio', { name: /Da, din fotografii și video/ }).check({ force: true });
    await next(page);

    // 6. date and arrival slot
    await expect(page).toHaveURL(/\/ro\/estimare\/data/);
    await page.locator('[role=gridcell] [role=button]:not([aria-disabled="true"])').nth(10).click();
    await page.getByRole('radio', { name: /Dimineața/ }).check({ force: true });
    await page.getByRole('button', { name: 'Vezi estimarea' }).click();

    // result: one total on the pass, the survey named, no maximum (counted by rooms, D38)
    await expect(page).toHaveURL(/\/ro\/estimare\/rezultat/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Estimarea ta');
    await expect(page.getByText('foto și video').first()).toBeVisible();
    await expect(page.getByText(/Cel mult .* dacă evaluarea confirmă/)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Ce urmează după ce trimiți' })).toBeVisible();

    // send
    await visible(page, 'link', /Trimite cererea/).click();
    await expect(page).toHaveURL(/\/ro\/estimare\/trimite/);
    await page.getByRole('textbox', { name: 'Nume' }).fill('Ana Test');
    await page.getByRole('textbox', { name: 'Telefon' }).fill('+40 712 345 678');
    await page.getByRole('checkbox', { name: /Înțeleg că, înainte de evaluare/ }).check({ force: true });
    await page.getByRole('button', { name: /Trimite cererea/ }).click();
    await expect(page.getByRole('heading', { name: 'Am primit cererea' })).toBeVisible();
  });

  test('items listed one by one give a guaranteed maximum right under the range', async ({ page }) => {
    await seedDraft(page, FULL_ORDER);
    await page.goto('/ro/estimare/rezultat');
    await expect(page.getByText(/^Cel mult [\d.]+ lei, dacă evaluarea confirmă$/)).toBeVisible();
    await expect(page.getByText(/nu plătești peste [\d.]+ lei/)).toBeVisible();
  });

  test('crates turn the survey into one confirmed visit with a way back', async ({ page }) => {
    await seedDraft(page, { ...FULL_ORDER, packing: { who: 'self', containers: 'crates' }, survey: { method: 'onsite' } });
    await page.goto('/ro/estimare/evaluare');
    await expect(page.getByRole('heading', { name: 'Da, cu vizita unui specialist' })).toBeVisible();
    await expect(page.getByRole('radio')).toHaveCount(0);
    await page.getByRole('link', { name: 'Schimbă lăzile' }).click();
    await expect(page).toHaveURL(/\/ro\/estimare\/servicii/);
  });

  test('a step names what is missing and keeps the client on it', async ({ page }) => {
    await page.goto('/ro/estimare?mode=detailed');
    await expect(page).toHaveURL(/\/ro\/estimare\/ce-mutam/);
    await next(page);
    await expect(page.getByRole('alert').filter({ hasText: 'Mai lipsesc câteva răspunsuri' })).toBeVisible();
    await expect(page).toHaveURL(/\/ro\/estimare\/ce-mutam/);
  });

  test('answers survive a reload', async ({ page }) => {
    await seedDraft(page, FULL_ORDER);
    await page.goto('/ro/estimare/acces');
    await expect(page.getByRole('button', { name: /^Gheorgheni/ })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: /^Gheorgheni/ })).toBeVisible();
  });
});
