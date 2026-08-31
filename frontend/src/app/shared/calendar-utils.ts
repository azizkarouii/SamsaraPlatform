export type DayStatus = 'free' | 'reserved' | 'pending' | 'blocked';

export interface CalendarDay {
  date: string;
  dayNumber: number | null;
  isCurrentMonth: boolean;
  status: DayStatus;
}

export interface CalendarMonth {
  year: number;
  monthIndex: number;
  monthLabel: string;
  days: CalendarDay[];
}

const MONTH_LABELS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const MONTH_LABELS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const WEEKDAY_LABELS_FR = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
const WEEKDAY_LABELS_AR = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];

export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function buildCalendarMonth(
  year: number,
  monthIndex: number,
  dayStatuses: Record<string, DayStatus> = {},
  language: 'fr' | 'en' | 'ar' = 'fr'
): CalendarMonth {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const days: CalendarDay[] = [];

  for (let i = 0; i < startOffset; i++) {
    days.push({ date: '', dayNumber: null, isCurrentMonth: false, status: 'free' });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthIndex, day);
    const iso = formatIsoDate(date);
    days.push({
      date: iso,
      dayNumber: day,
      isCurrentMonth: true,
      status: dayStatuses[iso] || 'free',
    });
  }

  while (days.length % 7 !== 0) {
    days.push({ date: '', dayNumber: null, isCurrentMonth: false, status: 'free' });
  }

  return {
    year,
    monthIndex,
    monthLabel: getMonthLabel(monthIndex, language),
    days,
  };
}

export function getMonthLabel(monthIndex: number, language: 'fr' | 'en' | 'ar' = 'fr'): string {
  if (language === 'ar') {
    return MONTH_LABELS_AR[monthIndex];
  }
  return MONTH_LABELS_FR[monthIndex];
}

export function getWeekdayLabels(language: 'fr' | 'en' | 'ar' = 'fr'): string[] {
  return language === 'ar' ? WEEKDAY_LABELS_AR : WEEKDAY_LABELS_FR;
}

export function createDayStatusMap(
  reservations: Array<{ startDate: string; endDate: string; status: string }>,
  availabilities: Array<{ date: string; status: string }> = []
): Record<string, DayStatus> {
  const map: Record<string, DayStatus> = {};

  for (const availability of availabilities) {
    if (availability.status && availability.status !== 'available') {
      map[availability.date] = 'blocked';
    }
  }

  for (const reservation of reservations) {
    const status = normalizeReservationStatus(reservation.status);
    if (status === 'free') {
      continue;
    }
    const start = parseIsoDate(reservation.startDate);
    const end = parseIsoDate(reservation.endDate);
    const cursor = new Date(start);
    while (cursor <= end) {
      const iso = formatIsoDate(cursor);
      map[iso] = status;
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return map;
}

export function getMonthRange(year: number, monthIndex: number): { startDate: string; endDate: string } {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  return { startDate: formatIsoDate(start), endDate: formatIsoDate(end) };
}

export function getSelectedRangeLabel(startDate?: string, endDate?: string, language: 'fr' | 'en' | 'ar' = 'fr'): string {
  if (!startDate) {
    return language === 'ar' ? 'اختر تاريخ البداية' : 'Choisissez une date de début';
  }
  if (!endDate) {
    return language === 'ar' ? 'اختر تاريخ النهاية' : 'Choisissez une date de fin';
  }
  return `${startDate} → ${endDate}`;
}

function normalizeReservationStatus(status: string): DayStatus {
  const normalized = (status || '').trim().toLowerCase();
  if (normalized === 'confirmed' || normalized === 'in-progress' || normalized === 'in_progress' || normalized === 'in progress' || normalized === 'reserved') {
    return 'reserved';
  }
  if (normalized === 'pending') {
    return 'pending';
  }
  return 'free';
}
