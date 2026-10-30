export type DayStatus = 'free' | 'reserved' | 'pending' | 'blocked';
export type CalendarLanguage = 'fr' | 'en' | 'ar';

export interface CalendarDay {
  date: string;
  dayNumber: number | null;
  isCurrentMonth: boolean;
  isPast: boolean;
  status: DayStatus;
}

export interface CalendarMonth {
  year: number;
  monthIndex: number;
  monthLabel: string;
  days: CalendarDay[];
}

export interface Occupancy {
  reservations: Array<{ startDate: string; endDate: string; status: string }>;
  blockedDates: string[];
}

const MONTH_LABELS: Record<CalendarLanguage, string[]> = {
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

const WEEKDAY_LABELS: Record<CalendarLanguage, string[]> = {
  fr: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
  ar: ['ن', 'ث', 'ر', 'خ', 'ج', 'س', 'ح'],
};

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

export function todayIso(): string {
  return formatIsoDate(new Date());
}

export function buildCalendarMonth(
  year: number,
  monthIndex: number,
  dayStatuses: Record<string, DayStatus> = {},
  language: CalendarLanguage = 'fr'
): CalendarMonth {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const today = todayIso();
  const days: CalendarDay[] = [];

  for (let i = 0; i < startOffset; i++) {
    days.push({ date: '', dayNumber: null, isCurrentMonth: false, isPast: false, status: 'free' });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const iso = formatIsoDate(new Date(year, monthIndex, day));
    days.push({
      date: iso,
      dayNumber: day,
      isCurrentMonth: true,
      isPast: iso < today,
      status: dayStatuses[iso] || 'free',
    });
  }

  while (days.length % 7 !== 0) {
    days.push({ date: '', dayNumber: null, isCurrentMonth: false, isPast: false, status: 'free' });
  }

  return { year, monthIndex, monthLabel: getMonthLabel(monthIndex, language), days };
}

/** Builds `count` consecutive months starting at the given month. */
export function buildCalendarMonths(
  year: number,
  monthIndex: number,
  count: number,
  dayStatuses: Record<string, DayStatus> = {},
  language: CalendarLanguage = 'fr'
): CalendarMonth[] {
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(year, monthIndex + offset, 1);
    return buildCalendarMonth(date.getFullYear(), date.getMonth(), dayStatuses, language);
  });
}

export function getMonthLabel(monthIndex: number, language: CalendarLanguage = 'fr'): string {
  return (MONTH_LABELS[language] ?? MONTH_LABELS.fr)[monthIndex];
}

/** "Oct.", "Nov." … (Arabic month names are already short, so they stay whole). */
export function getShortMonthLabel(monthIndex: number, language: CalendarLanguage = 'fr'): string {
  const label = getMonthLabel(monthIndex, language);
  if (language === 'ar' || label.length <= 4) {
    return label;
  }
  return label.slice(0, 3) + '.';
}

export function getWeekdayLabels(language: CalendarLanguage = 'fr'): string[] {
  return WEEKDAY_LABELS[language] ?? WEEKDAY_LABELS.fr;
}

export function createDayStatusMap(
  reservations: Array<{ startDate: string; endDate: string; status: string }>,
  blockedDates: string[] = []
): Record<string, DayStatus> {
  const map: Record<string, DayStatus> = {};

  for (const date of blockedDates) {
    map[date] = 'blocked';
  }

  for (const reservation of reservations) {
    const status = toDayStatus(reservation.status);
    if (status === 'free') {
      continue;
    }
    const cursor = parseIsoDate(reservation.startDate);
    const end = parseIsoDate(reservation.endDate);
    while (cursor <= end) {
      map[formatIsoDate(cursor)] = status;
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return map;
}

/** True when no day of [start, end] is reserved, pending or blocked. */
export function isRangeFree(startDate: string, endDate: string, dayStatuses: Record<string, DayStatus>): boolean {
  const cursor = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  while (cursor <= end) {
    const status = dayStatuses[formatIsoDate(cursor)];
    if (status && status !== 'free') {
      return false;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return true;
}

function toDayStatus(status: string): DayStatus {
  const normalized = (status || '').trim().toLowerCase();
  if (['confirmed', 'in-progress', 'in_progress', 'in progress', 'reserved', 'active'].includes(normalized)) {
    return 'reserved';
  }
  if (normalized === 'pending') {
    return 'pending';
  }
  return 'free';
}
