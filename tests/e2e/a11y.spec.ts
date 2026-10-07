import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { FULL_ORDER, seedDraft } from './helpers';

const PAGES: { path: string; draft?: boolean }[] = [
  { path: '/ro' },
  { path: '/en' },
  { path: '/ro/tarife' },
  { path: '/ro/vizita' },
  { path: '/ro/estimare/acces', draft: true },
  { path: '/ro/estimare/servicii', draft: true },
  { path: '/ro/estimare/evaluare', draft: true },
  { path: '/ro/estimare/rezultat', draft: true },
  { path: '/ro/estimare/trimite', draft: true },
];

test.describe('accessibility (WCAG 2.1 AA, axe)', () => {
  for (const p of PAGES) {
    test(`${p.path} has no serious or critical violations`, async ({ page }) => {
      if (p.draft) await seedDraft(page, FULL_ORDER);
      await page.goto(p.path);
      await expect(page.locator('main')).toBeVisible();
      await page.waitForTimeout(400); // entrance animation of the step
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude('nextjs-portal') // the dev-only error overlay
        .analyze();
      const serious = violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map(
          (v) =>
            `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes
              .map((n) => n.target.join(' '))
              .slice(0, 5)
              .join('\n  ')}`,
        );
      expect(serious, serious.join('\n')).toEqual([]);
    });
  }
});
