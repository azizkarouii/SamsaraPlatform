import { whatsAppLink, whatsAppNumber } from './whatsapp';

describe('WhatsApp link', () => {
  const booking = {
    clientName: 'Mounir', clientPhone: '98 765 432', propertyTitle: 'Dar Jasmin', address: 'Hammamet',
    startDate: '2026-11-10', endDate: '2026-11-12', checkInTime: '14:00', checkOutTime: '12:00', total: 450, paid: 100,
  };

  it('adds the Tunisian prefix to an 8-digit number', () => {
    expect(whatsAppNumber('98 765 432')).toBe('21698765432');
    expect(whatsAppNumber('+216 98765432')).toBe('21698765432');
    expect(whatsAppNumber('123')).toBeNull();
  });

  it('types the summary of the stay in the chosen language', () => {
    const link = whatsAppLink(booking, 'fr')!;
    expect(link.startsWith('https://wa.me/21698765432?text=')).toBeTrue();
    const text = decodeURIComponent(link.split('text=')[1]);
    expect(text).toContain('Bonjour Mounir,');
    expect(text).toContain('Arrivée : 10/11/2026 à partir de 14:00');
    expect(text).toContain('Reste à payer : 350 TND');
    expect(text).toContain('Adresse : Hammamet');
  });

  it('has no link without a phone number', () => {
    expect(whatsAppLink({ ...booking, clientPhone: '' }, 'ar')).toBeNull();
  });
});
