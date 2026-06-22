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
