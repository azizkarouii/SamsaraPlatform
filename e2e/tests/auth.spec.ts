import { test, expect } from '@playwright/test';
import { PASSWORD, uniqueEmail, expectNoPageOverflow } from './helpers';

test.describe('Accounts', () => {
  test('signs up with the form, then signs in again', async ({ page }) => {
    const email = uniqueEmail('form');
    await page.goto('/register');
    await expect(page.locator('app-auth-showcase')).toBeVisible();
    await page.locator('[formcontrolname="name"]').fill('Leila Ben Salah');
    await page.locator('[formcontrolname="email"]').fill(email);
    await page.locator('[formcontrolname="password"]').fill(PASSWORD);
    await page.locator('[formcontrolname="confirmPassword"]').fill(PASSWORD);
    await page.locator('[formcontrolname="phone"]').fill('20111111');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('h1')).toContainText('Leila Ben Salah');

    // The session is an HttpOnly cookie: page scripts never see a token
    const cookie = (await page.context().cookies()).find(c => c.name === 'samsara_token');
    expect(cookie?.httpOnly).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();

    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
    await page.locator('[formcontrolname="email"]').fill(email);
    await page.locator('[formcontrolname="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('a wrong password is refused', async ({ page }) => {
    await page.goto('/login');
    await page.locator('[formcontrolname="email"]').fill(uniqueEmail('nobody'));
    await page.locator('[formcontrolname="password"]').fill('wrongpass');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('mat-snack-bar-container')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('the sign-in page fits a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await expect(page.locator('app-auth-showcase')).toBeHidden();
    await expectNoPageOverflow(page);
  });
});
