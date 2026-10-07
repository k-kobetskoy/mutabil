import { expect, test } from '@playwright/test';
import { pick } from './helpers';

test.describe('landing (D30–D35)', () => {
  test('sells the service: advantages, care, two ways, promises, FAQ — and no fares table', async ({ page }) => {
    await page.goto('/ro');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Rezervă mutarea');
    for (const h of [
      /Ce primești cu Mutabil/,
      /Cum avem grijă/,
      /Două moduri de a comanda/,
      /Ce nu se întâmplă niciodată/,
      /Ce se întâmplă dacă/,
    ]) {
      await expect(page.getByRole('heading', { name: h })).toBeVisible();
    }
    await expect(page.getByRole('table')).toHaveCount(0);
    await expect(page.getByText(/lei \/ ladă/)).toHaveCount(0); // no unit prices on the landing (D32)
    await expect(page.getByText(/de la [\d.]+ lei/).first()).toBeVisible(); // full-service guide prices (D31)
  });

  test('"what is in this price" opens next to the range and leads to the rates page', async ({ page }) => {
    await page.goto('/ro');
    await page.getByRole('button', { name: 'Ce include prețul?' }).first().click();
    await expect(page.getByText('Nimic nu se adaugă fără acordul tău.').first()).toBeVisible();
    await page
      .getByRole('link', { name: /Cum calculăm, în detaliu/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/ro\/tarife$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cum calculăm prețul');
  });

  test('the quick search gives an estimate in three questions', async ({ page }) => {
    await page.goto('/ro');
    await pick(page, 'De la', /^Mănăștur/);
    await pick(page, 'La', /^Gheorgheni/);
    await pick(page, 'Ce mutăm', /^Apartament 2 camere/);
    await page.getByRole('textbox', { name: 'Etaj la plecare' }).fill('0');
    await page.getByRole('textbox', { name: 'Etaj la sosire' }).fill('0');
    await page.getByRole('button', { name: /Vezi prețul și ora/ }).click();
    await expect(page).toHaveURL(/\/ro\/estimare\/rezultat/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Estimarea ta');
    await expect(page.getByText(/[\d.]+ – [\d.]+ lei/).first()).toBeVisible();
  });

  test('the quick search names what is missing', async ({ page }) => {
    await page.goto('/ro');
    await page.getByRole('button', { name: /Vezi prețul și ora/ }).click();
    await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toBeVisible();
    await expect(page).toHaveURL(/\/ro$/);
  });

  test('floors and lifts stay inside the search panel (owner screenshots, EN)', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('textbox', { name: 'Floor at departure' }).fill('1');
    await page.getByRole('textbox', { name: 'Floor at arrival' }).fill('4');
    await page.getByRole('textbox', { name: 'Floor at arrival' }).blur();
    for (const label of ['Lift at departure', 'Lift at arrival']) {
      await page.getByRole('button', { name: new RegExp(`${label}$`) }).click();
      await page.getByRole('option', { name: /^Large/ }).click();
    }
    const panel = page.locator('section[aria-labelledby="search-title"]');
    const outside = await panel.evaluate((el) => {
      const edge = el.getBoundingClientRect().right;
      return (
        [...el.querySelectorAll('*')]
          // react-aria's hidden native <select> (aria-hidden, visually hidden) is not layout
          .filter((n) => !n.closest('[aria-hidden="true"]') && n.getBoundingClientRect().right > edge + 1)
          .map(
            (n) =>
              `<${n.tagName.toLowerCase()} class="${n.getAttribute('class') ?? ''}"> ${Math.round(n.getBoundingClientRect().right - edge)}px`,
          )
      );
    });
    expect(outside).toEqual([]);
  });

  test('English is there too', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Book your move like a flight');
    await expect(page.getByRole('heading', { name: /Two ways to order/ })).toBeVisible();
  });
});
