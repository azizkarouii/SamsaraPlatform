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
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
  images?: PropertyImage[];
  /** Storage key of the cover photo, if the property has photos. */
  coverImage?: string;
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

/** A photo of a property; the file is served at imageUrl(imagePath). Position 0 is the cover. */
export interface PropertyImage {
  id: number;
  propertyId: number;
  imagePath: string;
  isMain: boolean;
  position: number;
  contentType?: string;
  sizeBytes?: number;
}
