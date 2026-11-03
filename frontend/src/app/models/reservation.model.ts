import { Property } from './property.model';
import { User } from './auth.model';

export interface Reservation {
  id: number;
  propertyId: number;
  samsarId: number;
  startDate: string;
  endDate: string;
  checkInTime: string;
  checkOutTime: string;
  status: string;
  clientName: string;
  clientPhone?: string;
  advanceAmount: number;
  totalAmount: number;
  notes?: string;
  /** Price of the stay at the house rates when booked; hidden from other samsars of the house. */
  baseAmount?: number | null;
  /** Deal frozen when the samsar booked; hidden from other samsars of the house. */
  samsarMarginTnd?: number | null;
  samsarCommissionPercent?: number | null;
  /** What the samsar earns on this booking; hidden from other samsars of the house. */
  samsarGain?: number | null;
  createdAt: string;
  updatedAt: string;
  property?: Property;
  samsar?: User;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';

export const RESERVATION_STATUSES: ReservationStatus[] = ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'];

/** Statuses that generate revenue (the spec counts reserved, active and completed stays). */
export const REVENUE_STATUSES: ReservationStatus[] = ['confirmed', 'in-progress', 'completed'];

/** Allowed manual transitions, mirrored from the backend workflow. */
export const STATUS_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  'pending': ['confirmed', 'cancelled'],
  'confirmed': ['in-progress', 'cancelled'],
  'in-progress': ['completed', 'cancelled'],
  'completed': [],
  'cancelled': [],
};

export function normalizeReservationStatus(status?: string | null): string {
  const normalized = (status ?? '').trim().toLowerCase();
  if (normalized === 'in_progress' || normalized === 'in progress' || normalized === 'in-progress' || normalized === 'active') {
    return 'in-progress';
  }
  if (normalized === 'reserved') {
    return 'confirmed';
  }
  return normalized;
}

export function isActiveReservationStatus(status?: string | null): boolean {
  const normalized = normalizeReservationStatus(status);
  return normalized === 'confirmed' || normalized === 'in-progress';
}

export function isRevenueStatus(status?: string | null): boolean {
  return (REVENUE_STATUSES as string[]).includes(normalizeReservationStatus(status));
}

/** The owner's part of a booking: the total minus what the samsar earns. */
export function ownerShareOf(reservation: Reservation): number {
  return (reservation.totalAmount || 0) - (reservation.samsarGain || 0);
}

/** Translation key of a status label, e.g. "status_in_progress". */
export function statusKey(status?: string | null): string {
  return 'status_' + normalizeReservationStatus(status).replace('-', '_');
}

/** Number of billed days: the spec counts the last day ("inclut le dernier jour"). */
export function countReservationDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const diff = Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / 86400000);
  return diff >= 0 ? diff + 1 : 0;
}
