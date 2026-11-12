import { test, expect } from '@playwright/test';
import { signUp, createHouse, book, expectNoPageOverflow } from './helpers';

test.describe('Planning', () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page, 'Owner Planning', 'PROPRIETAIRE');
    const jasmin = await createHouse(page, 'Dar Jasmin', 150);
    const villa = await createHouse(page, 'Villa Yasmine', 300);
    await book(page, jasmin.id, 0, 3, 'Mounir', 600, 200, '00:00');
    await book(page, villa.id, 1, 2, 'Hedi', 600, 100);
    await book(page, villa.id, 3, 5, 'Amira', 900, 100);
    await book(page, jasmin.id, 8, 9, 'Nadia', 300, 0);
  });

  test('month, week and Gantt views, with the requests to confirm', async ({ page }) => {
    await page.goto('/planning');
    await expect(page.locator('app-planning-overview path.line')).toBeVisible();
    await expect(page.locator('app-planning-month a.chip').first()).toBeVisible();
    await expect(page.locator('app-planning-side .note .big')).toHaveText('1');
    await expect(page.locator('app-planning-side .colors li')).toHaveCount(2);

    await page.locator('.notebook .controls .segmented').nth(1).getByRole('button', { name: 'Semaine' }).click();
    await expect(page.locator('app-planning-week .day')).toHaveCount(7);

    // Each stay keeps its own line all week long, whatever happens in the other houses
    const lines = await page.locator('app-planning-week .day').evaluateAll(days => days.map(day =>
      [...day.querySelectorAll('a.entry, .lane')].map(e => (e.tagName === 'A' ? e.getAttribute('href') : null))));
    const lineOf: Record<string, number> = {};
    for (const day of lines) {
      day.forEach((href, line) => {
        if (!href) return;
        expect(lineOf[href] ?? line, `stay ${href} moved`).toBe(line);
        lineOf[href] = line;
      });
    }

    await page.locator('.notebook .controls .segmented').nth(1).getByRole('button', { name: 'Gantt' }).click();
    await expect(page.locator('app-planning-gantt a.bar').first()).toBeVisible();
    await expectNoPageOverflow(page);
  });

  test('the dashboard and the houses show today', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('.metric-value').first()).toBeVisible();
    await page.goto('/properties');
    await expect(page.locator('.house-card')).toHaveCount(2);
    await expect(page.locator('.house-card .badge.occupied')).toHaveCount(1);
    await expect(page.locator('.house-card app-occupancy-strip').first()).toBeVisible();
  });
});
