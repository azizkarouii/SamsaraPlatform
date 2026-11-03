import { SeasonalPrice } from '../models/property.model';
import { formatIsoDate, parseIsoDate } from './calendar-utils';

/** Consecutive days of a stay charged at the same nightly price. */
export interface PriceStretch {
  days: number;
  pricePerDay: number;
}

/** True when a yearly period covers a day given as "MM-dd"; a start after the end crosses the new year. */
export function periodCovers(period: { startDate: string; endDate: string }, monthDay: string): boolean {
  return period.startDate <= period.endDate
    ? period.startDate <= monthDay && period.endDate >= monthDay
    : period.startDate <= monthDay || period.endDate >= monthDay;
}

/** "06-01" as stored -> "01/06" as shown. */
export function toDayMonth(monthDay: string): string {
  return `${monthDay.slice(3)}/${monthDay.slice(0, 2)}`;
}

/** "01/06" as typed -> "06-01" as stored. */
export function toMonthDay(dayMonth: string): string {
  return `${dayMonth.slice(3)}-${dayMonth.slice(0, 2)}`;
}

/**
 * Price of a stay day by day, last day included, mirroring the server: the price of the period
 * covering each day, else the main price. 7 days at 100 then 3 at 200 gives two stretches.
 */
export function priceStretches(
  mainPrice: number | null | undefined,
  periods: SeasonalPrice[] | null | undefined,
  startDate: string,
  endDate: string,
): PriceStretch[] {
  if (!mainPrice || !startDate || !endDate || endDate < startDate) return [];
  const stretches: PriceStretch[] = [];
  const cursor = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  while (cursor <= end) {
    const monthDay = formatIsoDate(cursor).slice(5);
    const price = periods?.find(period => periodCovers(period, monthDay))?.pricePerDay ?? mainPrice;
    const last = stretches[stretches.length - 1];
    if (last?.pricePerDay === price) {
      last.days++;
    } else {
      stretches.push({ days: 1, pricePerDay: price });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return stretches;
}

export function stretchesTotal(stretches: PriceStretch[]): number {
  return stretches.reduce((sum, stretch) => sum + stretch.days * stretch.pricePerDay, 0);
}
