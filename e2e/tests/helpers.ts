import { Page, expect } from '@playwright/test';

export const PASSWORD = 'secret123';

/** yyyy-MM-dd, days from today in the browser's time zone. */
export function iso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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

/** Signs up through the API (email verification is off for these tests) and keeps the session in the page. */
export async function signUp(page: Page, name: string, role: 'PROPRIETAIRE' | 'SAMSAR', phone = '20111111'): Promise<string> {
  await page.goto('/login');
  const email = uniqueEmail(role === 'SAMSAR' ? 'samsar' : 'owner');
  const reply = await api(page, 'POST', '/auth/register', { name, email, password: PASSWORD, phone, role, language: 'fr' });
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
