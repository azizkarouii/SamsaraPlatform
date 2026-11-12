import { Planning, PlanningStay } from '../../models/reservation.model';
import { formatIsoDate, parseIsoDate } from '../../shared/calendar-utils';

export type PlanningView = 'month' | 'week' | 'gantt';

/** A house of the planning, with the color that marks its stays everywhere on the page. */
export interface PlanningHouse {
  id: number;
  title: string;
  color: string;
}

/** Colors of the houses, in the order of the list (light enough for a tinted chip, dark enough for text). */
const HOUSE_COLORS = ['#B7791F', '#2563EB', '#15803D', '#7C3AED', '#DB2777', '#0891B2', '#EA580C', '#4D7C0F', '#9333EA', '#0F766E'];

export function colorHouses(planning: Planning): PlanningHouse[] {
  return planning.houses.map((house, index) => ({ ...house, color: HOUSE_COLORS[index % HOUSE_COLORS.length] }));
}

export function addDays(iso: string, days: number): string {
  const date = parseIsoDate(iso);
  date.setDate(date.getDate() + days);
  return formatIsoDate(date);
}

/** Monday of the week holding this day. */
export function startOfWeek(iso: string): string {
  const date = parseIsoDate(iso);
  return addDays(iso, -((date.getDay() + 6) % 7));
}

/** 0 for Monday … 6 for Sunday. */
export function weekdayIndex(iso: string): number {
  return (parseIsoDate(iso).getDay() + 6) % 7;
}

export function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

export function covers(stay: PlanningStay, day: string): boolean {
  return stay.startDate <= day && day <= stay.endDate;
}

/** 12/11 style, the year left out. */
export function shortDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

/** Confirmed and running stays hold the dates: shown before the requests still pending. */
const ORDER: Record<string, number> = { 'in-progress': 0, confirmed: 1, completed: 2, pending: 3 };

export function byImportance(a: PlanningStay, b: PlanningStay): number {
  return (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || a.startDate.localeCompare(b.startDate);
}
