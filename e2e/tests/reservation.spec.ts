import { test, expect } from '@playwright/test';
import { iso, signUp, createHouse, api } from './helpers';

test.describe('A booking from start to end', () => {
  test('books in the form, records the payment, sends the receipt and the WhatsApp summary', async ({ page }) => {
    await signUp(page, 'Owner Booking', 'PROPRIETAIRE');
    const house = await createHouse(page, 'Dar Jasmin', 150, 'Rue des Orangers, Hammamet');

    // ---- the form: house card, dates in the calendar, client, quick advance
    await page.goto('/reservations/add');
    await page.locator('.house-pick', { hasText: 'Dar Jasmin' }).click();
    await page.locator(`app-range-calendar [data-date="${iso(2)}"]`).click();
    await page.locator(`app-range-calendar [data-date="${iso(4)}"]`).click();
    await expect(page.locator('.ticket .nights b')).toHaveText('3');
    await expect(page.locator('.ticket .total b')).toContainText('450');
    await page.locator('[formcontrolname="clientName"]').fill('Mounir Trabelsi');
    await page.locator('[formcontrolname="clientPhone"]').fill('98765432');
    await page.locator('.advance-quick button', { hasText: '30 %' }).click();
    await expect(page.locator('[formcontrolname="advanceAmount"]')).toHaveValue('135');
    await expect(page.locator('.ticket .status-hint')).toContainText('confirmée');
    await page.locator('.ticket button[type="submit"]').click();

    // ---- the booking page
    await expect(page).toHaveURL(/\/reservations\/\d+$/);
    await expect(page.locator('.step.current')).toContainText('Confirmée');
    await expect(page.locator('.leaves .leaf')).toHaveCount(2);
    await expect(page.locator('app-reservation-payments li')).toHaveCount(1);

    // The rest of the price, paid at arrival
    await page.locator('app-reservation-payments button', { hasText: 'Enregistrer un paiement' }).click();
    await page.locator('app-reservation-payments button[type="submit"]').click();
    await expect(page.locator('app-reservation-payments li')).toHaveCount(2);

    // WhatsApp: the summary already typed in
    const whatsApp = await page.locator('a.whatsapp').getAttribute('href');
    expect(whatsApp).toContain('https://wa.me/21698765432?text=');
    expect(decodeURIComponent(whatsApp!.split('text=')[1])).toContain('Montant total : 450 TND');

    // The receipt is what gets printed
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('app-reservation-receipt')).toBeVisible();
    await expect(page.locator('.screen-only')).toBeHidden();
    await expect(page.locator('app-reservation-receipt')).toContainText('Mounir Trabelsi');
    await page.emulateMedia({ media: 'screen' });

    // The history kept who did what
    await expect(page.locator('app-reservation-history li').first()).toContainText('a créé la réservation');
    const id = Number(page.url().split('/').pop());
    const payments = await api(page, 'GET', `/reservations/${id}/payments`);
    expect(payments.body.map((p: { amount: number }) => p.amount).reduce((a: number, b: number) => a + b, 0)).toBe(450);
    void house;
  });

  test('booked days cannot be picked again', async ({ page }) => {
    await signUp(page, 'Owner Overlap', 'PROPRIETAIRE');
    const house = await createHouse(page, 'Villa Yasmine', 300);
    await api(page, 'POST', '/reservations', { propertyId: house.id, startDate: iso(5), endDate: iso(7), clientName: 'Sami', totalAmount: 900, advanceAmount: 100 });
    await page.goto(`/reservations/add?propertyId=${house.id}`);
    await expect(page.locator(`app-range-calendar [data-date="${iso(6)}"]`)).toBeDisabled();
    await expect(page.locator(`app-range-calendar [data-date="${iso(9)}"]`)).toBeEnabled();
  });
});
