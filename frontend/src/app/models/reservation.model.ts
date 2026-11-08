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
  /** Nightly price agreed with the client below the house rates; it carries no samsar margin. */
  negotiatedPricePerDay?: number | null;
  /** Planned end, kept when the stay stopped early. */
  originalEndDate?: string | null;
  /** Money the owner gave back to the client; hidden from other samsars of the house. */
  refundAmount?: number | null;
  /** Money the booking samsar gave back to the client; hidden from other samsars of the house. */
  samsarRefundAmount?: number | null;
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

/** What a booking brings to the user asking, computed by the server. */
export interface ReservationEarning {
  reservationId: number;
  earned: number;
  upcoming: number;
}

export interface ReservationPayment {
  id: number;
  reservationId: number;
  amount: number;
  paidOn: string;
  /** "advance" follows the advance of the booking; "payment" is money received afterwards. */
  kind: 'advance' | 'payment' | 'balance';
  note?: string | null;
  recordedBy?: number | null;
  createdAt: string;
}

/** One thing done on a booking, with who did it (actorName is null when the application acted on its own). */
export interface ReservationEvent {
  id: number;
  action: string;
  actorName?: string | null;
  details?: string | null;
  createdAt: string;
}

/** Figures of the dashboard and the profile, computed by the server from the payments received. */
export interface DashboardSummary {
  earned: number;
  upcoming: number;
  toCollect: number;
  reservationCount: number;
  counts: Record<string, number>;
  months: { key: string; amount: number; count: number }[];
  byProperty: { title: string; amount: number }[];
  arrivals: Reservation[];
  rentals: RentalEarning[];
  propertyCount: number;
}

export interface RentalEarning {
  id: number;
  propertyTitle: string;
  clientName: string;
  startDate: string;
  endDate: string;
  status: string;
  total: number;
  paid: number;
  earned: number;
  upcoming: number;
}

/** What the samsar has received of his gain: the part of the payments beyond the advance, up to his gain. */
export function samsarReceived(reservation: Reservation, paid: number): number {
  return Math.min(reservation.samsarGain || 0, Math.max(0, paid - (reservation.advanceAmount || 0)));
}

export function ownerReceived(reservation: Reservation, paid: number): number {
  return Math.max(0, paid - samsarReceived(reservation, paid));
}

export interface ReservationPage {
  content: Reservation[];
  totalElements: number;
  counts: Record<string, number>;
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

export function isStayStarted(reservation: Reservation): boolean {
  return ['in-progress', 'completed'].includes(normalizeReservationStatus(reservation.status));
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
