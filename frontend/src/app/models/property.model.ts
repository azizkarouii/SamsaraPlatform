export interface Property {
  id: number;
  title: string;
  configuration?: string;
  hautStanding: boolean;
  appartientResidence: boolean;
  pricePerDay?: number;
  pricePerWeek?: number;
  pricePerMonth?: number;
  distanceBeach?: number;
  maxCapacity?: number;
  address?: string;
  ownerContact?: string;
  airCondition: boolean;
  wifi: boolean;
  garage: boolean;
  pool: boolean;
  kitchen: boolean;
  seaView: boolean;
  terrace: boolean;
  bathrooms?: number;
  photos?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  images?: PropertyImage[];
}

export interface CreatePropertyDto {
  title: string;
  configuration?: string;
  hautStanding?: boolean;
  appartientResidence?: boolean;
  pricePerDay?: number;
  pricePerWeek?: number;
  pricePerMonth?: number;
  distanceBeach?: number;
  maxCapacity?: number;
  address?: string;
  ownerContact?: string;
  airCondition?: boolean;
  wifi?: boolean;
  garage?: boolean;
  pool?: boolean;
  kitchen?: boolean;
  seaView?: boolean;
  terrace?: boolean;
  bathrooms?: number;
  description?: string;
}

export interface PropertyImage {
  id: number;
  propertyId: number;
  imagePath: string;
  isMain: boolean;
  position: number;
}
