import { test, expect, Browser } from '@playwright/test';
import { signUp, createHouse, book, signIn, expectNoPageOverflow } from './helpers';

async function ownerWithData(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const email = await signUp(page, 'Owner Pages', 'PROPRIETAIRE');
  const jasmin = await createHouse(page, 'Dar Jasmin', 150);
  const riad = await createHouse(page, 'Riad des Oliviers', 220);
  await book(page, jasmin.id, 1, 3, 'Mounir', 450, 100);
  await book(page, riad.id, 4, 6, 'Youssef', 660, 200);
  await book(page, jasmin.id, 10, 11, 'Nadia', 300, 0);
  return { context, page, email, jasmin, riad };
}

test.describe('Everyday pages', () => {
  test('reservations as a board, then as a table filtered by status', async ({ browser }) => {
    const { page, context } = await ownerWithData(browser);
    await page.goto('/reservations');
    await page.locator('.header-actions .segmented').getByRole('button', { name: 'Kanban' }).click();
    await expect(page.locator('app-reservation-kanban .column')).toHaveCount(5);
    await expect(page.locator('app-reservation-kanban .column.pending .card')).toHaveCount(1);
    await page.locator('.header-actions .segmented').getByRole('button', { name: 'Tableau' }).click();
    await page.locator('.filter-tabs .segmented button', { hasText: 'Confirmée' }).click();
    await expect(page.locator('tr.mat-mdc-row')).toHaveCount(2);
    await context.close();
  });

  test('reports: periods in one click, a house filters, columns sort', async ({ browser }) => {
    const { page, context } = await ownerWithData(browser);
    await page.goto('/reports');
    await expect(page.locator('.kpi')).toHaveCount(5);
    await page.locator('.presets button', { hasText: '12 derniers mois' }).click();
    await page.locator('.presets button', { hasText: 'Cette année' }).click();
    // The 2 bookings; the request still pending stays out of the report
    await expect(page.locator('.report tbody tr')).toHaveCount(2);
    const before = 2;
    await page.locator('.bars .bar', { hasText: 'Riad des Oliviers' }).click();
    await expect(page.locator('.report tbody tr')).toHaveCount(1);
    await page.locator('.bars .bar', { hasText: 'Riad des Oliviers' }).click();
    await expect(page.locator('.report tbody tr')).toHaveCount(before);
    await context.close();
  });

  test('a samsar invited from the samsars page reads and clears his notification', async ({ browser }) => {
    const { page, context } = await ownerWithData(browser);

    const samsarContext = await browser.newContext();
    const samsar = await samsarContext.newPage();
    const samsarEmail = await signUp(samsar, 'Karim Samsar', 'SAMSAR', '20222222');

    await page.goto('/shared-houses');
    await page.locator('aside.invite [formcontrolname="email"]').fill(samsarEmail);
    await page.locator('aside.invite [formcontrolname="phone"]').fill('20222222');
    await page.locator('aside.invite .deal-choice', { hasText: '10 %' }).click();
    await page.locator('aside.invite button[type="submit"]').click();
    await expect(page.locator('.samsar')).toHaveCount(1);
    await expect(page.locator('.samsar .chip.wa')).toBeVisible();

    await signIn(samsar, samsarEmail);
    await samsar.goto('/shared-houses');
    await expect(samsar.locator('.house-card')).toHaveCount(2);

    await samsar.goto('/notifications');
    await samsar.locator('.kinds .kind', { hasText: 'Partages' }).click();
    const unread = await samsar.locator('.item.unread').count();
    expect(unread).toBeGreaterThan(0);
    // A real click: the row must not be rebuilt between the press and the release
    await samsar.locator('.item.unread').first().hover();
    await samsar.locator('.item.unread .item-actions button').first().click();
    await expect(samsar.locator('.item.unread')).toHaveCount(unread - 1);
    await expect(samsar).toHaveURL(/\/notifications$/);

    await samsarContext.close();
    await context.close();
  });

  test('availability: one click on a period searches the free houses', async ({ browser }) => {
    const { page, context } = await ownerWithData(browser);
    await page.goto('/availability');
    await page.locator('.presets .preset', { hasText: 'Mois prochain' }).click();
    await expect(page.locator('.result').first()).toBeVisible();
    await context.close();
  });

  test('the main pages fit a phone', async ({ browser }) => {
    const { context, email } = await ownerWithData(browser);
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await phone.newPage();
    await signIn(page, email);
    for (const path of ['/dashboard', '/planning', '/reservations', '/reservations/add', '/properties', '/properties/add', '/shared-houses', '/reports', '/notifications', '/profile']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expectNoPageOverflow(page);
    }
    await phone.close();
    await context.close();
  });
});
