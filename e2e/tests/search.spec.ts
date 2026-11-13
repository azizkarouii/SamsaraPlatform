import { test, expect } from '@playwright/test';
import { signUp, createHouse, book } from './helpers';

test('search bars: "/" to type, the results follow, Escape clears', async ({ page }) => {
  await signUp(page, 'Owner Search', 'PROPRIETAIRE');
  const jasmin = await createHouse(page, 'Dar Jasmin', 150);
  const villa = await createHouse(page, 'Villa Yasmine', 300);
  await createHouse(page, 'Studio Corniche', 80);
  await book(page, jasmin.id, 1, 3, 'Mounir Trabelsi', 450, 100);
  await book(page, villa.id, 4, 6, 'Amira Jlassi', 900, 200);

  await page.goto('/properties');
  await expect(page.locator('.house-card')).toHaveCount(3);
  await page.keyboard.press('/');
  await expect(page.locator('app-search-bar input')).toBeFocused();
  await page.keyboard.type('yas');
  await expect(page.locator('.house-card')).toHaveCount(1);
  await expect(page.locator('app-search-bar .count')).toHaveText('1 maison');
  await page.keyboard.press('Escape');
  await expect(page.locator('.house-card')).toHaveCount(3);

  // "Free on": one click on Tomorrow-like quick days, then the cross drops the filter
  await page.locator('app-date-pill .quick button', { hasText: "Aujourd'hui" }).click();
  await expect(page.locator('app-date-pill .pill.set')).toContainText('Libres le');
  await expect(page.locator('.house-card')).toHaveCount(3);
  await page.locator('app-date-pill .clear').click();
  await expect(page.locator('app-date-pill .pill.set')).toHaveCount(0);
  await page.locator('app-date-pill .pill').click();
  await expect(page.locator('mat-datepicker-content')).toBeVisible();
  await page.keyboard.press('Escape');

  await page.goto('/reservations?view=table');
  await page.locator('app-search-bar input').fill('Mounir');
  await expect(page.locator('tr.mat-mdc-row')).toHaveCount(1);
  await page.locator('app-search-bar .clear').click();
  await expect(page.locator('tr.mat-mdc-row')).toHaveCount(2);

  await page.goto('/reports');
  await page.locator('app-search-bar input').fill('Villa');
  await expect(page.locator('.report tbody tr')).toHaveCount(1);
});
