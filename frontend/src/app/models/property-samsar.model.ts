import { Property } from './property.model';
import { User } from './auth.model';

export interface PropertySamsar {
  propertyId: number;
  samsarId: number;
  priceIncreaseTnd?: number;
  property?: Property;
  samsar?: User;
}

export interface PropertySamsarInviteDto {
  propertyId: number;
  email: string;
  phone: string;
  priceIncreaseTnd?: number;
}
