import { AppLanguage } from '../services/ui-preferences.service';

/** What the message to the client says about his booking. */
export interface WhatsAppBooking {
  clientName: string;
  clientPhone?: string;
  propertyTitle?: string;
  address?: string;
  startDate: string;
  endDate: string;
  checkInTime: string;
  checkOutTime: string;
  total: number;
  paid: number;
}

const MESSAGES: Record<AppLanguage, { hello: string; stay: string; arrival: string; departure: string; total: string; paid: string; remaining: string; address: string }> = {
  fr: { hello: 'Bonjour {{client}},', stay: 'voici le récapitulatif de votre séjour à {{property}} :', arrival: 'Arrivée : {{date}} à partir de {{time}}', departure: 'Départ : {{date}} avant {{time}}', total: 'Montant total : {{amount}} TND', paid: 'Déjà payé : {{amount}} TND', remaining: 'Reste à payer : {{amount}} TND', address: 'Adresse : {{address}}' },
  en: { hello: 'Hello {{client}},', stay: 'here is the summary of your stay at {{property}}:', arrival: 'Arrival: {{date}} from {{time}}', departure: 'Departure: {{date}} before {{time}}', total: 'Total: {{amount}} TND', paid: 'Already paid: {{amount}} TND', remaining: 'Left to pay: {{amount}} TND', address: 'Address: {{address}}' },
  ar: { hello: 'مرحبًا {{client}}،', stay: 'إليك ملخص إقامتك في {{property}}:', arrival: 'الوصول: {{date}} ابتداءً من {{time}}', departure: 'المغادرة: {{date}} قبل {{time}}', total: 'المبلغ الإجمالي: {{amount}} دينار', paid: 'المدفوع: {{amount}} دينار', remaining: 'الباقي للدفع: {{amount}} دينار', address: 'العنوان: {{address}}' },
};

/** International number for wa.me: a Tunisian 8-digit number gets the 216 prefix. Null when unusable. */
export function whatsAppNumber(phone?: string | null): string | null {
  const digits = (phone || '').replace(/\D/g, '').replace(/^00/, '');
  if (digits.length === 8) return '216' + digits;
  return digits.length >= 10 ? digits : null;
}

/** Link opening WhatsApp on a chat with the client, the summary of his stay already typed in. */
export function whatsAppLink(booking: WhatsAppBooking, language: AppLanguage): string | null {
  const number = whatsAppNumber(booking.clientPhone);
  if (!number) return null;
  const text = MESSAGES[language] ?? MESSAGES.fr;
  const fill = (template: string, values: Record<string, string>) =>
    Object.entries(values).reduce((line, [name, value]) => line.split(`{{${name}}}`).join(value), template);
  const day = (iso: string) => iso.split('-').reverse().join('/');
  const amount = (value: number) => (Math.round(value * 100) / 100).toString();
  const remaining = Math.max(0, booking.total - booking.paid);

  const lines = [
    fill(text.hello, { client: booking.clientName }),
    fill(text.stay, { property: booking.propertyTitle || '' }),
    '',
    fill(text.arrival, { date: day(booking.startDate), time: booking.checkInTime }),
    fill(text.departure, { date: day(booking.endDate), time: booking.checkOutTime }),
    fill(text.total, { amount: amount(booking.total) }),
  ];
  if (booking.paid > 0) lines.push(fill(text.paid, { amount: amount(booking.paid) }));
  if (remaining > 0) lines.push(fill(text.remaining, { amount: amount(remaining) }));
  if (booking.address) lines.push(fill(text.address, { address: booking.address }));
  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`;
}
