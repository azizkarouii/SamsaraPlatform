import { Page, expect } from '@playwright/test';

export const PASSWORD = 'secret123';

/** The time zone of the app (backend APP_TIMEZONE and the browser of these tests), whatever the machine running them. */
export const TIMEZONE = 'Africa/Tunis';

/** yyyy-MM-dd, days from today in Tunisia: the "today" of the site, even when the CI runs at 23:30 UTC. */
export function iso(days: number): string {
  // Tunisia has no daylight saving time: whole days of 24 h are exact
  return new Date(Date.now() + days * 86_400_000).toLocaleDateString('en-CA', { timeZone: TIMEZONE });
}

/** An address no other test (or earlier run on the same database) has used. */
export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@e2e.tn`;
}

/** A call to the API from inside the page: its session cookie and the header the API asks for. */
export async function api<T = any>(page: Page, method: string, path: string, body?: unknown): Promise<{ status: number; body: T }> {
  return page.evaluate(async ({ method, path, body }) => {
    const res = await fetch('/api' + path, {
      method, credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let parsed: unknown = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
    return { status: res.status, body: parsed as any };
  }, { method, path, body });
}

/** The superadmin the test backend creates at startup (SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD). */
export const ADMIN_EMAIL = process.env['SUPERADMIN_EMAIL'] ?? 'admin@e2e.tn';
export const ADMIN_PASSWORD = process.env['SUPERADMIN_PASSWORD'] ?? 'admin-e2e-secret';

/** The superadmin creates the account through the API, then its user signs in: the page keeps that session. */
export async function signUp(page: Page, name: string, role: 'PROPRIETAIRE' | 'SAMSAR', phone = '20111111', samsarsEnabled = true): Promise<string> {
  await page.goto('/login');
  const email = uniqueEmail(role === 'SAMSAR' ? 'samsar' : 'owner');
  const admin = await api(page, 'POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  expect(admin.status, JSON.stringify(admin.body)).toBe(200);
  const created = await api(page, 'POST', '/admin/users', { name, email, password: PASSWORD, phone, role, samsarsEnabled, language: 'fr' });
  expect(created.status, JSON.stringify(created.body)).toBe(200);
  const reply = await api(page, 'POST', '/auth/login', { email, password: PASSWORD });
  expect(reply.status, JSON.stringify(reply.body)).toBe(200);
  await page.evaluate(user => localStorage.setItem('user', JSON.stringify(user)), reply.body.user);
  return email;
}

export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  const reply = await api(page, 'POST', '/auth/login', { email, password: PASSWORD });
  expect(reply.status).toBe(200);
  await page.evaluate(user => localStorage.setItem('user', JSON.stringify(user)), reply.body.user);
}

export async function createHouse(page: Page, title: string, pricePerDay = 150, address = 'Hammamet') {
  const reply = await api(page, 'POST', '/properties', { title, pricePerDay, configuration: 'S+2', address, maxCapacity: 6, wifi: true, pool: true });
  expect(reply.status).toBe(200);
  return reply.body as { id: number; title: string };
}

export async function book(page: Page, propertyId: number, start: number, end: number, clientName: string, totalAmount: number, advanceAmount = 0, checkInTime?: string) {
  const reply = await api(page, 'POST', '/reservations', {
    propertyId, startDate: iso(start), endDate: iso(end), clientName, clientPhone: '98765432', totalAmount, advanceAmount,
    ...(checkInTime ? { checkInTime } : {}),
  });
  expect(reply.status, JSON.stringify(reply.body)).toBe(200);
  return reply.body as { id: number; status: string };
}

/** No horizontal scroll of the whole page (wide content scrolls inside its own box). */
export async function expectNoPageOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `page wider than the screen: ${page.url()}`).toBeLessThanOrEqual(1);
}
