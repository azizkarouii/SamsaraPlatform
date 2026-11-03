import { Property } from './property.model';
import { User } from './auth.model';

export interface PropertySamsar {
  propertyId: number;
  samsarId: number;
  priceIncreaseTnd?: number;
  /** Set for a percentage deal (priceIncreaseTnd is then 0). */
  commissionPercent?: number;
  property?: Property;
  samsar?: User;
}

export interface PropertySamsarInviteDto {
  propertyId?: number;
  email: string;
  phone: string;
  priceIncreaseTnd?: number | null;
  commissionPercent?: number | null;
}
