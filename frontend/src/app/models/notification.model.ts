export interface Notification {
  id: number;
  userId: number;
  reservationId: number;
  propertyId: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
