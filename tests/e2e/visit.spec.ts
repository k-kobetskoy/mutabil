import { expect, test } from '@playwright/test';
import { pick } from './helpers';

test.describe('"we take care of everything" visit request (D31, D39)', () => {
  test('names what is missing, then sends with a guide price for the chosen home', async ({ page }) => {
    await page.goto('/ro');
    await page.getByRole('link', { name: 'Programează vizita' }).first().click();
    await expect(page).toHaveURL(/\/ro\/vizita$/);

    await page.getByRole('button', { name: /Programează vizita/ }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Mai lipsesc câteva răspunsuri' })).toBeVisible();

    await pick(page, 'De la', /^Mănăștur/);
    await pick(page, 'La', /^Florești/);
    await pick(page, 'Ce mutăm', /^Apartament 2 camere/);
    await expect(page.getByText(/Orientativ pentru apartament 2 camere: de la [\d.]+ lei/)).toBeVisible();
    await expect(page.getByText('Vizita e gratuită și nu te obligă la nimic.').locator('visible=true')).toHaveCount(1);

    await page.getByRole('textbox', { name: 'Nume' }).fill('Ana Test');
    await page.getByRole('textbox', { name: 'Telefon' }).fill('+40 712 345 678');
    await page.getByRole('checkbox', { name: /prețul maxim garantat se stabilește la vizită/ }).check({ force: true });
    await page.getByRole('button', { name: /Programează vizita/ }).click();
    await expect(page.getByRole('heading', { name: 'Am primit cererea' })).toBeVisible();
  });
});
