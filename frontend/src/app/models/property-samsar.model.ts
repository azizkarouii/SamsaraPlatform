import { Property } from './property.model';

export interface PropertySamsar {
  propertyId: number;
  samsarId: number;
  priceIncreaseTnd?: number;
  property?: Property;
}

export interface PropertySamsarInviteDto {
  propertyId: number;
  email: string;
  phone: string;
  priceIncreaseTnd?: number;
}
