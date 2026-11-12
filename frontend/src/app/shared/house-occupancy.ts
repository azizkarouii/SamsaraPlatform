import { Planning, PlanningStay } from '../models/reservation.model';
import { formatIsoDate, parseIsoDate, todayIso } from './calendar-utils';

/** One day of a house: what holds it. */
export interface OccupancyDay {
  iso: string;
  day: number;
  state: 'free' | 'blocked' | 'pending' | 'confirmed' | 'in-progress' | 'completed';
  client?: string;
  today: boolean;
  weekend: boolean;
}

/** Where a house stands today: who is in it, or when the next guest comes. */
export interface HouseToday {
  occupied: boolean;
  client?: string;
  until?: string;
  nextArrival?: string;
  nextClient?: string;
}

/** Days ahead shown on the house cards. */
export const STRIP_DAYS = 14;

const HOLDING = ['in-progress', 'confirmed', 'completed'];

export function stripRange(): { from: string; to: string } {
  const from = todayIso();
  const to = parseIsoDate(from);
  to.setDate(to.getDate() + STRIP_DAYS - 1);
  return { from, to: formatIsoDate(to) };
}

/** The next days of one house, a booking winning over a pending request on the same day. */
export function occupancyOf(planning: Planning, propertyId: number, from = todayIso(), count = STRIP_DAYS): OccupancyDay[] {
  const stays = planning.stays.filter(s => s.propertyId === propertyId);
  const blocked = new Set(planning.blocked.filter(b => b.propertyId === propertyId).map(b => b.date));
  const today = todayIso();
  return Array.from({ length: count }, (_, i) => {
    const date = parseIsoDate(from);
    date.setDate(date.getDate() + i);
    const iso = formatIsoDate(date);
    const covering = stays.filter(s => s.startDate <= iso && iso <= s.endDate);
    const holding = covering.find(s => HOLDING.includes(s.status));
    const stay: PlanningStay | undefined = holding ?? covering.find(s => s.status === 'pending');
    const weekday = (date.getDay() + 6) % 7;
    return {
      iso, day: date.getDate(), today: iso === today, weekend: weekday >= 5, client: stay?.clientName,
      state: stay ? (stay.status as OccupancyDay['state']) : blocked.has(iso) ? 'blocked' : 'free',
    };
  });
}

export function houseToday(planning: Planning, propertyId: number): HouseToday {
  const today = todayIso();
  const stays = planning.stays.filter(s => s.propertyId === propertyId && HOLDING.includes(s.status));
  const current = stays.find(s => s.startDate <= today && today <= s.endDate);
  if (current) return { occupied: true, client: current.clientName, until: current.endDate };
  const next = stays.filter(s => s.startDate > today).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  return { occupied: false, nextArrival: next?.startDate, nextClient: next?.clientName };
}

/** Share of the days booked (pending requests left out), in %. */
export function occupancyRate(days: OccupancyDay[]): number {
  return days.length ? Math.round(days.filter(d => HOLDING.includes(d.state)).length * 100 / days.length) : 0;
}
