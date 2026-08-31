import { Property } from './property.model';

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
  createdAt: string;
  updatedAt: string;
  property?: Property;
}

export function normalizeReservationStatus(status?: string | null): string {
  const normalized = (status ?? '').trim().toLowerCase();
  if (normalized === 'in_progress' || normalized === 'in progress' || normalized === 'in-progress') {
    return 'in-progress';
  }
  return normalized;
}

export function isActiveReservationStatus(status?: string | null): boolean {
  const normalized = normalizeReservationStatus(status);
  return normalized === 'confirmed' || normalized === 'in-progress';
}
