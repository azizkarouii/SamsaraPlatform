import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, PASSWORD, api, signUp, uniqueEmail, expectNoPageOverflow } from './helpers';

test.describe('Accounts', () => {
  test('the superadmin creates an account, which signs in with the form', async ({ page }) => {
    const email = uniqueEmail('form');
    await page.goto('/login');
    await expect(page.locator('app-auth-showcase')).toBeVisible();
    await expect(page.locator('a[href="/register"]')).toHaveCount(0);
    await page.locator('[formcontrolname="email"]').fill(ADMIN_EMAIL);
    await page.locator('[formcontrolname="password"]').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    // The very first sign-in warms the backend up (password hashing, first queries): it may take a little longer
    await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 });
    await expect(page.locator('.money-card.main')).toBeVisible();

    await page.goto('/admin/accounts');
    await page.locator('.page-header button', { hasText: 'Nouveau compte' }).click();
    const dialog = page.locator('app-admin-account-dialog');
    await dialog.locator('[formcontrolname="name"]').fill('Leila Ben Salah');
    await dialog.locator('[formcontrolname="email"]').fill(email);
    await dialog.locator('[formcontrolname="phone"]').fill('20111111');
    await dialog.locator('[formcontrolname="password"]').fill(PASSWORD);
    await dialog.locator('button[type="submit"]').click();
    await expect(dialog.locator('.credentials')).toContainText(email);
    await dialog.locator('.done button', { hasText: 'Fermer' }).click();
    await expect(page.locator('.account', { hasText: email })).toBeVisible();

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
    await expect(page.locator('h1')).toContainText('Leila Ben Salah');
    await expect(page.locator('.side-menu a[href="/shared-houses"]')).toBeVisible();
    await expect(page.locator('.side-menu a[href="/admin"]')).toHaveCount(0);
  });

  test('a turned-off account cannot sign in; an owner working alone sees no samsar page', async ({ page }) => {
    const email = await signUp(page, 'Solo Owner', 'PROPRIETAIRE', '20111111', false);
    await page.goto('/dashboard');
    await expect(page.locator('.side-menu a[href="/properties"]')).toBeVisible();
    await expect(page.locator('.side-menu a[href="/shared-houses"]')).toHaveCount(0);
    await page.goto('/shared-houses');
    await expect(page).toHaveURL(/\/dashboard$/);

    const me = await api(page, 'GET', '/auth/profile');
    await api(page, 'POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    expect((await api(page, 'PATCH', `/admin/users/${me.body.id}/active`, { active: false })).status).toBe(200);
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
    await page.locator('[formcontrolname="email"]').fill(email);
    await page.locator('[formcontrolname="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.unverified')).toContainText('désactivé');
    await expect(page).toHaveURL(/\/login$/);
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
